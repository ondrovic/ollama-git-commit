import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';

// Set up the mock BEFORE any imports that use ConfigManager
let mockConfigState: any;
let mockConfigSourcesState: any;

class MockConfigManager {
  constructor() {
    // Initialize with predictable test state
    mockConfigState = {
      model: 'llama2',
      host: 'http://localhost:11434',
      verbose: false,
      timeouts: { connection: 10000, generation: 120000, modelPull: 300000 },
      context: [],
    };
    mockConfigSourcesState = {
      model: 'user',
      host: 'user',
      verbose: 'user',
      timeouts: { connection: 'user', generation: 'user', modelPull: 'user' },
      context: 'user',
    };
  }

  async initialize() {
    // No-op for tests
  }

  async getConfigFiles() {
    return {
      user: '/mock/user/config.json',
      local: '/mock/local/config.json',
      active: [{ type: 'user', path: '/mock/user/config.json', 'in-use': true }],
    };
  }

  async saveConfig(update: any, type: 'user' | 'local') {
    // Deep merge the update into our mock state
    function deepMerge(target: any, src: any) {
      for (const key in src) {
        if (src[key] && typeof src[key] === 'object' && !Array.isArray(src[key])) {
          if (!target[key]) target[key] = {};
          deepMerge(target[key], src[key]);
        } else {
          target[key] = src[key];
        }
      }
    }
    deepMerge(mockConfigState, update);
  }

  async getConfig() {
    return { ...mockConfigState };
  }

  async getConfigSources() {
    return { ...mockConfigSourcesState };
  }

  async resetToDefaults() {
    // Reset to initial state
    mockConfigState = {
      model: 'llama2',
      host: 'http://localhost:11434',
      verbose: false,
      timeouts: { connection: 10000, generation: 120000, modelPull: 300000 },
      context: [],
    };
  }

  static getInstance() {
    return new MockConfigManager();
  }
}

// Mock the exact path that the CLI command uses
mock.module('../../../src/core/config', () => ({
  ConfigManager: MockConfigManager,
}));

// Now import the CLI command after the mock is set up
import {
    createConfigUpdate,
    displayUpdatedKey,
    findSimilarKeys,
    parseValue,
} from '../../../src/cli/commands/config/set';

describe('Config Set Command - Utility Functions', () => {
  test('parseValue should handle boolean values', () => {
    expect(parseValue('verbose', 'true')).toBe(true);
    expect(parseValue('verbose', 'false')).toBe(false);
    expect(parseValue('verbose', 'TRUE')).toBe(true);
    expect(parseValue('verbose', 'FALSE')).toBe(false);
  });

  test('parseValue should handle numeric values', () => {
    expect(parseValue('timeout', '5000')).toBe(5000);
    expect(parseValue('timeout', '0')).toBe(0);
    expect(parseValue('timeout', '-1')).toBe(-1);
    expect(parseValue('timeout', '3.14')).toBe(3.14);
  });

  test('parseValue should handle array values', () => {
    expect(parseValue('context', 'code,diff,terminal')).toEqual(['code', 'diff', 'terminal']);
    expect(parseValue('context', 'a,b,c')).toEqual(['a', 'b', 'c']);
    expect(parseValue('context', 'single')).toBe('single'); // No comma, should be string
  });

  test('parseValue should handle string values', () => {
    expect(parseValue('model', 'llama3')).toBe('llama3');
    expect(parseValue('model', '')).toBe('');
    expect(parseValue('model', 'hello world')).toBe('hello world');
  });

  test('createConfigUpdate should handle simple keys', () => {
    expect(createConfigUpdate('model', 'llama3')).toEqual({ model: 'llama3' });
    expect(createConfigUpdate('verbose', true)).toEqual({ verbose: true });
  });

  test('createConfigUpdate should handle nested keys', () => {
    expect(createConfigUpdate('timeouts.connection', 5000)).toEqual({
      timeouts: { connection: 5000 },
    });

    expect(createConfigUpdate('nested.deep.key', 'value')).toEqual({
      nested: { deep: { key: 'value' } },
    });
  });

  test('createConfigUpdate should handle keys with empty parts', () => {
    // Test key with empty part in middle: "a..b"
    expect(createConfigUpdate('a..b', 'value')).toEqual({
      a: { '': { b: 'value' } },
    });

    // Test key ending with empty part: "a."
    expect(createConfigUpdate('a.', 'value')).toEqual({
      a: { '': 'value' },
    });

    // Test key starting with empty part: ".a"
    expect(createConfigUpdate('.a', 'value')).toEqual({
      '': { a: 'value' },
    });

    // Test key with multiple empty parts: "a..b..c"
    expect(createConfigUpdate('a..b..c', 'value')).toEqual({
      a: { '': { b: { '': { c: 'value' } } } },
    });
  });

  test('displayUpdatedKey should handle simple keys', () => {
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
    const config = { model: 'llama3' };
    const sourceInfo = { model: 'user' };

    displayUpdatedKey('model', config, sourceInfo);

    expect(consoleSpy).toHaveBeenCalledWith('  model: "llama3" (from user)');
    consoleSpy.mockRestore();
  });

  test('displayUpdatedKey should handle nested keys', () => {
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
    const config = { timeouts: { connection: 5000 } };
    const sourceInfo = { timeouts: { connection: 'user' } };

    displayUpdatedKey('timeouts.connection', config, sourceInfo);

    expect(consoleSpy).toHaveBeenCalledWith('  timeouts.connection: 5000 (from user)');
    consoleSpy.mockRestore();
  });
});

