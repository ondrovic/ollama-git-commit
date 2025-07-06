import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';

// Save ALL global state at the top to ensure we can always restore it
const realFetch = global.fetch;
const realConsole = global.console;
const realProcess = global.process;

import { ModelsCommand } from '../../src/commands/models';
import * as configModule from '../../src/core/config';
import { ILogger, IOllamaService } from '../../src/core/interfaces';

describe('ModelsCommand', () => {
  let modelsCommand: ModelsCommand;
  let mockLogger: ILogger;
  let mockOllamaService: IOllamaService;
  let mockGetConfig: any;
  let originalGetConfig: any;

  beforeEach(() => {
    // Restore ALL global state to ensure clean environment
    global.fetch = realFetch;
    global.console = realConsole;
    global.process = realProcess;

    // Save the original getConfig function
    originalGetConfig = configModule.getConfig;

    // Mock getConfig function using spyOn
    mockGetConfig = mock(() => Promise.resolve({
      model: 'llama3:8b',
      host: 'http://localhost:11434',
      timeouts: { connection: 1000, generation: 2000, modelPull: 3000 },
    }));
    
    // Use spyOn to replace the getConfig function
    spyOn(configModule, 'getConfig').mockImplementation(mockGetConfig);

    // Create mock logger
    mockLogger = {
      info: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
      warn: mock(() => {}),
      success: mock(() => {}),
      package: mock(() => {}),
      table: mock(() => {}),
      rocket: mock(() => {}),
      magnifier: mock(() => {}),
      spinner: mock(() => {}),
    };

    // Create mock Ollama service
    mockOllamaService = {
      generateCommitMessage: mock(() => Promise.resolve('test message')),
      testConnection: mock(() => Promise.resolve(true)),
      listModels: mock(() => Promise.resolve([])),
    };

    // Create ModelsCommand instance
    modelsCommand = new ModelsCommand(mockOllamaService, mockLogger);
  });

  afterEach(() => {
    // Restore ALL global state
    global.fetch = realFetch;
    global.console = realConsole;
    global.process = realProcess;
    
    // Restore original getConfig function
    if (originalGetConfig) {
      spyOn(configModule, 'getConfig').mockImplementation(originalGetConfig);
    }
    
    // Reset all logger mocks
    Object.values(mockLogger).forEach(fn => {
      if (fn && typeof fn === 'function' && 'mock' in fn) {
        (fn as any).mock?.reset?.();
      }
    });
    
    // Reset Ollama service mocks
    Object.values(mockOllamaService).forEach(fn => {
      if (fn && typeof fn === 'function' && 'mock' in fn) {
        (fn as any).mock?.reset?.();
      }
    });
  });

  describe('getDefaultModel', () => {
    test('should return exact match from preferred models', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'llama3:8b' },
            { name: 'mistral:7b' },
            { name: 'codellama:7b' },
          ],
        }),
      }));

      const result = await modelsCommand.getDefaultModel('http://localhost:11434', true);

      expect(result).toBe('llama3:8b');
      expect(mockLogger.debug).toHaveBeenCalledWith('Available models: llama3:8b, mistral:7b, codellama:7b');
      expect(mockLogger.info).toHaveBeenCalledWith('Auto-selected model (exact match): llama3:8b');
    });

    test('should return partial match from preferred models', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'llama3.2:1b' },
            { name: 'mistral:7b-instruct' },
          ],
        }),
      }));

      const result = await modelsCommand.getDefaultModel('http://localhost:11434', true);

      expect(result).toBe('llama3.2:1b');
      expect(mockLogger.info).toHaveBeenCalledWith('Auto-selected model (exact match): llama3.2:1b');
    });

    test('should return first available model when no preferred match', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'unknown-model-1' },
            { name: 'unknown-model-2' },
          ],
        }),
      }));

      const result = await modelsCommand.getDefaultModel('http://localhost:11434', true);

      expect(result).toBe('unknown-model-1');
      expect(mockLogger.info).toHaveBeenCalledWith('Auto-selected model (first available): unknown-model-1');
    });

    test('should return null when no models available', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: [],
        }),
      }));

      const result = await modelsCommand.getDefaultModel('http://localhost:11434', true);

      expect(result).toBeNull();
    });

    test('should handle HTTP error', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      }));

      const result = await modelsCommand.getDefaultModel('http://localhost:11434', true);

      expect(result).toBeNull();
    });

    test('should handle network error with verbose logging', async () => {
      global.fetch = mock(() => Promise.reject(new Error('Network error')));

      const result = await modelsCommand.getDefaultModel('http://localhost:11434', true);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Error getting default model: Network error');
    });

    test('should not log errors when verbose is false', async () => {
      global.fetch = mock(() => Promise.reject(new Error('Network error')));

      const result = await modelsCommand.getDefaultModel('http://localhost:11434', false);

      expect(result).toBeNull();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('handleModelError', () => {
    test('should handle model error and suggest alternatives', async () => {
      // Mock the listModels and getDefaultModel methods
      const mockListModels = mock(() => Promise.resolve());
      const mockGetDefaultModel = mock(() => Promise.resolve('suggested-model'));
      
      (modelsCommand as any).listModels = mockListModels;
      (modelsCommand as any).getDefaultModel = mockGetDefaultModel;

      await modelsCommand.handleModelError('missing-model', 'http://localhost:11434');

      expect(mockLogger.error).toHaveBeenCalledWith("Model 'missing-model' not found on Ollama server");
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('missing-model'));
      expect(mockListModels).toHaveBeenCalledWith('http://localhost:11434', true);
      expect(mockGetDefaultModel).toHaveBeenCalledWith('http://localhost:11434');
      expect(mockLogger.info).toHaveBeenCalledWith('');
      expect(mockLogger.info).toHaveBeenCalledWith('   3. Or let the script auto-select a model:');
      expect(mockLogger.info).toHaveBeenCalledWith('      Suggested: ollama-git-commit --model suggested-model -d /path/to/repo');
      expect(mockLogger.info).toHaveBeenCalledWith('      Or set in config: ollama-git-commit --config-show');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Popular models'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Configuration options'));
    });

    test('should handle model error when no default model available', async () => {
      const mockListModels = mock(() => Promise.resolve());
      const mockGetDefaultModel = mock(() => Promise.resolve(null));
      
      (modelsCommand as any).listModels = mockListModels;
      (modelsCommand as any).getDefaultModel = mockGetDefaultModel;

      await modelsCommand.handleModelError('missing-model', 'http://localhost:11434');

      // When no default model is available, the suggested command line is not logged
      expect(mockLogger.info).not.toHaveBeenCalledWith('      Suggested: ollama-git-commit --model  -d /path/to/repo');
      expect(mockLogger.info).toHaveBeenCalledWith('   3. Or let the script auto-select a model:');
    });
  });

  describe('validateModel', () => {
    test('should return true for valid model', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'llama3:8b' },
            { name: 'mistral:7b' },
          ],
        }),
      }));

      const result = await modelsCommand.validateModel('llama3:8b', 'http://localhost:11434');

      expect(result).toBe(true);
    });

    test('should return false for invalid model', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'llama3:8b' },
            { name: 'mistral:7b' },
          ],
        }),
      }));

      const result = await modelsCommand.validateModel('invalid-model', 'http://localhost:11434');

      expect(result).toBe(false);
    });

    test('should return false for HTTP error', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: false,
      }));

      const result = await modelsCommand.validateModel('llama3:8b', 'http://localhost:11434');

      expect(result).toBe(false);
    });

    test('should return false for network error', async () => {
      global.fetch = mock(() => Promise.reject(new Error('Network error')));

      const result = await modelsCommand.validateModel('llama3:8b', 'http://localhost:11434');

      expect(result).toBe(false);
    });
  });

  describe('getModelInfo', () => {
    test('should return model info for valid model', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: [
            {
              name: 'llama3:8b',
              size: 1000000000,
              details: { family: 'llama' },
            },
          ],
        }),
      }));

      const result = await modelsCommand.getModelInfo('llama3:8b', 'http://localhost:11434');

      expect(result).toEqual({
        name: 'llama3:8b',
        size: 1000000000,
        details: { family: 'llama' },
      });
    });

    test('should return null for invalid model', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: [
            {
              name: 'llama3:8b',
              size: 1000000000,
              details: { family: 'llama' },
            },
          ],
        }),
      }));

      const result = await modelsCommand.getModelInfo('invalid-model', 'http://localhost:11434');

      expect(result).toBeNull();
    });

    test('should return null for HTTP error', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: false,
      }));

      const result = await modelsCommand.getModelInfo('llama3:8b', 'http://localhost:11434');

      expect(result).toBeNull();
    });

    test('should return null for network error', async () => {
      global.fetch = mock(() => Promise.reject(new Error('Network error')));

      const result = await modelsCommand.getModelInfo('llama3:8b', 'http://localhost:11434');

      expect(result).toBeNull();
    });
  });

  describe('suggestModel', () => {
    test('should suggest speed model', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'llama3.2:1b' },
            { name: 'phi3:mini' },
            { name: 'gemma2:2b' },
          ],
        }),
      }));

      const result = await modelsCommand.suggestModel('speed', 'http://localhost:11434');

      expect(result).toBe('llama3.2:1b');
    });

    test('should suggest quality model', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'llama3.2:70b' },
            { name: 'codellama:34b' },
            { name: 'qwen2.5:72b' },
          ],
        }),
      }));

      const result = await modelsCommand.suggestModel('quality', 'http://localhost:11434');

      expect(result).toBe('llama3.2:70b');
    });

    test('should suggest balanced model', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'llama3.2:latest' },
            { name: 'llama3.2:8b' },
            { name: 'codellama:7b' },
          ],
        }),
      }));

      const result = await modelsCommand.suggestModel('balanced', 'http://localhost:11434');

      expect(result).toBe('llama3.2:latest');
    });

    test('should fallback to first available model when no preferred match', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'unknown-model-1' },
            { name: 'unknown-model-2' },
          ],
        }),
      }));

      const result = await modelsCommand.suggestModel('speed', 'http://localhost:11434');

      expect(result).toBe('unknown-model-1');
    });

    test('should return null when no models available', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: [],
        }),
      }));

      const result = await modelsCommand.suggestModel('balanced', 'http://localhost:11434');

      expect(result).toBeNull();
    });

    test('should return null for HTTP error', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: false,
      }));

      const result = await modelsCommand.suggestModel('balanced', 'http://localhost:11434');

      expect(result).toBeNull();
    });

    test('should return null for network error', async () => {
      global.fetch = mock(() => Promise.reject(new Error('Network error')));

      const result = await modelsCommand.suggestModel('balanced', 'http://localhost:11434');

      expect(result).toBeNull();
    });

    test('should use default useCase when not provided', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'llama3.2:latest' },
            { name: 'llama3.2:8b' },
          ],
        }),
      }));

      const result = await modelsCommand.suggestModel(undefined, 'http://localhost:11434');

      expect(result).toBe('llama3.2:latest');
    });
  });

  describe('getModelStats', () => {
    test('should return correct stats for models', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: [
            {
              name: 'llama3:8b',
              size: 1000000000,
              details: { family: 'llama' },
            },
            {
              name: 'mistral:7b',
              size: 800000000,
              details: { family: 'mistral' },
            },
            {
              name: 'llama3:70b',
              size: 2000000000,
              details: { family: 'llama' },
            },
            {
              name: 'unknown-model',
              size: 500000000,
              // No family details
            },
          ],
        }),
      }));

      const result = await modelsCommand.getModelStats('http://localhost:11434');

      expect(result).toEqual({
        total: 4,
        byFamily: {
          llama: 2,
          mistral: 1,
        },
        totalSize: 4300000000,
      });
    });

    test('should return empty stats for HTTP error', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: false,
      }));

      const result = await modelsCommand.getModelStats('http://localhost:11434');

      expect(result).toEqual({
        total: 0,
        byFamily: {},
        totalSize: 0,
      });
    });

    test('should return empty stats for network error', async () => {
      global.fetch = mock(() => Promise.reject(new Error('Network error')));

      const result = await modelsCommand.getModelStats('http://localhost:11434');

      expect(result).toEqual({
        total: 0,
        byFamily: {},
        totalSize: 0,
      });
    });

    test('should handle models without size', async () => {
      global.fetch = mock(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          models: [
            {
              name: 'llama3:8b',
              // No size
              details: { family: 'llama' },
            },
          ],
        }),
      }));

      const result = await modelsCommand.getModelStats('http://localhost:11434');

      expect(result).toEqual({
        total: 1,
        byFamily: {
          llama: 1,
        },
        totalSize: 0,
      });
    });
  });

  describe('getPreferredModels', () => {
    test('should return preferred models from constants', () => {
      const result = (modelsCommand as any).getPreferredModels();

      expect(result).toEqual([
        'llama3.2:latest',
        'llama3.2:3b',
        'llama3.2:1b',
        'llama3:latest',
        'llama3:8b',
        'codellama:latest',
        'codellama:7b',
        'mistral:latest',
        'mistral:7b',
        'mistral:7b-instruct',
        'qwen2.5:latest',
        'qwen2.5:7b',
        'deepseek-coder:latest',
        'deepseek-coder:6.7b',
        'phi3:latest',
        'gemma2:latest',
      ]);
    });
  });
}); 