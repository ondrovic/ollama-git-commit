import { CONFIGURATIONS } from '../../src/constants/configurations';
import { IConfigManager, ILogger } from '../../src/core/interfaces';
import {
    ActiveFile,
    ConfigSources,
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
    this.config = CONFIGURATIONS.MOCK as OllamaCommitConfig;
  }

  async initialize(): Promise<void> {
    // Mock initialization - no-op
  }

  async getConfig(): Promise<OllamaCommitConfig> {
    return this.config;
  }

  async saveConfig(config: Partial<OllamaCommitConfig>, type?: 'user' | 'local'): Promise<void> {
    // Merge new config
    this.config = { ...this.config, ...config };

    // --- AUTO-SYNC MODELS ARRAY WITH CORE MODEL (same as src/core/config.ts) ---
    if (config.model !== undefined) {
      if (!config.model || typeof config.model !== 'string' || config.model.trim() === '') {
        this.logger.warn('Invalid model value provided, skipping auto-sync of models array');
      } else {
        const currentModels = this.config.models || [];
        const currentChatModel = currentModels.find(m => m.roles.includes('chat'));
        const shouldUpdate = !currentChatModel || currentChatModel.model !== config.model;
        if (shouldUpdate) {
          this.logger.debug(`Auto-syncing models array with core model: ${config.model}`);
          const updatedModels = [...currentModels];
          if (currentChatModel) {
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
            updatedModels.push({
              name: config.model,
              provider: 'ollama',
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
          this.config.models = updatedModels;
          this.logger.debug(`Updated models array: ${JSON.stringify(this.config.models)}`);
        }
      }
    }
    this.logger.info(`Mock config saved (type: ${type})`);
  }

  // Allow direct override for tests
  override(config: OllamaCommitConfig) {
    this.config = { ...config };
  }

  async removeConfig(type: 'user' | 'local'): Promise<void> {
    this.logger.info(`Mock config removed (type: ${type})`);
  }

  async getConfigFiles(): Promise<{
    user: string;
    local: string;
    active: ActiveFile[];
  }> {
    return {
      user: '/mock/user/config.json',
      local: '/mock/local/config.json',
      active: [{ type: 'user', path: '/mock/user/config.json', 'in-use': true }],
    };
  }

  async getDebugInfo(): Promise<Record<string, unknown>> {
    return {
      config: this.config as unknown as Record<string, unknown>,
      files: await this.getConfigFiles(),
      environment: {
        platform: 'mock',
        arch: 'mock',
        nodeVersion: 'mock',
        cwd: '/mock',
        env: {},
      },
    };
  }

  async getConfigSources(): Promise<ConfigSources> {
    return {
      model: 'mock',
      host: 'mock',
      verbose: 'mock',
      interactive: 'mock',
      debug: 'mock',
      autoStage: 'mock',
      autoModel: 'mock',
      autoCommit: 'mock',
      quiet: 'mock',
      promptFile: 'mock',
      promptTemplate: 'mock',
      useEmojis: 'mock',
      models: 'mock',
      embeddingsProvider: 'mock',
      context: 'mock',
      timeouts: {
        connection: 'mock',
        generation: 'mock',
        modelPull: 'mock',
      },
    };
  }

  // New multi-model methods
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
}
