import fsExtra from 'fs-extra';
import type { OllamaCommitConfig } from '../types';
import { Logger } from '../utils/logger';
import { Spinner } from '../utils/spinner';
import { ConfigManager, getConfig } from './config';
import { ContextService } from './context';
import { GitService } from './git';
import { IGitService, ILogger, IOllamaService, IPromptService } from './interfaces';
import { OllamaService } from './ollama';
import { PromptService } from './prompt';

export interface ServiceFactoryOptions {
  directory?: string;
  quiet?: boolean;
  verbose?: boolean;
  debug?: boolean;
  logger?: ILogger;
  deps?: Partial<ServiceFactoryDeps>;
}

export interface ServiceFactoryDeps {
  fs?: typeof fsExtra;
  path?: typeof import('path');
  os?: typeof import('os');
  spawn?: typeof import('child_process').spawn;
  logger?: ILogger;
  spinner?: typeof import('../utils/spinner').Spinner;
  fetch?: typeof fetch;
  config?: OllamaCommitConfig;
}

export class ServiceFactory {
  private static instance: ServiceFactory;
  private config: OllamaCommitConfig | null = null;
  private deps: Partial<ServiceFactoryDeps>;

  private constructor(deps: Partial<ServiceFactoryDeps> = {}) {
    this.deps = deps;
  }

  static getInstance(deps: Partial<ServiceFactoryDeps> = {}): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory(deps);
    }
    return ServiceFactory.instance;
  }

  /**
   * Initialize the factory with configuration
   */
  async initialize(_options: ServiceFactoryOptions = {}): Promise<void> {
    const config = await getConfig();
    this.config = config;
  }

  /**
   * Create a logger with consistent configuration
   */
  createLogger(options: ServiceFactoryOptions = {}): ILogger {
    const logger = options.logger || this.deps.logger || new Logger();

    if (options.verbose !== undefined) {
      logger.setVerbose(options.verbose);
    }

    if (options.debug !== undefined) {
      logger.setDebug(options.debug);
    }

    return logger;
  }

  /**
   * Create a GitService with consistent configuration
   */
  createGitService(options: ServiceFactoryOptions = {}): IGitService {
    const logger = this.createLogger(options);
    const directory = options.directory || process.cwd();
    const quiet = options.quiet ?? false;
    const fs = this.deps.fs;
    const path = this.deps.path;
    const os = this.deps.os;
    const spawn = this.deps.spawn;
    return new GitService(directory, logger, quiet, { fs, path, os, spawn });
  }

  /**
   * Create an OllamaService with consistent configuration
   */
  createOllamaService(options: ServiceFactoryOptions = {}): IOllamaService {
    const logger = this.createLogger(options);
    const quiet = options.quiet ?? false;
    const spinner = this.deps.spinner ? new this.deps.spinner() : new Spinner();
    return new OllamaService(logger, spinner, quiet, {
      fetch: this.deps.fetch,
      config: this.deps.config,
      logger,
      spinner,
    });
  }

  /**
   * Create a PromptService with consistent configuration
   */
  createPromptService(options: ServiceFactoryOptions = {}): IPromptService {
    const logger = this.createLogger(options);
    const quiet = options.quiet ?? false;
    const contextService = this.createContextService(options);
    return new PromptService(logger, quiet, contextService, {
      fs: this.deps.fs || fsExtra,
      path: this.deps.path ? { dirname: this.deps.path.dirname } : undefined,
    });
  }

  /**
   * Create a ContextService with consistent configuration
   */
  createContextService(options: ServiceFactoryOptions = {}): ContextService {
    const logger = this.createLogger(options);
    const quiet = options.quiet ?? false;
    // Pass only relevant deps to ContextService (do not pass fs)
    return new ContextService(
      {
        logger,
        path: this.deps.path,
        os: this.deps.os,
        spawn: this.deps.spawn,
      },
      quiet,
    );
  }

  /**
   * Create a ConfigManager with consistent configuration
   */
  createConfigManager(options: ServiceFactoryOptions = {}): ConfigManager {
    const logger = this.createLogger(options);
    return ConfigManager.getInstance(logger);
  }

  /**
   * Create all services needed for the commit command
   */
  async createCommitServices(options: ServiceFactoryOptions = {}): Promise<{
    logger: ILogger;
    gitService: IGitService;
    ollamaService: IOllamaService;
    promptService: IPromptService;
    configManager: ConfigManager;
  }> {
    await this.initialize(options);

    const logger = this.createLogger(options);
    const gitService = this.createGitService(options);
    const ollamaService = this.createOllamaService(options);
    const promptService = this.createPromptService(options);
    const configManager = this.createConfigManager(options);

    return {
      logger,
      gitService,
      ollamaService,
      promptService,
      configManager,
    };
  }

  /**
   * Create services for testing with mocks
   */
  createTestServices(options: ServiceFactoryOptions = {}): {
    logger: ILogger;
    gitService: IGitService;
    ollamaService: IOllamaService;
    promptService: IPromptService;
  } {
    const logger = this.createLogger(options);
    const gitService = this.createGitService(options);
    const ollamaService = this.createOllamaService(options);
    const promptService = this.createPromptService(options);

    return {
      logger,
      gitService,
      ollamaService,
      promptService,
    };
  }
}
