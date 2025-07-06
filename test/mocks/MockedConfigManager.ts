/* istanbul ignore file */
// Minimal mock for IConfigManager for Bun tests. Use in test files as needed.
import { CONFIGURATIONS } from '../../src/constants/configurations';
import { IConfigManager, ILogger } from '../../src/core/interfaces';
import {
  ConfigFileInfo,
  ConfigSourceInfo,
  ContextProvider,
  ModelConfig,
  ModelRole,
  OllamaCommitConfig,
} from '../../src/types';

export class MockedConfigManager implements IConfigManager {
  private config: OllamaCommitConfig;
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
    // Use a mutable copy of the mock config
    this.config = {
      ...CONFIGURATIONS.MOCK,
      models: [...CONFIGURATIONS.MOCK.models],
    } as OllamaCommitConfig;
  }

  async initialize(): Promise<void> {}
  async getConfig(): Promise<OllamaCommitConfig> {
    return this.config;
  }
  async getConfigByType(type: 'user' | 'local'): Promise<OllamaCommitConfig> {
    return this.config;
  }
  async removeConfig(type: 'user' | 'local'): Promise<void> {
    this.logger.info(`Mock config removed (type: ${type})`);
  }
  async getConfigFiles(): Promise<{
    user: string;
    local: string;
    active: Array<{ type: 'user' | 'local'; path: string; 'in-use': boolean }>;
  }> {
    return {
      user: '/mock/user/config.json',
      local: '/mock/local/config.json',
      active: [
        { type: 'user', path: '/mock/user/config.json', 'in-use': true },
        { type: 'local', path: '/mock/local/config.json', 'in-use': false },
      ],
    };
  }
  async getDebugInfo(): Promise<Record<string, unknown>> {
    return {
      config: this.config,
      files: await this.getConfigFiles(),
      environment: { platform: 'mock', arch: 'mock', nodeVersion: 'mock', cwd: '/mock', env: {} },
    };
  }
  async getConfigSources(): Promise<Record<string, unknown>> {
    return {
      model: 'user',
      host: 'user',
      verbose: 'user',
      quiet: 'user',
      timeouts: { connection: 'user', generation: 'user', modelPull: 'user' },
      context: 'user',
    };
  }
  async getConfigSourceInfo(): Promise<ConfigSourceInfo> {
    return {
      model: 'user',
      host: 'user',
      promptFile: 'user',
      promptTemplate: 'user',
      verbose: 'user',
      interactive: 'user',
      debug: 'user',
      autoStage: 'user',
      autoModel: 'user',
      autoCommit: 'user',
      useEmojis: 'user',
      quiet: 'user',
      timeouts: {
        connection: 'user',
        generation: 'user',
        modelPull: 'user',
      },
      models: 'user',
      embeddingsProvider: 'user',
      embeddingsModel: 'user',
      context: 'user',
    };
  }
  async getConfigFileInfo(): Promise<ConfigFileInfo[]> {
    return [
      {
        path: '/mock/user/config.json',
        label: 'User Configuration',
        type: 'global',
      },
      {
        path: '/mock/local/config.json',
        label: 'Project Configuration',
        type: 'local',
      },
    ];
  }
  async saveConfig(config: Partial<OllamaCommitConfig>, type?: 'user' | 'local'): Promise<void> {
    // Auto-sync models array if model field was updated
    if (config.model !== undefined) {
      // Validate the model value
      if (!config.model || typeof config.model !== 'string' || config.model.trim() === '') {
        this.logger.warn('Invalid model value provided, skipping auto-sync of models array');
      } else {
        const currentModels = this.config.models || [];
        const currentChatModel = currentModels.find(m => m.roles.includes('chat'));
        const shouldUpdate = !currentChatModel || currentChatModel.model !== config.model;

        if (shouldUpdate) {
          // Create a new models array, preserving existing non-chat models
          const updatedModels = [...currentModels];

          if (currentChatModel) {
            // Update existing chat model
            const chatModelIndex = updatedModels.findIndex(m => m.roles.includes('chat'));
            if (chatModelIndex !== -1) {
              const existingModel = updatedModels[chatModelIndex];
              if (existingModel) {
                updatedModels[chatModelIndex] = {
                  name: config.model,
                  provider: existingModel.provider,
                  model: config.model,
                  roles: existingModel.roles,
                };
              }
            }
          } else {
            // Add new chat model if none exists
            updatedModels.push({
              name: config.model,
              provider: 'ollama' as const,
              model: config.model,
              roles: ['chat', 'edit', 'autocomplete', 'apply', 'summarize'],
            });
          }

          // Ensure embeddings model exists
          const hasEmbeddingsModel = updatedModels.some(m => m.roles.includes('embed'));
          if (!hasEmbeddingsModel) {
            updatedModels.push({
              name: 'embeddingsProvider',
              provider: 'ollama',
              model: this.config.embeddingsModel || 'nomic-embed-text',
              roles: ['embed'],
            });
          }

          config.models = updatedModels;
        }
      }
    }

    this.config = { ...this.config, ...config };
    this.logger.info(`Mock config saved (type: ${type})`);
  }
  override(config: OllamaCommitConfig) {
    this.config = { ...config };
  }
  async getModelByRole(role: ModelRole): Promise<ModelConfig | null> {
    return this.config.models?.find(m => m.roles.includes(role)) || null;
  }
  async getEmbeddingsModel(): Promise<ModelConfig | null> {
    if (this.config.embeddingsProvider) {
      return this.config.models?.find(m => m.name === this.config.embeddingsProvider) || null;
    }
    return this.getModelByRole('embed');
  }
  async getContextProviders(): Promise<ContextProvider[]> {
    return this.config.context || [];
  }
  async getChatModel(): Promise<ModelConfig | null> {
    return this.getModelByRole('chat');
  }
  async getPrimaryModel(): Promise<string> {
    const chatModel = await this.getChatModel();
    return chatModel?.model || this.config.model;
  }
  async getConfigKeys(): Promise<
    Array<{ key: string; description: string; type: string; default: unknown; example?: string }>
  > {
    return [
      {
        key: 'model',
        description: 'Primary model for commit message generation',
        type: 'string',
        default: this.config.model,
        example: 'llama3',
      },
      {
        key: 'host',
        description: 'Ollama server host URL',
        type: 'string',
        default: this.config.host,
        example: 'http://localhost:11434',
      },
      {
        key: 'verbose',
        description: 'Enable verbose output',
        type: 'boolean',
        default: this.config.verbose,
        example: 'true',
      },
      {
        key: 'interactive',
        description: 'Enable interactive mode',
        type: 'boolean',
        default: this.config.interactive,
        example: 'true',
      },
      {
        key: 'debug',
        description: 'Enable debug mode',
        type: 'boolean',
        default: this.config.debug,
        example: 'false',
      },
      {
        key: 'autoStage',
        description: 'Automatically stage files before commit',
        type: 'boolean',
        default: this.config.autoStage,
        example: 'false',
      },
      {
        key: 'autoModel',
        description: 'Automatically select model',
        type: 'boolean',
        default: this.config.autoModel,
        example: 'false',
      },
      {
        key: 'autoCommit',
        description: 'Automatically commit after generating message',
        type: 'boolean',
        default: this.config.autoCommit,
        example: 'false',
      },
      {
        key: 'quiet',
        description: 'Suppress git command output',
        type: 'boolean',
        default: this.config.quiet,
        example: 'true',
      },
      {
        key: 'promptFile',
        description: 'Path to custom prompt file',
        type: 'string',
        default: this.config.promptFile,
        example: '/path/to/prompt.txt',
      },
      {
        key: 'promptTemplate',
        description: 'Prompt template to use',
        type: 'string',
        default: this.config.promptTemplate,
        example: 'conventional',
      },
      {
        key: 'useEmojis',
        description: 'Use emojis in commit messages',
        type: 'boolean',
        default: this.config.useEmojis,
        example: 'false',
      },
      {
        key: 'timeouts.connection',
        description: 'Connection timeout in milliseconds',
        type: 'number',
        default: this.config.timeouts.connection,
        example: '10000',
      },
      {
        key: 'timeouts.generation',
        description: 'Generation timeout in milliseconds',
        type: 'number',
        default: this.config.timeouts.generation,
        example: '120000',
      },
      {
        key: 'timeouts.modelPull',
        description: 'Model pull timeout in milliseconds',
        type: 'number',
        default: this.config.timeouts.modelPull,
        example: '300000',
      },
      {
        key: 'embeddingsModel',
        description: 'Model for embeddings generation',
        type: 'string',
        default: this.config.models?.[1]?.model || 'nomic-embed-text',
        example: 'nomic-embed-text',
      },
      {
        key: 'embeddingsProvider',
        description: 'Provider for embeddings',
        type: 'string',
        default: this.config.embeddingsProvider,
        example: 'embeddingsProvider',
      },
      {
        key: 'context',
        description: 'Context providers (comma-separated)',
        type: 'array',
        default: this.config.context?.map(c => c.provider) || [],
        example: 'code,diff,terminal',
      },
    ];
  }
}
