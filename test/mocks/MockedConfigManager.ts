import { CONFIGURATIONS } from '../../src/constants/configurations';
import { ENVIRONMENTAL_VARIABLES } from '../../src/constants/enviornmental';
import { IConfigManager } from '../../src/core/interfaces';
import { ConfigSources, OllamaCommitConfig } from '../../src/types';
import { VALID_TEMPLATES, type VALID_TEMPLATE } from '../../src/constants/prompts';

export class MockedConfigManager implements IConfigManager {
  private config: OllamaCommitConfig;
  private initialized = false;

  constructor() {
    this.config = { ...CONFIGURATIONS.MOCK };
    this.applyEnvironmentVariables();
  }

  private applyEnvironmentVariables(): void {
    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_AUTO_COMMIT] === 'true') {
      this.config.autoCommit = true;
    } else if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_AUTO_COMMIT] === 'false') {
      this.config.autoCommit = false;
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_PROMPT_TEMPLATE]) {
      if (
        VALID_TEMPLATES.includes(
          process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_PROMPT_TEMPLATE] as VALID_TEMPLATE,
        )
      ) {
        this.config.promptTemplate =
          process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_PROMPT_TEMPLATE];
      }
    }
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      this.initialized = true;
    }
  }

  async getConfig(): Promise<Readonly<OllamaCommitConfig>> {
    if (!this.initialized) {
      await this.initialize();
    }
    return { ...this.config };
  }

  get<K extends keyof OllamaCommitConfig>(key: K): OllamaCommitConfig[K] {
    if (!this.initialized) {
      throw new Error('ConfigManager not initialized. Call initialize() first.');
    }
    return this.config[key];
  }

  async reload(): Promise<void> {
    // No-op in mock
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
      timeouts: {
        connection: 'mock',
        generation: 'mock',
        modelPull: 'mock',
      },
    };
  }
}