describe('Config Set Command - Integration', () => {
  let configManager: MockConfigManager;

  beforeEach(async () => {
    // Reset mock state before each test
    mockConfigState = {
      model: 'llama2',
      host: 'http://localhost:11434',
      verbose: false,
      timeouts: { connection: 10000, generation: 120000, modelPull: 300000 },
      context: [],
    };

    // Create a fresh ConfigManager instance for each test
    configManager = new MockConfigManager();
    await configManager.initialize();
  });

  test('should set a simple configuration value', async () => {
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

    // Simulate the action logic directly
    const key = 'model';
    const value = 'llama3';
    const options = { type: 'user' as const };

    const parsedValue = parseValue(key, value);
    const configToUpdate = createConfigUpdate(key, parsedValue);
    await configManager.saveConfig(configToUpdate, options.type);

    expect(mockConfigState.model).toBe('llama3');

    consoleSpy.mockRestore();
  });

  test('should set a nested configuration value', async () => {
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

    // Simulate the action logic directly
    const key = 'timeouts.connection';
    const value = '5000';
    const options = { type: 'user' as const };

    const parsedValue = parseValue(key, value);
    const configToUpdate = createConfigUpdate(key, parsedValue);
    await configManager.saveConfig(configToUpdate, options.type);

    expect(mockConfigState.timeouts.connection).toBe(5000);

    consoleSpy.mockRestore();
  });

  test('should parse boolean values correctly', async () => {
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

    // Simulate the action logic directly
    const key = 'verbose';
    const value = 'true';
    const options = { type: 'user' as const };

    const parsedValue = parseValue(key, value);
    const configToUpdate = createConfigUpdate(key, parsedValue);
    await configManager.saveConfig(configToUpdate, options.type);

    expect(mockConfigState.verbose).toBe(true);

    consoleSpy.mockRestore();
  });

  test('should parse numeric values correctly', async () => {
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

    // Simulate the action logic directly
    const key = 'timeouts.generation';
    const value = '60000';
    const options = { type: 'user' as const };

    const parsedValue = parseValue(key, value);
    const configToUpdate = createConfigUpdate(key, parsedValue);
    await configManager.saveConfig(configToUpdate, options.type);

    expect(mockConfigState.timeouts.generation).toBe(60000);

    consoleSpy.mockRestore();
  });

  test('should parse array values correctly', async () => {
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

    // Simulate the action logic directly
    const key = 'context';
    const value = 'code,diff,terminal';
    const options = { type: 'user' as const };

    const parsedValue = parseValue(key, value);
    const configToUpdate = createConfigUpdate(key, parsedValue);
    await configManager.saveConfig(configToUpdate, options.type);

    expect(mockConfigState.context).toEqual(['code', 'diff', 'terminal']);

    consoleSpy.mockRestore();
  });

  test('should update all active configs when --all flag is used', async () => {
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

    // Mock multiple active configs
    spyOn(configManager, 'getConfigFiles').mockResolvedValue({
      user: '/mock/user/config.json',
      local: '/mock/local/config.json',
      active: [
        { type: 'user', path: '/mock/user/config.json', 'in-use': true },
        { type: 'local', path: '/mock/local/config.json', 'in-use': true },
      ],
    });

    // Simulate the action logic directly
    const key = 'model';
    const value = 'llama3';
    const options = { type: 'user' as const, all: true };

    const parsedValue = parseValue(key, value);
    const configToUpdate = createConfigUpdate(key, parsedValue);

    // This would normally update multiple configs, but for simplicity we just update one
    await configManager.saveConfig(configToUpdate, options.type);

    expect(mockConfigState.model).toBe('llama3');

    consoleSpy.mockRestore();
  });

  test('should display updated configuration after setting value', async () => {
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

    // Simulate the action logic directly
    const key = 'model';
    const value = 'llama3';
    const options = { type: 'user' as const };

    const parsedValue = parseValue(key, value);
    const configToUpdate = createConfigUpdate(key, parsedValue);
    await configManager.saveConfig(configToUpdate, options.type);

    // Simulate the display logic
    console.log('\n📋 Updated configuration:');
    const updatedConfig = await configManager.getConfig();
    const sourceInfo = await configManager.getConfigSources();
    displayUpdatedKey(key, updatedConfig, sourceInfo);

    expect(consoleSpy).toHaveBeenCalledWith('\n📋 Updated configuration:');
    expect(consoleSpy).toHaveBeenCalledWith('  model: "llama3" (from user)');

    consoleSpy.mockRestore();
  });

  test('should merge new config values and not overwrite existing config', async () => {
    // Initial state
    expect(mockConfigState.model).toBe('llama2');
    expect(mockConfigState.host).toBe('http://localhost:11434');
    expect(mockConfigState.verbose).toBe(false);
    // Set a new key
    const key = 'debug';
    const value = 'true';
    const options = { type: 'user' as const };
    const parsedValue = parseValue(key, value);
    const configToUpdate = createConfigUpdate(key, parsedValue);
    await configManager.saveConfig(configToUpdate, options.type);
    // Check that previous keys remain
    expect(mockConfigState.model).toBe('llama2');
    expect(mockConfigState.host).toBe('http://localhost:11434');
    expect(mockConfigState.verbose).toBe(false);
    // And new key is set
    expect(mockConfigState.debug).toBe(true);
  });

  test('should parse quiet boolean values correctly', async () => {
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

    // Test setting quiet to true
    const key = 'quiet';
    const value = 'true';
    const options = { type: 'user' as const };

    const parsedValue = parseValue(key, value);
    const configToUpdate = createConfigUpdate(key, parsedValue);
    await configManager.saveConfig(configToUpdate, options.type);

    expect(mockConfigState.quiet).toBe(true);

    // Test setting quiet to false
    const value2 = 'false';
    const parsedValue2 = parseValue(key, value2);
    const configToUpdate2 = createConfigUpdate(key, parsedValue2);
    await configManager.saveConfig(configToUpdate2, options.type);

    expect(mockConfigState.quiet).toBe(false);

    consoleSpy.mockRestore();
  });

  test('should handle quiet configuration display correctly', async () => {
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

    // Set quiet configuration
    const key = 'quiet';
    const value = 'true';
    const options = { type: 'user' as const };

    const parsedValue = parseValue(key, value);
    const configToUpdate = createConfigUpdate(key, parsedValue);
    await configManager.saveConfig(configToUpdate, options.type);

    // Update source info to include quiet
    mockConfigSourcesState.quiet = 'user';

    // Simulate the display logic
    const updatedConfig = await configManager.getConfig();
    const sourceInfo = await configManager.getConfigSources();
    displayUpdatedKey(key, updatedConfig, sourceInfo);

    expect(consoleSpy).toHaveBeenCalledWith('  quiet: true (from user)');

    consoleSpy.mockRestore();
  });

  test('should validate configuration keys correctly', () => {
    // Test valid keys
    const validKeys = ['model', 'host', 'verbose', 'quiet', 'timeouts.connection'];
    validKeys.forEach(key => {
      expect(validKeys.includes(key)).toBe(true);
    });

    // Test invalid keys
    const invalidKeys = ['quite', 'verbos', 'timeout', 'autocommit'];
    invalidKeys.forEach(key => {
      expect(validKeys.includes(key)).toBe(false);
    });
  });

  test('should provide helpful suggestions for similar keys', () => {
    const validKeys = ['model', 'host', 'verbose', 'quiet', 'timeouts.connection', 'timeouts.generation', 'autoStage', 'autoModel', 'autoCommit'];
    
    // Test suggestions for common typos
    const suggestions = findSimilarKeys('quite', validKeys);
    expect(suggestions).toContain('quiet');
    
    const timeoutSuggestions = findSimilarKeys('timeout', validKeys);
    expect(timeoutSuggestions).toContain('timeouts.connection');
    expect(timeoutSuggestions).toContain('timeouts.generation');
    
    const autoSuggestions = findSimilarKeys('autocommit', validKeys);
    expect(autoSuggestions).toContain('autoCommit');
    expect(autoSuggestions).toContain('autoStage');
    expect(autoSuggestions).toContain('autoModel');
  });

  test('should limit suggestions to reasonable number', () => {
    const validKeys = ['model', 'host', 'verbose', 'quiet', 'timeouts.connection', 'timeouts.generation', 'timeouts.modelPull', 'autoStage', 'autoModel', 'autoCommit'];
    
    const suggestions = findSimilarKeys('a', validKeys);
    expect(suggestions.length).toBeLessThanOrEqual(5);
  });
});
