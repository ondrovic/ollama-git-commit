import fsExtra from 'fs-extra';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { CONFIGURATIONS } from '../constants/configurations';
import { MODELS } from '../constants/models';
import {
  ConfigSources,
  ContextProvider,
  ModelConfig,
  ModelRole,
  OllamaCommitConfig,
  type ActiveFile,
} from '../types';
import { Logger } from '../utils/logger';
import { IConfigManager, ILogger } from './interfaces';

export class ConfigManager implements IConfigManager {
  private static instance: ConfigManager | undefined;
  private config: OllamaCommitConfig;
  private readonly defaultConfigFile: string;
  private readonly localConfigFile: string;
  private initialized = false;
  private logger: ILogger;
  private fs: typeof fsExtra;
  private env: Record<string, string | undefined>;

  private constructor(
    logger: ILogger = Logger.getDefault(),
    fs: typeof fsExtra = fsExtra,
    env: Record<string, string | undefined> = process.env,
  ) {
    this.logger = logger;
    this.fs = fs;
    this.env = env;
    // Define config file locations
    this.defaultConfigFile = join(homedir(), '.config', 'ollama-git-commit', 'config.json');
    this.localConfigFile = join(process.cwd(), '.ollama-git-commit.json');
    // Initialize with defaults
    this.config = this.getDefaults();
  }

