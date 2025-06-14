import fsExtra from 'fs-extra';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { Logger } from '../utils/logger';
import type { OllamaCommitConfig } from '../index';
import { IConfigManager, ILogger } from './interfaces';

export interface OllamaCommitConfig {
  // Core settings
  model: string;
  host: string;

  // Behavior settings
  verbose: boolean;
  interactive: boolean;
  debug: boolean;
  autoStage: boolean;
  autoModel: boolean;

  // File paths
  promptFile: string;
  configFile: string;

  // Network settings
  timeouts: {
    connection: number;
    generation: number;
    modelPull: number;
  };

  // UI settings
  useEmojis: boolean;
  promptTemplate: 'default' | 'conventional' | 'simple' | 'detailed';
}

export class ConfigManager implements IConfigManager {
  private static instance: ConfigManager;
  private config: OllamaCommitConfig;
  private readonly defaultConfigFile: string;
  private readonly globalConfigFile: string;
  private readonly localConfigFile: string;
  private initialized = false;
  private logger: ILogger;
  private fs: typeof fsExtra;

  private constructor(logger: ILogger = Logger.getDefault(), fs: typeof fsExtra = fsExtra) {
    this.logger = logger;
    this.fs = fs;
    // Define config file locations
    this.defaultConfigFile = join(homedir(), '.config', 'ollama-git-commit', 'config.json');
    this.globalConfigFile = join(homedir(), '.ollama-git-commit.json');
    this.localConfigFile = join(process.cwd(), '.ollama-git-commit.json');
    // Initialize with defaults
    this.config = this.getDefaults();
  }

  static getInstance(logger: ILogger = Logger.getDefault(), fs: typeof fsExtra = fsExtra): ConfigManager {
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
    return {
      // Core settings - these should be the most commonly working defaults
      model: 'llama3.2:latest', // More widely available than mistral
      host: process.env.OLLAMA_HOST || 'http://localhost:11434', // Standard Ollama default

      // Behavior settings
      verbose: false,
      interactive: true,
      debug: false,
      autoStage: false,
      autoModel: false,

      // File paths
      promptFile: join(homedir(), '.config', 'ollama-git-commit', 'prompt.txt'),
      configFile: this.defaultConfigFile,

      // Network settings (in milliseconds)
      timeouts: {
        connection: 10000,   // 10 seconds
        generation: 120000,  // 2 minutes
        modelPull: 300000,   // 5 minutes
      },

      // UI settings
      useEmojis: true,
      promptTemplate: 'default',
    };
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

  // Deep merge helper
  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
        } else {
          result[key] = source[key];
        }
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

    // Load global config file
    const globalConfig = await this.loadConfigFile(this.globalConfigFile);
    if (globalConfig) {
      config = this.deepMerge(config, globalConfig);
    }

    // Load local config file (highest priority)
    const localConfig = await this.loadConfigFile(this.localConfigFile);
    if (localConfig) {
      config = this.deepMerge(config, localConfig);
    }

    // Apply environment variables (highest priority)
    this.applyEnvironmentVariables(config);

