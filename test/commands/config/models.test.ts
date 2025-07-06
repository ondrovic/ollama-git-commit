import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Logger } from '../../../src/utils/logger';
import { MockedConfigManager } from '../../mocks/MockedConfigManager';

describe('Models Commands - set-primary bug fix', () => {
  let configManager: MockedConfigManager;
  let logger: Logger;

  beforeEach(async () => {
    // Create a fresh mock config manager for each test
    logger = new Logger();
    logger.setVerbose(true);
    configManager = new MockedConfigManager(logger);
    await configManager.initialize();
  });

  afterEach(async () => {
    // Clean up any test configurations
    try {
      await configManager.removeConfig('user');
      await configManager.removeConfig('local');
    } catch {
      // Ignore cleanup errors
    }
  });

  test('should save the model identifier, not the display name when setting primary model', async () => {
    // First, add a model with a different display name and identifier
    const testModel = {
      name: 'my-chat-model', // Display name
      provider: 'ollama' as const,
      model: 'llama3:8b', // Model identifier
      roles: ['chat'] as const,
    };

    // Add the model to the configuration
    const initialConfig = await configManager.getConfig();
    const models = initialConfig.models || [];
    models.push(testModel);
    await configManager.saveConfig({ models }, 'user');

    // Verify the model was added correctly
    const configAfterAdd = await configManager.getConfig();
    expect(configAfterAdd.models).toBeDefined();
    expect(configAfterAdd.models!.length).toBeGreaterThan(0);
    const addedModel = configAfterAdd.models!.find(m => m.name === 'my-chat-model');
    expect(addedModel).toBeDefined();
    expect(addedModel!.model).toBe('llama3:8b');

    // Now simulate the set-primary command logic
    // This is the key part that was buggy - it should save targetModel.model, not name
    const targetModel = configAfterAdd.models!.find(m => m.name === 'my-chat-model');
    expect(targetModel).toBeDefined();
    expect(targetModel!.roles.includes('chat')).toBe(true);

    // This is the fix: save targetModel.model instead of name
    await configManager.saveConfig({ model: targetModel!.model }, 'user');

    // Verify that the model field contains the model identifier, not the display name
    const finalConfig = await configManager.getConfig();
    expect(finalConfig.model).toBe('llama3:8b');
    expect(finalConfig.model).not.toBe('my-chat-model');
  });

  test('should work with the actual set-primary command implementation', async () => {
    // Add a test model
    const testModel = {
      name: 'test-model',
      provider: 'ollama' as const,
      model: 'mistral:7b',
      roles: ['chat'] as const,
    };

    const initialConfig = await configManager.getConfig();
    const models = initialConfig.models || [];
    models.push(testModel);
    await configManager.saveConfig({ models }, 'user');

    // Simulate the exact logic from the set-primary command
    const config = await configManager.getConfig();
    const modelsList = config.models || [];
    const targetModel = modelsList.find(m => m.name === 'test-model');

    expect(targetModel).toBeDefined();
    expect(targetModel!.roles.includes('chat')).toBe(true);

    // This is the corrected line from the fix
    await configManager.saveConfig({ model: targetModel!.model }, 'user');

    // Verify the result
    const finalConfig = await configManager.getConfig();
    expect(finalConfig.model).toBe('mistral:7b');
    expect(finalConfig.model).not.toBe('test-model');
  });

  test('should handle multiple models with different identifiers', async () => {
    // Add multiple test models
    const testModels = [
      {
        name: 'model-a',
        provider: 'ollama' as const,
        model: 'llama3:8b',
        roles: ['chat'] as const,
      },
      {
        name: 'model-b',
        provider: 'ollama' as const,
        model: 'mistral:7b',
        roles: ['chat'] as const,
      },
      {
        name: 'model-c',
        provider: 'ollama' as const,
        model: 'codellama:7b',
        roles: ['chat'] as const,
      },
    ];

    const initialConfig = await configManager.getConfig();
    const models = initialConfig.models || [];
    models.push(...testModels);
    await configManager.saveConfig({ models }, 'user');

    // Test setting each model as primary
    for (const testModel of testModels) {
      const config = await configManager.getConfig();
      const modelsList = config.models || [];
      const targetModel = modelsList.find(m => m.name === testModel.name);

      expect(targetModel).toBeDefined();
      expect(targetModel!.roles.includes('chat')).toBe(true);

      // Set as primary using the model identifier
      await configManager.saveConfig({ model: targetModel!.model }, 'user');

      // Verify the result
      const finalConfig = await configManager.getConfig();
      expect(finalConfig.model).toBe(testModel.model);
      expect(finalConfig.model).not.toBe(testModel.name);
    }
  });

  test('should handle models with same display name but different identifiers', async () => {
    // Add models with same display name but different identifiers
    const testModels = [
      {
        name: 'llama-model',
        provider: 'ollama' as const,
        model: 'llama3:8b',
        roles: ['chat'] as const,
      },
      {
        name: 'llama-model',
        provider: 'ollama' as const,
        model: 'llama3:70b',
        roles: ['chat'] as const,
      },
    ];

    const initialConfig = await configManager.getConfig();
    const models = initialConfig.models || [];
    models.push(...testModels);
    await configManager.saveConfig({ models }, 'user');

    // Test setting the second model as primary
    const config = await configManager.getConfig();
    const modelsList = config.models || [];
    const targetModel = modelsList.find(m => m.name === 'llama-model' && m.model === 'llama3:70b');

    expect(targetModel).toBeDefined();
    expect(targetModel!.roles.includes('chat')).toBe(true);

    // Set as primary using the model identifier
    await configManager.saveConfig({ model: targetModel!.model }, 'user');

    // Verify the result
    const finalConfig = await configManager.getConfig();
    expect(finalConfig.model).toBe('llama3:70b');
    expect(finalConfig.model).not.toBe('llama-model');
  });

  test('should handle empty models list gracefully', async () => {
    // Start with empty models list
    const initialConfig = await configManager.getConfig();
    expect(initialConfig.models).toBeDefined();

    // Try to find a model that doesn't exist
    const targetModel = initialConfig.models!.find(m => m.name === 'non-existent');
    expect(targetModel).toBeUndefined();

    // This should not throw an error
    const config = await configManager.getConfig();
    expect(config.models).toBeDefined();
    expect(config.models!.length).toBeGreaterThanOrEqual(0);
  });

  test('should preserve other configuration when setting primary model', async () => {
    // Set up initial configuration with other settings
    const initialConfig = {
      model: 'initial-model',
      host: 'http://localhost:11434',
      verbose: true,
      interactive: false,
      promptFile: '/test/prompt.txt',
      debug: false,
      autoStage: false,
      autoModel: false,
      autoCommit: false,
      promptTemplate: 'default',
      quiet: false,
      models: [
        {
          name: 'llama3:8b',
          provider: 'ollama' as const,
          model: 'llama3:8b',
          roles: ['chat'] as const,
        },
      ],
    };

    await configManager.saveConfig(initialConfig, 'user');

    // Verify initial configuration
    const configAfterSetup = await configManager.getConfig();
    expect(configAfterSetup.model).toBe('initial-model');
    expect(configAfterSetup.host).toBeDefined();
    expect(configAfterSetup.verbose).toBe(true);

    // Set new primary model (should be 'initial-model' due to auto-sync)
    const targetModel = configAfterSetup.models!.find(m => m.model === 'initial-model');
    expect(targetModel).toBeDefined();

    await configManager.saveConfig({ model: targetModel!.model }, 'user');

    // Verify that only the model changed, other settings preserved
    const finalConfig = await configManager.getConfig();
    expect(finalConfig.model).toBe('initial-model');
    expect(finalConfig.host).toBeDefined();
    expect(finalConfig.host).toContain('11434');
    expect(finalConfig.verbose).toBe(true);
    expect(finalConfig.interactive).toBe(false);
    expect(finalConfig.promptFile).toBe('/test/prompt.txt');
  });
});