  /**
   * Gets or creates a singleton instance of the ConfigManager.
   *
   * @param logger - Optional logger instance (defaults to default Logger)
   * @param fs - Optional filesystem module (defaults to fs-extra)
   * @param env - Optional environment object (defaults to process.env)
   * @returns The singleton ConfigManager instance
   */
  static getInstance(
    logger: ILogger = Logger.getDefault(),
    fs: typeof fsExtra = fsExtra,
    env: Record<string, string | undefined> = process.env,
  ): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(logger, fs, env);
    }
    return ConfigManager.instance;
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      this.config = await this.loadConfig();
      this.initialized = true;
    }
  }

  private getDefaults(): OllamaCommitConfig {
    // Deep clone to avoid mutation of CONFIGURATIONS.DEFAULT
    return JSON.parse(JSON.stringify(CONFIGURATIONS.DEFAULT)) as OllamaCommitConfig;
  }

  private async loadConfigFile(filePath: string): Promise<Record<string, unknown>> {
    try {
      const content = await this.fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(content) as Record<string, unknown>;
      return this.validateAndTransformConfig(config, filePath);
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
        return {};
      }
      throw err;
    }
  }

  private deepMerge(
    target: OllamaCommitConfig,
    source: Record<string, unknown>,
  ): OllamaCommitConfig {
    const result: OllamaCommitConfig = { ...target };
    for (const key in source) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      if (key === 'timeouts' && typeof source[key] === 'object' && source[key] !== null) {
        result.timeouts = { ...result.timeouts, ...(source.timeouts as object) };
      } else {
        // Allow any key to be merged, not just those that exist in the target
        (result as unknown as Record<string, unknown>)[key] = source[key];
      }
    }
    return result;
  }

  private async loadConfig(): Promise<OllamaCommitConfig> {
    const defaults = this.getDefaults();

    // Configuration hierarchy (highest priority first):
    // 1. Environment variables
    // 2. Local config file (.ollama-git-commit.json in current directory)
    // 3. Global config file (~/.ollama-git-commit.json)
    // 4. Default config file (~/.config/ollama-git-commit/config.json)
    // 5. Built-in defaults

    let config = { ...defaults };

    // Load default config file
    const defaultConfig = await this.loadConfigFile(this.defaultConfigFile);
    if (defaultConfig) {
      config = this.deepMerge(config, defaultConfig);
    }

    // Load local config file (highest priority)
    const localConfig = await this.loadConfigFile(this.localConfigFile);
    if (localConfig) {
      // If local config has timeouts, use them; otherwise, keep the defaults
      if (localConfig.timeouts) {
        config.timeouts = localConfig.timeouts as OllamaCommitConfig['timeouts'];
      }
      config = this.deepMerge(config, localConfig);
    }

    // Apply environment variables (highest priority)
    this.applyEnvironmentVariables(config);

    // --- AUTO-SYNC MODELS ARRAY WITH CORE MODEL ---
    // If user has set 'model' but not 'models', auto-generate models array for all chat/edit/autocomplete/apply/summarize roles
    // OR if user has set 'model' but models array still contains the default model, update it
    if (config.model) {
      const currentChatModel = config.models?.find(m => m.roles.includes('chat'));
      const shouldUpdate =
        !config.models ||
        config.models.length === 0 ||
        (currentChatModel && currentChatModel.model !== config.model);

      if (shouldUpdate) {
        this.logger.debug(`Auto-syncing models array with core model: ${config.model}`);
        config.models = [
          {
            name: config.model,
            provider: 'ollama',
            model: config.model,
            roles: ['chat', 'edit', 'autocomplete', 'apply', 'summarize'],
          },
          {
            name: 'embeddingsProvider',
            provider: 'ollama',
            model: config.embeddingsModel || MODELS.EMBEDDINGS,
            roles: ['embed'],
          },
        ];
        this.logger.debug(`Generated models array: ${JSON.stringify(config.models)}`);
      } else {
        this.logger.debug(
          `No auto-sync needed. Model: ${config.model}, Models array: ${config.models ? config.models.length : 0} items`,
        );
      }
    }

    return config;
  }

  private validateAndTransformConfig(
    config: Record<string, unknown>,
    source: string,
  ): Record<string, unknown> {
    const validated: Record<string, unknown> = { ...config };

    // Validate host URL
    if (validated.host) {
      try {
        // Try parsing as URL first
        new URL(validated.host as string);
      } catch {
        try {
          // If not a URL, try parsing as host:port
          const [host, port] = (validated.host as string).split(':');
          if (!host || !port || isNaN(parseInt(port))) {
            throw new Error('Invalid host:port format');
          }
          // Convert to URL format
          validated.host = `http://${validated.host}`;
        } catch {
          this.logger.warn(`Invalid host URL in ${source}: ${validated.host}`);
          this.logger.warn('Expected format: http://host:port or host:port');
        }
      }
    }

    return validated;
  }

  private applyEnvironmentVariables(config: OllamaCommitConfig): void {
    const defaults = CONFIGURATIONS.DEFAULT;
    for (const [envKey, envValue] of Object.entries(this.env)) {
      if (envValue === undefined) continue;

      // Handle OLLAMA_HOST
      if (envKey === 'OLLAMA_HOST') {
        config.host = envValue;
        continue;
      }

      // Handle OLLAMA_COMMIT_ prefixed variables
      if (envKey.startsWith('OLLAMA_COMMIT_')) {
        const configKey = envKey.replace('OLLAMA_COMMIT_', '');

        if (configKey.startsWith('TIME_OUTS_')) {
          // Handle nested timeout values
          const timeoutType = configKey
            .replace('TIME_OUTS_', '')
            .toLowerCase() as keyof OllamaCommitConfig['timeouts'];
          const defaultTimeout = defaults.timeouts[timeoutType];
          const timeoutValue = this.convertEnvValue(
            envValue,
            config.timeouts[timeoutType],
            defaultTimeout,
          );
          config.timeouts[timeoutType] = timeoutValue as number;
        } else if (configKey === 'CONTEXT') {
          // Handle context providers
          const providers = envValue
            .split(',')
            .map(p => p.trim())
            .filter(Boolean);
          config.context = providers.map(provider => ({
            provider: provider as ContextProvider['provider'],
          }));
        } else if (configKey === 'MODELS') {
          // Handle models array
          try {
            config.models = JSON.parse(envValue);
          } catch {
            this.logger.warn(`Invalid models JSON in environment variable ${envKey}`);
          }
        } else {
          // Convert SNAKE_CASE to camelCase and handle type conversion
          const normalizedKey = this.snakeToCamelCase(configKey) as keyof OllamaCommitConfig;
          if (normalizedKey in config) {
            const defaultValue = (defaults as Record<string, unknown>)[normalizedKey];
            const convertedValue = this.convertEnvValue(
              envValue,
              config[normalizedKey],
              defaultValue,
            );
            (config as unknown as Record<string, unknown>)[normalizedKey] = convertedValue;
          }
        }
      }
    }
  }

  private convertEnvValue(envValue: string, currentValue: unknown, defaultValue: unknown): unknown {
    // Convert based on the current value's type
    if (typeof defaultValue === 'boolean') {
      if (envValue.toLowerCase() === 'true' || envValue === '1') return true;
      if (envValue.toLowerCase() === 'false' || envValue === '0') return false;
      return defaultValue;
    }
    if (typeof defaultValue === 'number') {
      const num = parseInt(envValue, 10);
      return isNaN(num) ? defaultValue : num;
    }
    // For strings and other types, return as-is
    return envValue;
  }

  async getConfig(): Promise<Readonly<OllamaCommitConfig>> {
    if (!this.initialized) {
      await this.initialize();
    }
    // Reload configuration from disk to ensure we get the latest changes
    this.config = await this.loadConfig();
    return this.config;
  }

  async getConfigByType(_type: 'user' | 'local'): Promise<Readonly<OllamaCommitConfig>> {
    if (!this.initialized) {
      await this.initialize();
    }
    // For now, return the full config since we don't track source per field
    // This could be enhanced to track which config file each field came from
    return this.config;
  }

  get<K extends keyof OllamaCommitConfig>(key: K): OllamaCommitConfig[K] {
    if (!this.initialized) {
      throw new Error('ConfigManager not initialized');
    }
    return this.config[key];
  }

  override(overrides: Partial<OllamaCommitConfig>): void {
    this.config = { ...this.config, ...overrides };
  }

  async createDefaultConfig(): Promise<void> {
    try {
      await this.fs.ensureDir(dirname(this.defaultConfigFile));
      await this.fs.writeJson(this.defaultConfigFile, this.getDefaults(), { spaces: 2 });
      this.logger.success(`Configuration file created at: ${this.defaultConfigFile}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create default config: ${message}`);
    }
  }

  async getConfigFiles(): Promise<{
    user: string;
    local: string;
    active: ActiveFile[];
  }> {
    const activeFiles: ActiveFile[] = [];

    try {
      const userExists = await this.fs.pathExists(this.defaultConfigFile);
      if (userExists) {
        activeFiles.push({ type: 'user', path: this.defaultConfigFile, 'in-use': true });
      }
    } catch {
      // File doesn't exist or can't be accessed
    }

    try {
      const localExists = await this.fs.pathExists(this.localConfigFile);
      if (localExists) {
        activeFiles.push({ type: 'local', path: this.localConfigFile, 'in-use': true });
      }
    } catch {
      // File doesn't exist or can't be accessed
    }

    return {
      user: this.defaultConfigFile,
      local: this.localConfigFile,
      active: activeFiles,
    };
  }

  async reload(): Promise<void> {
    this.initialized = false;
    await this.initialize();
  }

  async getDebugInfo(): Promise<Record<string, unknown>> {
    const config = await this.getConfig();
    const files = await this.getConfigFiles();

    return {
      config,
      files,
      environment: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        cwd: process.cwd(),
        env: process.env,
      },
    };
  }

  async getConfigSources(): Promise<ConfigSources> {
    // This is a simplified implementation that returns the source for each config key
    // In a real implementation, you'd track which source each field came from
    const getSource = async (key: string): Promise<string | undefined> => {
      // Check environment variables first
      const envKey = `OLLAMA_COMMIT_${key.toUpperCase()}`;
      if (process.env[envKey] !== undefined) {
        return 'environment';
      }

      // Check local config file
      try {
        const localConfig = await this.loadConfigFile(this.localConfigFile);
        if (hasValue(localConfig, key.split('.'))) {
          return 'local';
        }
      } catch {
        // File doesn't exist or can't be read
      }

      // Check user config file
      try {
        const userConfig = await this.loadConfigFile(this.defaultConfigFile);
        if (hasValue(userConfig, key.split('.'))) {
          return 'user';
        }
      } catch {
        // File doesn't exist or can't be read
      }

      return 'default';
    };

    const hasValue = (obj: Record<string, unknown> | undefined, parts: string[]): boolean => {
      if (!obj) return false;
      let current = obj;
      for (const part of parts) {
        if (current[part] === undefined) return false;
        current = current[part] as Record<string, unknown>;
      }
      return true;
    };

    return {
      model: await getSource('model'),
      host: await getSource('host'),
      promptFile: await getSource('promptFile'),
      promptTemplate: await getSource('promptTemplate'),
      verbose: await getSource('verbose'),
      interactive: await getSource('interactive'),
      debug: await getSource('debug'),
      autoStage: await getSource('autoStage'),
      autoModel: await getSource('autoModel'),
      autoCommit: await getSource('autoCommit'),
      useEmojis: await getSource('useEmojis'),
      quiet: await getSource('quiet'),
      timeouts: {
        connection: await getSource('timeouts.connection'),
        generation: await getSource('timeouts.generation'),
        modelPull: await getSource('timeouts.modelPull'),
      },
      models: await getSource('models'),
      embeddingsProvider: await getSource('embeddingsProvider'),
      embeddingsModel: await getSource('embeddingsModel'),
      context: await getSource('context'),
    };
  }

  async getModelByRole(role: ModelRole): Promise<ModelConfig | null> {
    const config = await this.getConfig();
    return config.models?.find(m => m.roles.includes(role)) || null;
  }

  async getEmbeddingsModel(): Promise<ModelConfig | null> {
    const config = await this.getConfig();

    // First check if embeddingsProvider is set and find that model
    if (config.embeddingsProvider) {
      const providerModel = config.models?.find(m => m.name === config.embeddingsProvider);
      if (providerModel) {
        return providerModel;
      }
    }

    // Then check if embeddingsModel is set and find that model
    if (config.embeddingsModel) {
      const modelConfig = config.models?.find(m => m.model === config.embeddingsModel);
      if (modelConfig) {
        return modelConfig;
      }
    }

    // Finally, look for any model with embed role
    return this.getModelByRole('embed');
  }

  async getContextProviders(): Promise<ContextProvider[]> {
    const config = await this.getConfig();
    return config.context || [];
  }

  async getChatModel(): Promise<ModelConfig | null> {
    return this.getModelByRole('chat');
  }

  async getPrimaryModel(): Promise<string> {
    const config = await this.getConfig();
    const chatModel = await this.getChatModel();

    // If we have a chat model, use its model name
    if (chatModel?.model) {
      return chatModel.model;
    }

    // Otherwise, fall back to the config.model field
    return config.model || '';
  }

  async getConfigKeys(): Promise<
    Array<{
      key: string;
      description: string;
      type: string;
      default: unknown;
      example?: string;
    }>
    > {
    const config = await this.getConfig();
    return [
      {
        key: 'model',
        description: 'Primary model for commit message generation',
        type: 'string',
        default: config.model,
        example: 'llama3',
      },
      {
        key: 'host',
        description: 'Ollama server host URL',
        type: 'string',
        default: config.host,
        example: 'http://localhost:11434',
      },
      {
        key: 'verbose',
        description: 'Enable verbose output',
        type: 'boolean',
        default: config.verbose,
        example: 'true',
      },
      {
        key: 'interactive',
        description: 'Enable interactive mode',
        type: 'boolean',
        default: config.interactive,
        example: 'true',
      },
      {
        key: 'debug',
        description: 'Enable debug mode',
        type: 'boolean',
        default: config.debug,
        example: 'false',
      },
      {
        key: 'autoStage',
        description: 'Automatically stage files before commit',
        type: 'boolean',
        default: config.autoStage,
        example: 'false',
      },
      {
        key: 'autoModel',
        description: 'Automatically select model',
        type: 'boolean',
        default: config.autoModel,
        example: 'false',
      },
      {
        key: 'autoCommit',
        description: 'Automatically commit after generating message',
        type: 'boolean',
        default: config.autoCommit,
        example: 'false',
      },
      {
        key: 'quiet',
        description: 'Suppress git command output',
        type: 'boolean',
        default: config.quiet,
        example: 'true',
      },
      {
        key: 'promptFile',
        description: 'Path to custom prompt file',
        type: 'string',
        default: config.promptFile,
        example: '/path/to/prompt.txt',
      },
      {
        key: 'promptTemplate',
        description: 'Prompt template to use',
        type: 'string',
        default: config.promptTemplate,
        example: 'conventional',
      },
      {
        key: 'useEmojis',
        description: 'Use emojis in commit messages',
        type: 'boolean',
        default: config.useEmojis,
        example: 'false',
      },
      {
        key: 'timeouts.connection',
        description: 'Connection timeout in milliseconds',
        type: 'number',
        default: config.timeouts.connection,
        example: '10000',
      },
      {
        key: 'timeouts.generation',
        description: 'Generation timeout in milliseconds',
        type: 'number',
        default: config.timeouts.generation,
        example: '120000',
      },
      {
        key: 'timeouts.modelPull',
        description: 'Model pull timeout in milliseconds',
        type: 'number',
        default: config.timeouts.modelPull,
        example: '300000',
      },
      {
        key: 'embeddingsModel',
        description: 'Model for embeddings generation',
        type: 'string',
        default: config.models?.[1]?.model || 'nomic-embed-text',
        example: 'nomic-embed-text',
      },
      {
        key: 'embeddingsProvider',
        description: 'Provider for embeddings',
        type: 'string',
        default: config.embeddingsProvider,
        example: 'embeddingsProvider',
      },
      {
        key: 'context',
        description: 'Context providers (comma-separated)',
        type: 'array',
        default: config.context?.map(c => c.provider) || [],
        example: 'code,diff,terminal',
      },
    ];
  }

  public async saveConfig(
    config: Partial<OllamaCommitConfig>,
    _type: 'user' | 'local' = 'user',
  ): Promise<void> {
    try {
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
            this.logger.debug(`Auto-syncing models array with core model: ${config.model}`);

            // Create a new models array, preserving existing non-chat models
            const updatedModels = [...currentModels];

            if (currentChatModel) {
              // Update existing chat model but preserve the name if it's custom
              const chatModelIndex = updatedModels.findIndex(m => m.roles.includes('chat'));
              if (chatModelIndex !== -1) {
                const existingModel = updatedModels[chatModelIndex];
                if (existingModel) {
                  updatedModels[chatModelIndex] = {
                    name: existingModel.name, // Preserve the existing name
                    provider: existingModel.provider,
                    model: config.model, // Update the model
                    roles: existingModel.roles, // Preserve the roles
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
            this.logger.debug(`Updated models array: ${JSON.stringify(config.models)}`);
          }
        }
      }

      // Update the in-memory config
      this.config = { ...this.config, ...config };

      // Save to file
      const configFile = _type === 'local' ? this.localConfigFile : this.defaultConfigFile;
      await this.fs.ensureDir(dirname(configFile));
      await this.fs.writeJson(configFile, this.config, { spaces: 2 });
      this.logger.success(`Configuration saved to ${configFile}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to save config: ${message}`);
    }
  }

  public async removeConfig(type: 'user' | 'local'): Promise<void> {
    try {
      const configFile = type === 'local' ? this.localConfigFile : this.defaultConfigFile;
      const exists = await this.fs.pathExists(configFile);
      if (exists) {
        await this.fs.remove(configFile);
        this.logger.success(`Configuration removed from ${configFile}`);
      } else {
        this.logger.info(`Configuration file ${configFile} does not exist`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to remove config: ${message}`);
    }
  }

  private snakeToCamelCase(str: string): string {
    return str.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  static resetInstance(): void {
    ConfigManager.instance = undefined;
  }
}

export async function getConfig(): Promise<Readonly<OllamaCommitConfig>> {
  const configManager = ConfigManager.getInstance();
  return configManager.getConfig();
}