    return config;
  }

  private validateAndTransformConfig(config: Record<string, unknown>, source: string): Record<string, unknown> {
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
    if (process.env.OLLAMA_HOST) {
      config.host = process.env.OLLAMA_HOST;
    }

    if (process.env.OLLAMA_COMMIT_MODEL) {
      config.model = process.env.OLLAMA_COMMIT_MODEL;
    }

    if (process.env.OLLAMA_COMMIT_HOST) {
      config.host = process.env.OLLAMA_COMMIT_HOST;
    }

    if (process.env.OLLAMA_COMMIT_VERBOSE === 'true') {
      config.verbose = true;
    }

    if (process.env.OLLAMA_COMMIT_DEBUG === 'true') {
      config.debug = true;
    }

    if (process.env.OLLAMA_COMMIT_AUTO_STAGE === 'true') {
      config.autoStage = true;
    }

    if (process.env.OLLAMA_COMMIT_AUTO_MODEL === 'true') {
      config.autoModel = true;
    }

    if (process.env.OLLAMA_COMMIT_PROMPT_FILE) {
      config.promptFile = process.env.OLLAMA_COMMIT_PROMPT_FILE.replace('~', homedir());
    }

    // Timeout environment variables
    if (process.env.OLLAMA_COMMIT_TIMEOUT_CONNECTION) {
      const timeout = parseInt(process.env.OLLAMA_COMMIT_TIMEOUT_CONNECTION, 10);
      if (!isNaN(timeout)) {
        config.timeouts.connection = timeout;
      }
    }

    if (process.env.OLLAMA_COMMIT_TIMEOUT_GENERATION) {
      const timeout = parseInt(process.env.OLLAMA_COMMIT_TIMEOUT_GENERATION, 10);
      if (!isNaN(timeout)) {
        config.timeouts.generation = timeout;
      }
    }
  }

  // Public API
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
        throw new Error(`Failed to create default config: ${(error as { message: string }).message}`);
      } else {
        throw new Error(`Failed to create default config: ${String(error)}`);
      }
    }
  }

  // Get config file locations for CLI info
  async getConfigFiles(): Promise<{
    default: string;
    global: string;
    local: string;
    active: string[];
  }> {
    const active: string[] = [];

    if (await this.fs.pathExists(this.defaultConfigFile)) active.push(this.defaultConfigFile);
    if (await this.fs.pathExists(this.globalConfigFile)) active.push(this.globalConfigFile);
    if (await this.fs.pathExists(this.localConfigFile)) active.push(this.localConfigFile);

    return {
      default: this.defaultConfigFile,
      global: this.globalConfigFile,
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
      config,
      files,
      environment: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        cwd: process.cwd(),
        env: {
          OLLAMA_HOST: process.env.OLLAMA_HOST,
          OLLAMA_COMMIT_MODEL: process.env.OLLAMA_COMMIT_MODEL,
          OLLAMA_COMMIT_HOST: process.env.OLLAMA_COMMIT_HOST,
          OLLAMA_COMMIT_VERBOSE: process.env.OLLAMA_COMMIT_VERBOSE,
          OLLAMA_COMMIT_DEBUG: process.env.OLLAMA_COMMIT_DEBUG,
          OLLAMA_COMMIT_AUTO_STAGE: process.env.OLLAMA_COMMIT_AUTO_STAGE,
          OLLAMA_COMMIT_AUTO_MODEL: process.env.OLLAMA_COMMIT_AUTO_MODEL,
          OLLAMA_COMMIT_PROMPT_FILE: process.env.OLLAMA_COMMIT_PROMPT_FILE,
          OLLAMA_COMMIT_TIMEOUT_CONNECTION: process.env.OLLAMA_COMMIT_TIMEOUT_CONNECTION,
          OLLAMA_COMMIT_TIMEOUT_GENERATION: process.env.OLLAMA_COMMIT_TIMEOUT_GENERATION,
        },
      },
    };
  }

  async getConfigSources(): Promise<{
    model: string;
    host: string;
    verbose: string;
    interactive: string;
    debug: string;
    autoStage: string;
    autoModel: string;
    promptFile: string;
    promptTemplate: string;
    useEmojis: string;
    timeouts: {
      connection: string;
      generation: string;
      modelPull: string;
    };
  }> {
    const sources: {
      model: string;
      host: string;
      verbose: string;
      interactive: string;
      debug: string;
      autoStage: string;
      autoModel: string;
      promptFile: string;
      promptTemplate: string;
      useEmojis: string;
      timeouts: {
        connection: string;
        generation: string;
        modelPull: string;
      };
    } = {
      model: 'default',
      host: 'default',
      verbose: 'default',
      interactive: 'default',
      debug: 'default',
      autoStage: 'default',
      autoModel: 'default',
      promptFile: 'default',
      promptTemplate: 'default',
      useEmojis: 'default',
      timeouts: {
        connection: 'default',
        generation: 'default',
        modelPull: 'default',
      },
    };

    // Load config files and their paths
    const projectConfigPath = this.localConfigFile;
    const userConfigPath = this.globalConfigFile;
    const defaultConfigPath = this.defaultConfigFile;
    let projectConfig: Record<string, unknown> = {};
    let userConfig: Record<string, unknown> = {};
    let defaultConfig: Record<string, unknown> = {};

    try {
      projectConfig = await this.loadConfigFile(projectConfigPath);
    } catch {
      // Ignore missing project config
    }
    try {
      userConfig = await this.loadConfigFile(userConfigPath);
    } catch {
      // Ignore missing user config
    }
    try {
      defaultConfig = await this.loadConfigFile(defaultConfigPath);
    } catch {
      // Ignore missing default config
    }

    // Helper to determine source
    const getSource = async (key: string): Promise<string> => {
      // Check environment variables first (highest priority)
      const envKeyDirect = `OLLAMA_${key.toUpperCase()}`;
      if (process.env[envKeyDirect]) {
        return 'ENV';
      }

      // Split the key to handle nested keys (e.g., 'timeouts.connection')
      const keyParts = key.split('.');
      let currentProjectConfig = projectConfig;
      let currentUserConfig = userConfig;
      let currentDefaultConfig = defaultConfig;

      // Traverse the config objects for nested keys
      for (const part of keyParts) {
        if (Object.prototype.hasOwnProperty.call(currentProjectConfig, part)) {
          currentProjectConfig = currentProjectConfig[part] as Record<string, unknown>;
        } else {
          currentProjectConfig = {};
        }
        if (Object.prototype.hasOwnProperty.call(currentUserConfig, part)) {
          currentUserConfig = currentUserConfig[part] as Record<string, unknown>;
        } else {
          currentUserConfig = {};
        }
        if (Object.prototype.hasOwnProperty.call(currentDefaultConfig, part)) {
          currentDefaultConfig = currentDefaultConfig[part] as Record<string, unknown>;
        } else {
          currentDefaultConfig = {};
        }
      }

      // Check project config
      if (Object.prototype.hasOwnProperty.call(currentProjectConfig, keyParts[keyParts.length - 1])) {
        return 'LOCAL';
      }

      // Check user config
      if (Object.prototype.hasOwnProperty.call(currentUserConfig, keyParts[keyParts.length - 1])) {
        return 'USER';
      }

      // Check default config
      if (Object.prototype.hasOwnProperty.call(currentDefaultConfig, keyParts[keyParts.length - 1])) {
        return 'DEFAULT';
      }

      // If not found in any config, return DEFAULT
      return 'DEFAULT';
    };

    // Populate sources
    sources.model = await getSource('model');
    sources.host = await getSource('host');
    sources.verbose = await getSource('verbose');
    sources.interactive = await getSource('interactive');
    sources.debug = await getSource('debug');
    sources.autoStage = await getSource('autoStage');
    sources.autoModel = await getSource('autoModel');
    sources.promptFile = await getSource('promptFile');
    sources.promptTemplate = await getSource('promptTemplate');
    sources.useEmojis = await getSource('useEmojis');
    sources.timeouts.connection = await getSource('timeouts.connection');
    sources.timeouts.generation = await getSource('timeouts.generation');
    sources.timeouts.modelPull = await getSource('timeouts.modelPull');

    return sources;
  }
}

export async function getConfig(): Promise<Readonly<OllamaCommitConfig>> {
  const configManager = ConfigManager.getInstance();
  await configManager.initialize();
  return configManager.getConfig();
}
