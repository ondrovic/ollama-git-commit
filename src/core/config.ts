import { CONFIGURATIONS } from '@/constants/configurations';
import fsExtra from 'fs-extra';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { ENVIRONMENTAL_VARIABLES } from '../constants/enviornmental';
import { MODELS } from '../constants/models';
import { VALID_TEMPLATES, type VALID_TEMPLATE } from '../constants/prompts';
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
  private static instance: ConfigManager;
  private config: OllamaCommitConfig;
  private readonly defaultConfigFile: string;
  private readonly localConfigFile: string;
  private initialized = false;
  private logger: ILogger;
  private fs: typeof fsExtra;

  private constructor(logger: ILogger = Logger.getDefault(), fs: typeof fsExtra = fsExtra) {
    this.logger = logger;
    this.fs = fs;
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
   * @returns The singleton ConfigManager instance
   */
  static getInstance(
    logger: ILogger = Logger.getDefault(),
    fs: typeof fsExtra = fsExtra,
  ): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(logger, fs);
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
    const defaults = CONFIGURATIONS.DEFAULT;
    return {
      ...defaults,
      models: [...defaults.models],
      context: [...defaults.context],
    } as OllamaCommitConfig;
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
          Logger.warn(`Invalid host URL in ${source}: ${validated.host}`);
          Logger.warn('Expected format: http://host:port or host:port');
        }
      }
    }

    return validated;
  }

  private applyEnvironmentVariables(config: OllamaCommitConfig): void {
    // Apply environment variables with OLLAMA_COMMIT_ prefix
    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_HOST]) {
      config.host = process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_HOST] as string;
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_MODEL]) {
      config.model = process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_MODEL] as string;
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_HOST]) {
      config.host = process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_HOST] as string;
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_VERBOSE] === 'true') {
      config.verbose = true;
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_DEBUG] === 'true') {
      config.debug = true;
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_AUTO_STAGE] === 'true') {
      config.autoStage = true;
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_AUTO_MODEL] === 'true') {
      config.autoModel = true;
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_AUTO_COMMIT] === 'true') {
      config.autoCommit = true;
    } else if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_AUTO_COMMIT] === 'false') {
      config.autoCommit = false;
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_QUITE] === 'true') {
      config.quite = true;
    } else if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_QUITE] === 'false') {
      config.quite = false;
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_PROMPT_FILE]) {
      config.promptFile = (
        process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_PROMPT_FILE] as string
      ).replace('~', homedir());
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_PROMPT_TEMPLATE]) {
      const promptTemplate = process.env[
        ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_PROMPT_TEMPLATE
      ] as VALID_TEMPLATE;
      if (VALID_TEMPLATES.includes(promptTemplate)) {
        config.promptTemplate = promptTemplate;
      }
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_USE_EMOJIS] === 'true') {
      config.useEmojis = true;
    } else if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_USE_EMOJIS] === 'false') {
      config.useEmojis = false;
    }

    // Timeout environment variables
    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_TIME_OUTS_CONNECTION]) {
      const timeout = parseInt(
        process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_TIME_OUTS_CONNECTION] as string,
        10,
      );
      if (!isNaN(timeout)) {
        config.timeouts.connection = timeout;
      }
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_TIME_OUTS_GENERATION]) {
      const timeout = parseInt(
        process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_TIME_OUTS_GENERATION] as string,
        10,
      );
      if (!isNaN(timeout)) {
        config.timeouts.generation = timeout;
      }
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_TIME_OUTS_MODEL_PULL]) {
      const timeout = parseInt(
        process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_TIME_OUTS_MODEL_PULL] as string,
        10,
      );
      if (!isNaN(timeout)) {
        config.timeouts.modelPull = timeout;
      }
    }

    // New multi-model environment variables
    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_EMBEDDINGS_PROVIDER]) {
      config.embeddingsProvider = process.env[
        ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_EMBEDDINGS_PROVIDER
      ] as string;
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_EMBEDDINGS_MODEL]) {
      config.embeddingsModel = process.env[
        ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_EMBEDDINGS_MODEL
      ] as string;
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_MODELS]) {
      try {
        config.models = JSON.parse(
          process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_MODELS] as string,
        );
      } catch (error) {
        this.logger.error('Failed to parse OLLAMA_COMMIT_MODELS environment variable:', error);
      }
    }

    if (process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_CONTEXT]) {
      try {
        config.context = JSON.parse(
          process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_CONTEXT] as string,
        );
      } catch (error) {
        this.logger.error('Failed to parse OLLAMA_COMMIT_CONTEXT environment variable:', error);
      }
    }
  }

  // Public API
  async getConfig(): Promise<Readonly<OllamaCommitConfig>> {
    if (!this.initialized) {
      await this.initialize();
    }
    // Always reload config to ensure auto-sync logic runs
    this.config = await this.loadConfig();
    return { ...this.config };
  }

  get<K extends keyof OllamaCommitConfig>(key: K): OllamaCommitConfig[K] {
    if (!this.initialized) {
      throw new Error('ConfigManager not initialized. Call initialize() first.');
    }
    const value = this.config[key];
    return value;
  }

  // Override config for current session (doesn't persist)
  override(overrides: Partial<OllamaCommitConfig>): void {
    this.config = { ...this.config, ...overrides };
  }

  // Create default config file
  async createDefaultConfig(): Promise<void> {
    try {
      const configDir = dirname(this.defaultConfigFile);
      await this.fs.ensureDir(configDir);

      const defaultConfig = this.getDefaults();
      await this.fs.writeJson(this.defaultConfigFile, defaultConfig, { spaces: 2 });

      Logger.success(`Configuration file created at: ${this.defaultConfigFile}`);
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'message' in error) {
        throw new Error(
          `Failed to create default config: ${(error as { message: string }).message}`,
        );
      } else {
        throw new Error(`Failed to create default config: ${String(error)}`);
      }
    }
  }

  // Get config file locations for CLI info
  async getConfigFiles(): Promise<{
    user: string;
    local: string;
    active: ActiveFile[];
  }> {
    const active: ActiveFile[] = [];

    if (await this.fs.pathExists(this.defaultConfigFile))
      active.push({ type: 'user', path: this.defaultConfigFile, 'in-use': true });
    if (await this.fs.pathExists(this.localConfigFile))
      active.push({ type: 'local', path: this.localConfigFile, 'in-use': true });

    return {
      user: this.defaultConfigFile,
      local: this.localConfigFile,
      active,
    };
  }

  // Reload configuration
  async reload(): Promise<void> {
    this.config = await this.loadConfig();
  }

  // Debug info
  async getDebugInfo(): Promise<Record<string, unknown>> {
    const config = await this.getConfig();
    const files = await this.getConfigFiles();

    return {
      config: config as unknown as Record<string, unknown>,
      files,
      environment: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        cwd: process.cwd(),
        env: {
          [ENVIRONMENTAL_VARIABLES.OLLAMA_HOST]: process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_HOST],
          [ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_MODEL]:
            process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_MODEL],
          [ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_HOST]:
            process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_HOST],
          [ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_VERBOSE]:
            process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_VERBOSE],
          [ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_DEBUG]:
            process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_DEBUG],
          [ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_AUTO_STAGE]:
            process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_AUTO_STAGE],
          [ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_AUTO_MODEL]:
            process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_AUTO_MODEL],
          [ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_AUTO_COMMIT]:
            process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_AUTO_COMMIT],
          [ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_PROMPT_FILE]:
            process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_PROMPT_FILE],
          [ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_PROMPT_TEMPLATE]:
            process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_PROMPT_TEMPLATE],
          [ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_USE_EMOJIS]:
            process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_USE_EMOJIS],
          [ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_TIME_OUTS_CONNECTION]:
            process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_TIME_OUTS_CONNECTION],
          [ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_TIME_OUTS_GENERATION]:
            process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_TIME_OUTS_GENERATION],
          [ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_TIME_OUTS_MODEL_PULL]:
            process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_TIME_OUTS_MODEL_PULL],
          [ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_EMBEDDINGS_PROVIDER]:
            process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_EMBEDDINGS_PROVIDER],
          [ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_MODELS]:
            process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_MODELS],
          [ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_CONTEXT]:
            process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_CONTEXT],
        },
      },
    };
  }

  async getConfigSources(): Promise<ConfigSources> {
    const sources: ConfigSources = CONFIGURATIONS.EMPTY;

    const getSource = async (key: string): Promise<string | undefined> => {
      const keyParts = key.split('.');
      const lastKey = keyParts[keyParts.length - 1];
      if (!lastKey) return 'built-in';

      // Check environment variables first
      const envKey = `OLLAMA_COMMIT_${key.toUpperCase().replace('.', '_')}`;
      if (process.env[envKey]) return 'environment';

      // Helper function to check if a value exists in a config object
      const hasValue = (obj: Record<string, unknown> | undefined, parts: string[]): boolean => {
        if (!obj) return false;
        let curr: unknown = obj;
        for (const part of parts) {
          if (
            curr &&
            typeof curr === 'object' &&
            Object.prototype.hasOwnProperty.call(curr, part)
          ) {
            curr = (curr as Record<string, unknown>)[part];
          } else {
            return false;
          }
        }
        return true;
      };

      // Check configs in order of precedence
      const currentProjectConfig = await this.loadConfigFile(this.localConfigFile);
      const currentUserConfig = await this.loadConfigFile(this.defaultConfigFile);

      if (hasValue(currentProjectConfig, keyParts)) return 'project';
      if (hasValue(currentUserConfig, keyParts)) return 'user';
      return 'built-in';
    };

    sources.model = await getSource('model');
    sources.host = await getSource('host');
    sources.verbose = await getSource('verbose');
    sources.interactive = await getSource('interactive');
    sources.debug = await getSource('debug');
    sources.autoStage = await getSource('autoStage');
    sources.autoModel = await getSource('autoModel');
    sources.autoCommit = await getSource('autoCommit');
    sources.quite = await getSource('quite');
    sources.promptFile = await getSource('promptFile');
    sources.promptTemplate = await getSource('promptTemplate');
    sources.useEmojis = await getSource('useEmojis');
    sources.models = await getSource('models');
    sources.embeddingsProvider = await getSource('embeddingsProvider');
    sources.embeddingsModel = await getSource('embeddingsModel');
    sources.context = await getSource('context');
    if (sources.timeouts) {
      sources.timeouts.connection = await getSource('timeouts.connection');
      sources.timeouts.generation = await getSource('timeouts.generation');
      sources.timeouts.modelPull = await getSource('timeouts.modelPull');
    }
    return sources;
  }

  // New methods for multi-model support
  async getModelByRole(role: ModelRole): Promise<ModelConfig | null> {
    const config = await this.getConfig();
    return config.models?.find(m => m.roles.includes(role)) || null;
  }

  async getEmbeddingsModel(): Promise<ModelConfig | null> {
    const config = await this.getConfig();

    // First check for simple embeddingsModel field (backward compatibility)
    if (config.embeddingsModel) {
      return {
        name: 'embeddings',
        provider: 'ollama',
        model: config.embeddingsModel,
        roles: ['embed'],
      };
    }

    // Then check for multi-model embeddingsProvider
    if (config.embeddingsProvider) {
      return config.models?.find(m => m.name === config.embeddingsProvider) || null;
    }

    // Finally check for any model with embed role
    return this.getModelByRole('embed');
  }

  async getContextProviders(): Promise<ContextProvider[]> {
    const config = await this.getConfig();
    return config.context || [];
  }

  async getChatModel(): Promise<ModelConfig | null> {
    return this.getModelByRole('chat');
  }

  // Backward compatibility: get the primary model (either from models array or legacy model field)
  async getPrimaryModel(): Promise<string> {
    const config = await this.getConfig();
    // If model is set, try to find it in models array
    if (config.model) {
      if (config.models && config.models.length > 0) {
        const found = config.models.find(m => m.model === config.model || m.name === config.model);
        if (found) return found.model;
      }
      return config.model;
    }
    // If not set, use first chat model in models array
    if (config.models && config.models.length > 0) {
      const chatModel = config.models.find(m => m.roles.includes('chat'));
      if (chatModel) return chatModel.model;
    }
    // Fallback to legacy model
    return config.model;
  }

  public async saveConfig(
    config: Partial<OllamaCommitConfig>,
    type: 'user' | 'local' = 'user',
  ): Promise<void> {
    const configFile = type === 'local' ? this.localConfigFile : this.defaultConfigFile;
    const configDir = dirname(configFile);

    try {
      await this.fs.ensureDir(configDir);
      let existingConfig: Record<string, unknown> = {};
      if (await this.fs.pathExists(configFile)) {
        try {
          existingConfig = await this.fs.readJson(configFile);
        } catch {
          this.logger.warn(`Could not read existing config at ${configFile}, will overwrite.`);
        }
      }
      // Merge the new config into the existing config, starting from defaults
      const mergedConfig = this.deepMerge({ ...this.getDefaults(), ...existingConfig }, config);

      // Auto-sync models array if model field was updated
      if (config.model !== undefined) {
        // Validate the model value
        if (!config.model || typeof config.model !== 'string' || config.model.trim() === '') {
          this.logger.warn('Invalid model value provided, skipping auto-sync of models array');
        } else {
          const currentModels = mergedConfig.models || [];
          const currentChatModel = currentModels.find(m => m.roles.includes('chat'));
          const shouldUpdate = !currentChatModel || currentChatModel.model !== config.model;

          if (shouldUpdate) {
            this.logger.debug(`Auto-syncing models array with core model: ${config.model}`);

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
                model: mergedConfig.embeddingsModel || MODELS.EMBEDDINGS,
                roles: ['embed'],
              });
            }

            mergedConfig.models = updatedModels;
            this.logger.debug(`Updated models array: ${JSON.stringify(mergedConfig.models)}`);
          }
        }
      }

      await this.fs.writeJson(configFile, mergedConfig, { spaces: 2 });
      this.logger.success(`Configuration saved to ${configFile}`);
    } catch (error) {
      this.logger.error(`❌ Failed to save configuration to ${configFile}:`, error);
      throw error;
    }
  }

  public async removeConfig(type: 'user' | 'local'): Promise<void> {
    const configFile = type === 'local' ? this.localConfigFile : this.defaultConfigFile;

    try {
      if (await this.fs.pathExists(configFile)) {
        await this.fs.remove(configFile);
        this.logger.success(`Configuration removed from ${configFile}`);
      } else {
        this.logger.info(`ℹ️  No configuration file found at ${configFile}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to remove configuration from ${configFile}:`, error);
      throw error;
    }
  }
}

export async function getConfig(): Promise<Readonly<OllamaCommitConfig>> {
  const configManager = ConfigManager.getInstance();
  await configManager.initialize();
  return configManager.getConfig();
}
