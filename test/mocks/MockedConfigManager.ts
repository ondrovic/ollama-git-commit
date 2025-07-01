import { CONFIGURATIONS } from '../../src/constants/configurations';
import { IConfigManager, ILogger } from '../../src/core/interfaces';
import { ActiveFile, ConfigSources, ContextProvider, ModelConfig, ModelRole, OllamaCommitConfig } from '../../src/types';

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
    this.config = { ...this.config, ...config };
    this.logger.info(`Mock config saved (type: ${type})`);
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
      active: [
        { type: 'user', path: '/mock/user/config.json', 'in-use': true }
      ]
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
        env: {}
      }
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
