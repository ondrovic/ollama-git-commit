import { describe, expect, test } from 'bun:test';
import { CONFIGURATIONS } from '../../src/constants/configurations';
import { ConfigSourceInfo, ContextProvider, ModelConfig } from '../../src/types';

describe('CONFIGURATIONS', () => {
  describe('EMPTY', () => {
    test('should have all properties set to undefined', () => {
      expect(CONFIGURATIONS.EMPTY.model).toBeUndefined();
      expect(CONFIGURATIONS.EMPTY.host).toBeUndefined();
      expect(CONFIGURATIONS.EMPTY.verbose).toBeUndefined();
      expect(CONFIGURATIONS.EMPTY.interactive).toBeUndefined();
      expect(CONFIGURATIONS.EMPTY.debug).toBeUndefined();
      expect(CONFIGURATIONS.EMPTY.autoStage).toBeUndefined();
      expect(CONFIGURATIONS.EMPTY.autoModel).toBeUndefined();
      expect(CONFIGURATIONS.EMPTY.autoCommit).toBeUndefined();
      expect(CONFIGURATIONS.EMPTY.quiet).toBeUndefined();
      expect(CONFIGURATIONS.EMPTY.promptFile).toBeUndefined();
      expect(CONFIGURATIONS.EMPTY.promptTemplate).toBeUndefined();
      expect(CONFIGURATIONS.EMPTY.useEmojis).toBeUndefined();
      expect(CONFIGURATIONS.EMPTY.models).toBeUndefined();
      expect(CONFIGURATIONS.EMPTY.embeddingsProvider).toBeUndefined();
      expect(CONFIGURATIONS.EMPTY.context).toBeUndefined();

      // Check timeouts object
      expect(CONFIGURATIONS.EMPTY.timeouts.connection).toBeUndefined();
      expect(CONFIGURATIONS.EMPTY.timeouts.generation).toBeUndefined();
      expect(CONFIGURATIONS.EMPTY.timeouts.modelPull).toBeUndefined();
    });
  });

  describe('DEFAULT', () => {
    test('should have correct default values', () => {
      expect(CONFIGURATIONS.DEFAULT.model).toBeDefined();
      expect(CONFIGURATIONS.DEFAULT.host).toBe('http://localhost:11434');
      expect(CONFIGURATIONS.DEFAULT.verbose).toBe(false);
      expect(CONFIGURATIONS.DEFAULT.interactive).toBe(true);
      expect(CONFIGURATIONS.DEFAULT.debug).toBe(false);
      expect(CONFIGURATIONS.DEFAULT.autoStage).toBe(false);
      expect(CONFIGURATIONS.DEFAULT.autoModel).toBe(false);
      expect(CONFIGURATIONS.DEFAULT.autoCommit).toBe(false);
      expect(CONFIGURATIONS.DEFAULT.quiet).toBe(false);
      expect(CONFIGURATIONS.DEFAULT.useEmojis).toBe(false);
      expect(CONFIGURATIONS.DEFAULT.promptTemplate).toBe('default');
      expect(CONFIGURATIONS.DEFAULT.embeddingsProvider).toBe('embeddingsProvider');
    });

    test('should have correct timeout values', () => {
      expect(CONFIGURATIONS.DEFAULT.timeouts.connection).toBe(10000);
      expect(CONFIGURATIONS.DEFAULT.timeouts.generation).toBe(120000);
      expect(CONFIGURATIONS.DEFAULT.timeouts.modelPull).toBe(300000);
    });

    test('should have correct file paths', () => {
      expect(CONFIGURATIONS.DEFAULT.promptFile).toContain('ollama-git-commit');
      expect(CONFIGURATIONS.DEFAULT.promptFile).toContain('prompt.txt');
      expect(CONFIGURATIONS.DEFAULT.configFile).toContain('ollama-git-commit');
      expect(CONFIGURATIONS.DEFAULT.configFile).toContain('config.json');
    });

    test('should have models array with correct structure', () => {
      expect(Array.isArray(CONFIGURATIONS.DEFAULT.models)).toBe(true);
      expect(CONFIGURATIONS.DEFAULT.models).toHaveLength(2);

      const chatModel = CONFIGURATIONS.DEFAULT.models[0];
      expect(chatModel.name).toBeDefined();
      expect(chatModel.provider).toBe('ollama');
      expect(chatModel.roles).toContain('chat');
      expect(chatModel.roles).toContain('edit');

      const embeddingsModel = CONFIGURATIONS.DEFAULT.models[1];
      expect(embeddingsModel.name).toBe('embeddingsProvider');
      expect(embeddingsModel.provider).toBe('ollama');
      expect(embeddingsModel.roles).toContain('embed');
    });

    test('should have context array', () => {
      expect(Array.isArray(CONFIGURATIONS.DEFAULT.context)).toBe(true);
      expect(CONFIGURATIONS.DEFAULT.context.length).toBeGreaterThan(0);
    });
  });

  describe('MOCK', () => {
    test('should have mock values', () => {
      expect(CONFIGURATIONS.MOCK.model).toBe('mock-model');
      expect(CONFIGURATIONS.MOCK.host).toBe('http://mock-host:1234');
      expect(CONFIGURATIONS.MOCK.verbose).toBe(false);
      expect(CONFIGURATIONS.MOCK.interactive).toBe(true);
      expect(CONFIGURATIONS.MOCK.debug).toBe(false);
      expect(CONFIGURATIONS.MOCK.autoStage).toBe(false);
      expect(CONFIGURATIONS.MOCK.autoModel).toBe(false);
      expect(CONFIGURATIONS.MOCK.autoCommit).toBe(false);
      expect(CONFIGURATIONS.MOCK.quiet).toBe(false);
      expect(CONFIGURATIONS.MOCK.useEmojis).toBe(true);
      expect(CONFIGURATIONS.MOCK.promptTemplate).toBe('default');
      expect(CONFIGURATIONS.MOCK.embeddingsProvider).toBe('mock-embeddings');
    });

    test('should have mock file paths', () => {
      expect(CONFIGURATIONS.MOCK.promptFile).toBe('/mock/mock-prompt-file.txt');
      expect(CONFIGURATIONS.MOCK.configFile).toBe('/mock/mock-config-file.json');
    });

    test('should have mock timeout values', () => {
      expect(CONFIGURATIONS.MOCK.timeouts.connection).toBe(10000);
      expect(CONFIGURATIONS.MOCK.timeouts.generation).toBe(120000);
      expect(CONFIGURATIONS.MOCK.timeouts.modelPull).toBe(300000);
    });

    test('should have mock models array', () => {
      expect(Array.isArray(CONFIGURATIONS.MOCK.models)).toBe(true);
      expect(CONFIGURATIONS.MOCK.models).toHaveLength(2);

      const chatModel = CONFIGURATIONS.MOCK.models[0];
      expect(chatModel.name).toBe('mock-chat-model');
      expect(chatModel.provider).toBe('ollama');
      expect(chatModel.model).toBe('mock-chat');
      expect(chatModel.roles).toContain('chat');
      expect(chatModel.roles).toContain('edit');

      const embeddingsModel = CONFIGURATIONS.MOCK.models[1];
      expect(embeddingsModel.name).toBe('mock-embeddings');
      expect(embeddingsModel.provider).toBe('ollama');
      expect(embeddingsModel.model).toBe('mock-embed');
      expect(embeddingsModel.roles).toContain('embed');
    });

    test('should have filtered context array', () => {
      expect(Array.isArray(CONFIGURATIONS.MOCK.context)).toBe(true);
      // Should only include 'code' and 'diff' providers
      CONFIGURATIONS.MOCK.context.forEach(context => {
        expect(['code', 'diff']).toContain(context.provider);
      });
    });
  });

  describe('MESSAGES', () => {
    describe('CORE_SETTINGS', () => {
      test('should format core settings message correctly', () => {
        const sourceInfo: ConfigSourceInfo = {
          model: 'config',
          host: 'env',
          promptFile: 'default',
          promptTemplate: 'cli',
          verbose: 'config',
          interactive: 'default',
          debug: 'config',
          autoStage: 'cli',
          autoModel: 'config',
          autoCommit: 'env',
          useEmojis: 'config',
          quiet: 'cli',
          timeouts: {
            connection: 'config',
            generation: 'default',
            modelPull: 'config',
          },
        };

        const result = CONFIGURATIONS.MESSAGES.CORE_SETTINGS(
          'llama3:8b',
          'http://localhost:11434',
          '/path/to/prompt.txt',
          'default',
          sourceInfo,
        );

        expect(result).toContain('Core Settings:');
        expect(result).toContain('Model: llama3:8b (from config)');
        expect(result).toContain('Host: http://localhost:11434 (from env)');
        expect(result).toContain('Prompt File: /path/to/prompt.txt (from default)');
        expect(result).toContain('Prompt Template: default (from cli)');
      });

      test('should handle empty strings and special characters', () => {
        const sourceInfo: ConfigSourceInfo = {
          model: 'config',
          host: 'env',
          promptFile: 'default',
          promptTemplate: 'cli',
          verbose: 'config',
          interactive: 'default',
          debug: 'config',
          autoStage: 'cli',
          autoModel: 'config',
          autoCommit: 'env',
          useEmojis: 'config',
          quiet: 'cli',
          timeouts: {
            connection: 'config',
            generation: 'default',
            modelPull: 'config',
          },
        };

        const result = CONFIGURATIONS.MESSAGES.CORE_SETTINGS('', '', '', '', sourceInfo);

        expect(result).toContain('Model:  (from config)');
        expect(result).toContain('Host:  (from env)');
        expect(result).toContain('Prompt File:  (from default)');
        expect(result).toContain('Prompt Template:  (from cli)');
      });
    });

    describe('BEHAVIOR_SETTINGS', () => {
      test('should format behavior settings message correctly', () => {
        const sourceInfo: ConfigSourceInfo = {
          model: 'config',
          host: 'env',
          promptFile: 'default',
          promptTemplate: 'cli',
          verbose: 'config',
          interactive: 'default',
          debug: 'config',
          autoStage: 'cli',
          autoModel: 'config',
          autoCommit: 'env',
          useEmojis: 'config',
          quiet: 'cli',
          timeouts: {
            connection: 'config',
            generation: 'default',
            modelPull: 'config',
          },
        };

        const result = CONFIGURATIONS.MESSAGES.BEHAVIOR_SETTINGS(
          true,
          false,
          true,
          false,
          true,
          false,
          true,
          false,
          sourceInfo,
        );

        expect(result).toContain('Behavior Settings:');
        expect(result).toContain('Verbose: true (from config)');
        expect(result).toContain('Interactive: false (from default)');
        expect(result).toContain('Debug: true (from config)');
        expect(result).toContain('Auto Stage: false (from cli)');
        expect(result).toContain('Auto Model: true (from config)');
        expect(result).toContain('Auto Commit: false (from env)');
        expect(result).toContain('Use Emojis: true (from config)');
        expect(result).toContain('Quiet: false (from cli)');
      });

      test('should handle all boolean combinations', () => {
        const sourceInfo: ConfigSourceInfo = {
          model: 'config',
          host: 'env',
          promptFile: 'default',
          promptTemplate: 'cli',
          verbose: 'config',
          interactive: 'default',
          debug: 'config',
          autoStage: 'cli',
          autoModel: 'config',
          autoCommit: 'env',
          useEmojis: 'config',
          quiet: 'cli',
          timeouts: {
            connection: 'config',
            generation: 'default',
            modelPull: 'config',
          },
        };

        const result = CONFIGURATIONS.MESSAGES.BEHAVIOR_SETTINGS(
          false,
          true,
          false,
          true,
          false,
          true,
          false,
          true,
          sourceInfo,
        );

        expect(result).toContain('Verbose: false (from config)');
        expect(result).toContain('Interactive: true (from default)');
        expect(result).toContain('Debug: false (from config)');
        expect(result).toContain('Auto Stage: true (from cli)');
        expect(result).toContain('Auto Model: false (from config)');
        expect(result).toContain('Auto Commit: true (from env)');
        expect(result).toContain('Use Emojis: false (from config)');
        expect(result).toContain('Quiet: true (from cli)');
      });
    });

    describe('TIMEOUTS', () => {
      test('should format timeouts message correctly', () => {
        const sourceInfo: ConfigSourceInfo = {
          model: 'config',
          host: 'env',
          promptFile: 'default',
          promptTemplate: 'cli',
          verbose: 'config',
          interactive: 'default',
          debug: 'config',
          autoStage: 'cli',
          autoModel: 'config',
          autoCommit: 'env',
          useEmojis: 'config',
          quiet: 'cli',
          timeouts: {
            connection: 'config',
            generation: 'default',
            modelPull: 'env',
          },
        };

        const result = CONFIGURATIONS.MESSAGES.TIMEOUTS(5000, 60000, 180000, sourceInfo);

        expect(result).toContain('Timeouts (ms):');
        expect(result).toContain('Connection: 5000ms (from config)');
        expect(result).toContain('Generation: 60000ms (from default)');
        expect(result).toContain('Model Pull: 180000ms (from env)');
      });

      test('should handle zero and large timeout values', () => {
        const sourceInfo: ConfigSourceInfo = {
          model: 'config',
          host: 'env',
          promptFile: 'default',
          promptTemplate: 'cli',
          verbose: 'config',
          interactive: 'default',
          debug: 'config',
          autoStage: 'cli',
          autoModel: 'config',
          autoCommit: 'env',
          useEmojis: 'config',
          quiet: 'cli',
          timeouts: {
            connection: 'config',
            generation: 'default',
            modelPull: 'env',
          },
        };

        const result = CONFIGURATIONS.MESSAGES.TIMEOUTS(0, 999999, 1000000, sourceInfo);

        expect(result).toContain('Connection: 0ms (from config)');
        expect(result).toContain('Generation: 999999ms (from default)');
        expect(result).toContain('Model Pull: 1000000ms (from env)');
      });
    });

    describe('MODELS', () => {
      test('should format models message correctly', () => {
        const models: ModelConfig[] = [
          {
            name: 'llama3:8b',
            provider: 'ollama',
            model: 'llama3:8b',
            roles: ['chat', 'edit'],
          },
          {
            name: 'embeddings',
            provider: 'ollama',
            model: 'nomic-embed-text',
            roles: ['embed'],
          },
        ];

        const result = CONFIGURATIONS.MESSAGES.MODELS(models, 'embeddings');

        expect(result).toContain('Models:');
        expect(result).toContain('llama3:8b - Roles: chat, edit');
        expect(result).toContain('nomic-embed-text - Roles: embed');
        expect(result).toContain('Embeddings Provider: embeddings');
      });

      test('should handle empty models array', () => {
        const models: ModelConfig[] = [];

        const result = CONFIGURATIONS.MESSAGES.MODELS(models, 'none');

        expect(result).toContain('Models:');
        expect(result).toContain('Embeddings Provider: none');
        expect(result).not.toContain(' - Roles:');
      });

      test('should handle models with single role', () => {
        const models: ModelConfig[] = [
          {
            name: 'single-role',
            provider: 'ollama',
            model: 'single-role',
            roles: ['chat'],
          },
        ];

        const result = CONFIGURATIONS.MESSAGES.MODELS(models, 'single-role');

        expect(result).toContain('single-role - Roles: chat');
      });

      test('should handle models with many roles', () => {
        const models: ModelConfig[] = [
          {
            name: 'multi-role',
            provider: 'ollama',
            model: 'multi-role',
            roles: ['chat', 'edit', 'autocomplete', 'apply', 'summarize'],
          },
        ];

        const result = CONFIGURATIONS.MESSAGES.MODELS(models, 'multi-role');

        expect(result).toContain('multi-role - Roles: chat, edit, autocomplete, apply, summarize');
      });
    });

    describe('CONTEXT', () => {
      test('should format context message correctly', () => {
        const context: ContextProvider[] = [
          { provider: 'code', enabled: true },
          { provider: 'diff', enabled: false },
          { provider: 'git', enabled: true },
        ];

        const result = CONFIGURATIONS.MESSAGES.CONTEXT(context);

        expect(result).toContain('Context Providers:');
        expect(result).toContain('code: enabled');
        expect(result).toContain('diff: disabled');
        expect(result).toContain('git: enabled');
      });

      test('should handle empty context array', () => {
        const context: ContextProvider[] = [];

        const result = CONFIGURATIONS.MESSAGES.CONTEXT(context);

        expect(result).toContain('Context Providers:');
        expect(result).not.toContain(': enabled');
        expect(result).not.toContain(': disabled');
      });

      test('should handle single context provider', () => {
        const context: ContextProvider[] = [{ provider: 'code', enabled: true }];

        const result = CONFIGURATIONS.MESSAGES.CONTEXT(context);

        expect(result).toContain('Context Providers:');
        expect(result).toContain('code: enabled');
      });

      test('should handle all disabled providers', () => {
        const context: ContextProvider[] = [
          { provider: 'code', enabled: false },
          { provider: 'diff', enabled: false },
          { provider: 'git', enabled: false },
        ];

        const result = CONFIGURATIONS.MESSAGES.CONTEXT(context);

        expect(result).toContain('Context Providers:');
        expect(result).toContain('code: disabled');
        expect(result).toContain('diff: disabled');
        expect(result).toContain('git: disabled');
      });

      test('should handle all enabled providers', () => {
        const context: ContextProvider[] = [
          { provider: 'code', enabled: true },
          { provider: 'diff', enabled: true },
          { provider: 'git', enabled: true },
        ];

        const result = CONFIGURATIONS.MESSAGES.CONTEXT(context);

        expect(result).toContain('Context Providers:');
        expect(result).toContain('code: enabled');
        expect(result).toContain('diff: enabled');
        expect(result).toContain('git: enabled');
      });

      test('should handle mixed enabled/disabled providers', () => {
        const context: ContextProvider[] = [
          { provider: 'code', enabled: true },
          { provider: 'diff', enabled: false },
          { provider: 'docs', enabled: true },
          { provider: 'terminal', enabled: false },
        ];

        const result = CONFIGURATIONS.MESSAGES.CONTEXT(context);

        expect(result).toContain('Context Providers:');
        expect(result).toContain('code: enabled');
        expect(result).toContain('diff: disabled');
        expect(result).toContain('docs: enabled');
        expect(result).toContain('terminal: disabled');
      });

      test('should handle providers with special characters in names', () => {
        const context: ContextProvider[] = [
          { provider: 'code-base', enabled: true },
          { provider: 'diff_analysis', enabled: false },
        ];

        const result = CONFIGURATIONS.MESSAGES.CONTEXT(context);

        expect(result).toContain('Context Providers:');
        expect(result).toContain('code-base: enabled');
        expect(result).toContain('diff_analysis: disabled');
      });
    });

    describe('Template string edge cases', () => {
      test('should handle null and undefined values in template strings', () => {
        const sourceInfo: ConfigSourceInfo = {
          model: 'config',
          host: 'env',
          promptFile: 'default',
          promptTemplate: 'cli',
          verbose: 'config',
          interactive: 'default',
          debug: 'config',
          autoStage: 'cli',
          autoModel: 'config',
          autoCommit: 'env',
          useEmojis: 'config',
          quiet: 'cli',
          timeouts: {
            connection: 'config',
            generation: 'default',
            modelPull: 'config',
          },
        };

        // Test with null-like values that might be passed
        const result = CONFIGURATIONS.MESSAGES.CORE_SETTINGS(
          null as any,
          undefined as any,
          '',
          '',
          sourceInfo,
        );

        expect(result).toContain('Model: null (from config)');
        expect(result).toContain('Host: undefined (from env)');
        expect(result).toContain('Prompt File:  (from default)');
        expect(result).toContain('Prompt Template:  (from cli)');
      });

      test('should handle very long values in template strings', () => {
        const sourceInfo: ConfigSourceInfo = {
          model: 'config',
          host: 'env',
          promptFile: 'default',
          promptTemplate: 'cli',
          verbose: 'config',
          interactive: 'default',
          debug: 'config',
          autoStage: 'cli',
          autoModel: 'config',
          autoCommit: 'env',
          useEmojis: 'config',
          quiet: 'cli',
          timeouts: {
            connection: 'config',
            generation: 'default',
            modelPull: 'config',
          },
        };

        const longString = 'a'.repeat(1000);
        const result = CONFIGURATIONS.MESSAGES.CORE_SETTINGS(
          longString,
          longString,
          longString,
          longString,
          sourceInfo,
        );

        expect(result).toContain(`Model: ${longString} (from config)`);
        expect(result).toContain(`Host: ${longString} (from env)`);
        expect(result).toContain(`Prompt File: ${longString} (from default)`);
        expect(result).toContain(`Prompt Template: ${longString} (from cli)`);
      });
    });
  });

  describe('MOCK configuration edge cases', () => {
    test('should filter context providers correctly', () => {
      // Verify that only 'code' and 'diff' providers are included
      const mockContext = CONFIGURATIONS.MOCK.context;

      expect(Array.isArray(mockContext)).toBe(true);
      expect(mockContext.length).toBe(2);

      const providers = mockContext.map(c => c.provider);
      expect(providers).toContain('code');
      expect(providers).toContain('diff');
      expect(providers).not.toContain('docs');
      expect(providers).not.toContain('terminal');
      expect(providers).not.toContain('problems');
      expect(providers).not.toContain('folder');
      expect(providers).not.toContain('codebase');
    });

    test('should have correct model structure in mock', () => {
      const mockModels = CONFIGURATIONS.MOCK.models;

      expect(Array.isArray(mockModels)).toBe(true);
      expect(mockModels).toHaveLength(2);

      // Check chat model
      const chatModel = mockModels[0];
      expect(chatModel.name).toBe('mock-chat-model');
      expect(chatModel.provider).toBe('ollama');
      expect(chatModel.model).toBe('mock-chat');
      expect(Array.isArray(chatModel.roles)).toBe(true);
      expect(chatModel.roles).toContain('chat');
      expect(chatModel.roles).toContain('edit');

      // Check embeddings model
      const embeddingsModel = mockModels[1];
      expect(embeddingsModel.name).toBe('mock-embeddings');
      expect(embeddingsModel.provider).toBe('ollama');
      expect(embeddingsModel.model).toBe('mock-embed');
      expect(Array.isArray(embeddingsModel.roles)).toBe(true);
      expect(embeddingsModel.roles).toContain('embed');
    });

    test('should have correct embeddings provider reference', () => {
      expect(CONFIGURATIONS.MOCK.embeddingsProvider).toBe('mock-embeddings');

      // Verify the embeddings provider name matches a model name
      const mockModels = CONFIGURATIONS.MOCK.models;
      const embeddingsModel = mockModels.find(
        m => m.name === CONFIGURATIONS.MOCK.embeddingsProvider,
      );
      expect(embeddingsModel).toBeDefined();
      expect(embeddingsModel?.roles).toContain('embed');
    });
  });

  describe('DEFAULT configuration edge cases', () => {
    test('should have correct embeddings provider reference', () => {
      expect(CONFIGURATIONS.DEFAULT.embeddingsProvider).toBe('embeddingsProvider');

      // Verify the embeddings provider name matches a model name
      const defaultModels = CONFIGURATIONS.DEFAULT.models;
      const embeddingsModel = defaultModels.find(
        m => m.name === CONFIGURATIONS.DEFAULT.embeddingsProvider,
      );
      expect(embeddingsModel).toBeDefined();
      expect(embeddingsModel?.roles).toContain('embed');
    });

    test('should have all context providers enabled by default', () => {
      const defaultContext = CONFIGURATIONS.DEFAULT.context;

      expect(Array.isArray(defaultContext)).toBe(true);
      expect(defaultContext.length).toBeGreaterThan(0);

      // All default context providers should be enabled
      defaultContext.forEach(provider => {
        expect(provider.enabled).toBe(true);
      });
    });

    test('should have correct file path structure', () => {
      const promptFile = CONFIGURATIONS.DEFAULT.promptFile;
      const configFile = CONFIGURATIONS.DEFAULT.configFile;

      // Should contain home directory
      expect(promptFile).toContain('ollama-git-commit');
      expect(configFile).toContain('ollama-git-commit');

      // Should have correct file extensions
      expect(promptFile).toEndWith('prompt.txt');
      expect(configFile).toEndWith('config.json');

      // Should be absolute paths (cross-platform)
      expect(promptFile).toMatch(/^[A-Z]:\\|\//); // Windows or Unix path
      expect(configFile).toMatch(/^[A-Z]:\\|\//); // Windows or Unix path
    });
  });

  describe('EMPTY configuration edge cases', () => {
    test('should have all properties explicitly undefined', () => {
      const empty = CONFIGURATIONS.EMPTY;

      // Check all top-level properties
      expect(empty.model).toBeUndefined();
      expect(empty.host).toBeUndefined();
      expect(empty.verbose).toBeUndefined();
      expect(empty.interactive).toBeUndefined();
      expect(empty.debug).toBeUndefined();
      expect(empty.autoStage).toBeUndefined();
      expect(empty.autoModel).toBeUndefined();
      expect(empty.autoCommit).toBeUndefined();
      expect(empty.quiet).toBeUndefined();
      expect(empty.promptFile).toBeUndefined();
      expect(empty.promptTemplate).toBeUndefined();
      expect(empty.useEmojis).toBeUndefined();
      expect(empty.models).toBeUndefined();
      expect(empty.embeddingsProvider).toBeUndefined();
      expect(empty.context).toBeUndefined();

      // Check nested timeouts object
      expect(empty.timeouts.connection).toBeUndefined();
      expect(empty.timeouts.generation).toBeUndefined();
      expect(empty.timeouts.modelPull).toBeUndefined();
    });

    test('should not have configFile property', () => {
      // EMPTY config should not have configFile property
      expect('configFile' in CONFIGURATIONS.EMPTY).toBe(false);
    });
  });
});
