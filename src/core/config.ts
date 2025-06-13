import * as fs from 'fs-extra';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { Logger } from '../utils/logger';

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

export class ConfigManager {
  private static instance: ConfigManager;
  private config: OllamaCommitConfig;
  private readonly defaultConfigFile: string;
  private readonly globalConfigFile: string;
  private readonly localConfigFile: string;
  private initialized = false;

  private constructor() {
    // Define config file locations
    this.defaultConfigFile = join(homedir(), '.config', 'ollama-git-commit', 'config.json');
    this.globalConfigFile = join(homedir(), '.ollama-git-commit.json');
    this.localConfigFile = join(process.cwd(), '.ollama-git-commit.json');

    // Initialize with defaults
    this.config = this.getDefaults();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
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
      const content = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(content) as Record<string, unknown>;
      return this.validateAndTransformConfig(config, filePath);
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
        return {};
      }
      throw err;
    }
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
      config = { ...config, ...defaultConfig };
    }

    // Load global config file
    const globalConfig = await this.loadConfigFile(this.globalConfigFile);
    if (globalConfig) {
      config = { ...config, ...globalConfig };
    }

    // Load local config file (highest priority)
    const localConfig = await this.loadConfigFile(this.localConfigFile);
    if (localConfig) {
      config = { ...config, ...localConfig };
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
      await fs.ensureDir(configDir);

      const defaultConfig = this.getDefaults();
      await fs.writeJson(this.defaultConfigFile, defaultConfig, { spaces: 2 });

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

    if (await fs.pathExists(this.defaultConfigFile)) active.push(this.defaultConfigFile);
    if (await fs.pathExists(this.globalConfigFile)) active.push(this.globalConfigFile);
    if (await fs.pathExists(this.localConfigFile)) active.push(this.localConfigFile);

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
    let projectConfig: Record<string, unknown> = {};
    let userConfig: Record<string, unknown> = {};
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

    // Helper to determine source
    const getSource = async (key: string, value: unknown): Promise<string> => {
      // Check environment variables first
      const envKey = `OLLAMA_${key.toUpperCase()}`;
      if (process.env[envKey] !== undefined) {
        return 'environment variable';
      }
      // Check project config
      if (projectConfig && projectConfig[key] !== undefined && projectConfig[key] === value) {
        return projectConfigPath;
      }
      // Check user config
      if (userConfig && userConfig[key] !== undefined && userConfig[key] === value) {
        return userConfigPath;
      }
      // Default
      return 'default';
    };

    // Get source for each config value
    const config = await this.getConfig();
    sources.model = await getSource('model', config.model);
    sources.host = await getSource('host', config.host);
    sources.verbose = await getSource('verbose', config.verbose);
    sources.interactive = await getSource('interactive', config.interactive);
    sources.debug = await getSource('debug', config.debug);
    sources.autoStage = await getSource('autoStage', config.autoStage);
    sources.autoModel = await getSource('autoModel', config.autoModel);
    sources.promptFile = await getSource('promptFile', config.promptFile);
    sources.promptTemplate = await getSource('promptTemplate', config.promptTemplate);
    sources.useEmojis = await getSource('useEmojis', config.useEmojis);

    // Handle nested timeouts
    const getNestedSource = async (path: string, value: unknown): Promise<string> => {
      // Check environment variables first
      const envKey = `OLLAMA_COMMIT_${path.toUpperCase().replace('.', '_')}`;
      if (process.env[envKey] !== undefined) {
        return 'environment variable';
      }

      // Helper to check if a config has the nested value
      const hasNestedValue = (config: Record<string, unknown>, parent: string, child: string, val: unknown): boolean => {
        return config[parent] !== undefined &&
               typeof config[parent] === 'object' &&
               config[parent] !== null &&
               (config[parent] as Record<string, unknown>)[child] === val;
      };

      const childKey = path.split('.')[1];
      if (!childKey) {
        return 'default';
      }

      // Check project config
      if (projectConfig && hasNestedValue(projectConfig, 'timeouts', childKey, value)) {
        return projectConfigPath;
      }

      // Check user config
      if (userConfig && hasNestedValue(userConfig, 'timeouts', childKey, value)) {
        return userConfigPath;
      }

      // Default
      return 'default';
    };

    sources.timeouts = {
      connection: await getNestedSource('timeouts.connection', config.timeouts.connection),
      generation: await getNestedSource('timeouts.generation', config.timeouts.generation),
      modelPull: await getNestedSource('timeouts.modelPull', config.timeouts.modelPull),
    };

    return sources;
  }
}

// Convenience function for getting config
export async function getConfig(): Promise<Readonly<OllamaCommitConfig>> {
  const configManager = ConfigManager.getInstance();
  await configManager.initialize();
  return configManager.getConfig();
}

// Convenience function for getting a specific config value
export async function getConfigValue<K extends keyof OllamaCommitConfig>(
  key: K,
): Promise<OllamaCommitConfig[K]> {
  const config = await getConfig();
  return config[key];
}
