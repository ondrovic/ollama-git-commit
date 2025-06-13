// src/core/config.ts
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
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

interface ConfigFileSchema {
  model?: string;
  host?: string;
  verbose?: boolean;
  interactive?: boolean;
  debug?: boolean;
  autoStage?: boolean;
  autoModel?: boolean;
  promptFile?: string;
  timeouts?: {
    connection?: number;
    generation?: number;
    modelPull?: number;
  };
  useEmojis?: boolean;
  promptTemplate?: 'default' | 'conventional' | 'simple' | 'detailed';
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: OllamaCommitConfig;
  private readonly defaultConfigFile: string;
  private readonly globalConfigFile: string;
  private readonly localConfigFile: string;

  private constructor() {
    // Define config file locations
    this.defaultConfigFile = join(homedir(), '.config', 'ollama-git-commit', 'config.json');
    this.globalConfigFile = join(homedir(), '.ollama-git-commit.json');
    this.localConfigFile = join(process.cwd(), '.ollama-git-commit.json');
    
    // Load configuration with hierarchy
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
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

  private loadConfig(): OllamaCommitConfig {
    const defaults = this.getDefaults();
    
    // Configuration hierarchy (highest priority first):
    // 1. Environment variables
    // 2. Local config file (.ollama-git-commit.json in current directory)
    // 3. Global config file (~/.ollama-git-commit.json)
    // 4. Default config file (~/.config/ollama-git-commit/config.json)
    // 5. Built-in defaults

    let config = { ...defaults };

    // Load default config file
    const defaultConfig = this.loadConfigFile(this.defaultConfigFile);
    if (defaultConfig) {
      config = { ...config, ...defaultConfig };
    }

    // Load global config file
    const globalConfig = this.loadConfigFile(this.globalConfigFile);
    if (globalConfig) {
      config = { ...config, ...globalConfig };
    }

    // Load local config file (highest priority)
    const localConfig = this.loadConfigFile(this.localConfigFile);
    if (localConfig) {
      config = { ...config, ...localConfig };
    }

    // Apply environment variables (highest priority)
    this.applyEnvironmentVariables(config);

    return config;
  }

  private loadConfigFile(filePath: string): Partial<OllamaCommitConfig> | null {
    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = readFileSync(filePath, 'utf8');
      const parsed: ConfigFileSchema = JSON.parse(content);
      
      // Validate and transform the config
      return this.validateAndTransformConfig(parsed, filePath);
    } catch (error: any) {
      Logger.warn(`Failed to load config file ${filePath}: ${error.message}`);
      return null;
    }
  }

  private validateAndTransformConfig(
    config: ConfigFileSchema, 
    filePath: string
  ): Partial<OllamaCommitConfig> | null {
    try {
      const result: Partial<OllamaCommitConfig> = {};

      // Validate and copy each field
      if (config.model && typeof config.model === 'string') {
        result.model = config.model;
      }

      if (config.host && typeof config.host === 'string') {
        // Validate URL format
        try {
          new URL(config.host);
          result.host = config.host;
        } catch {
          Logger.warn(`Invalid host URL in ${filePath}: ${config.host}`);
        }
      }

      // Boolean fields
      if (typeof config.verbose === 'boolean') result.verbose = config.verbose;
      if (typeof config.interactive === 'boolean') result.interactive = config.interactive;
      if (typeof config.debug === 'boolean') result.debug = config.debug;
      if (typeof config.autoStage === 'boolean') result.autoStage = config.autoStage;
      if (typeof config.autoModel === 'boolean') result.autoModel = config.autoModel;
      if (typeof config.useEmojis === 'boolean') result.useEmojis = config.useEmojis;

      // File paths
      if (config.promptFile && typeof config.promptFile === 'string') {
        result.promptFile = config.promptFile.replace('~', homedir());
      }

      // Timeouts
      if (config.timeouts && typeof config.timeouts === 'object') {
        result.timeouts = {
          connection: typeof config.timeouts.connection === 'number' ? config.timeouts.connection : this.getDefaults().timeouts.connection,
          generation: typeof config.timeouts.generation === 'number' ? config.timeouts.generation : this.getDefaults().timeouts.generation,
          modelPull: typeof config.timeouts.modelPull === 'number' ? config.timeouts.modelPull : this.getDefaults().timeouts.modelPull,
        };
      }

      // Prompt template
      if (config.promptTemplate && 
          ['default', 'conventional', 'simple', 'detailed'].includes(config.promptTemplate)) {
        result.promptTemplate = config.promptTemplate;
      }

      return result;
    } catch (error: any) {
      Logger.warn(`Invalid config format in ${filePath}: ${error.message}`);
      return null;
    }
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
  getConfig(): Readonly<OllamaCommitConfig> {
    return { ...this.config };
  }

  get<K extends keyof OllamaCommitConfig>(key: K): OllamaCommitConfig[K] {
    return this.config[key];
  }

  // Override config for current session (doesn't persist)
  override(overrides: Partial<OllamaCommitConfig>): void {
    this.config = { ...this.config, ...overrides };
  }

  // Create default config file
  async createDefaultConfig(): Promise<void> {
    const configDir = dirname(this.defaultConfigFile);
    
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }

    const defaultConfig: ConfigFileSchema = {
      model: 'llama3.2:latest',
      host: 'http://localhost:11434',
      verbose: false,
      interactive: true,
      debug: false,
      autoStage: false,
      autoModel: false,
      useEmojis: true,
      promptTemplate: 'default',
      timeouts: {
        connection: 10000,
        generation: 120000,
        modelPull: 300000,
      },
    };

    try {
      writeFileSync(
        this.defaultConfigFile, 
        JSON.stringify(defaultConfig, null, 2), 
        'utf8'
      );
      Logger.success(`Created default config file: ${this.defaultConfigFile}`);
    } catch (error: any) {
      throw new Error(`Failed to create config file: ${error.message}`);
    }
  }

  // Get config file locations for CLI info
  getConfigFiles(): {
    default: string;
    global: string;
    local: string;
    active: string[];
  } {
    const active: string[] = [];
    
    if (existsSync(this.defaultConfigFile)) active.push(this.defaultConfigFile);
    if (existsSync(this.globalConfigFile)) active.push(this.globalConfigFile);
    if (existsSync(this.localConfigFile)) active.push(this.localConfigFile);

    return {
      default: this.defaultConfigFile,
      global: this.globalConfigFile,
      local: this.localConfigFile,
      active,
    };
  }

  // Reload configuration
  reload(): void {
    this.config = this.loadConfig();
  }

  // Debug info
  getDebugInfo(): Record<string, any> {
    const files = this.getConfigFiles();
    
    return {
      configFiles: files,
      currentConfig: this.config,
      environmentVariables: {
        OLLAMA_HOST: process.env.OLLAMA_HOST,
        OLLAMA_COMMIT_MODEL: process.env.OLLAMA_COMMIT_MODEL,
        OLLAMA_COMMIT_HOST: process.env.OLLAMA_COMMIT_HOST,
        OLLAMA_COMMIT_VERBOSE: process.env.OLLAMA_COMMIT_VERBOSE,
        OLLAMA_COMMIT_DEBUG: process.env.OLLAMA_COMMIT_DEBUG,
      },
    };
  }
}

// Convenience function for getting config
export function getConfig(): Readonly<OllamaCommitConfig> {
  return ConfigManager.getInstance().getConfig();
}

// Convenience function for getting a specific config value
export function getConfigValue<K extends keyof OllamaCommitConfig>(
  key: K
): OllamaCommitConfig[K] {
  return ConfigManager.getInstance().get(key);
}