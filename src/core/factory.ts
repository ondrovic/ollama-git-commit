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
}

export class ServiceFactory {
  private static instance: ServiceFactory;
  private config: OllamaCommitConfig | null = null;

  private constructor() {}

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
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
    const logger = options.logger || new Logger();

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

    return new GitService(directory, logger, quiet);
  }

  /**
   * Create an OllamaService with consistent configuration
   */
  createOllamaService(options: ServiceFactoryOptions = {}): IOllamaService {
    const logger = this.createLogger(options);
    const quiet = options.quiet ?? false;
    const spinner = new Spinner();

    return new OllamaService(logger, spinner, quiet);
  }

  /**
   * Create a PromptService with consistent configuration
   */
  createPromptService(options: ServiceFactoryOptions = {}): IPromptService {
    const logger = this.createLogger(options);
    const quiet = options.quiet ?? false;
    const contextService = this.createContextService(options);

    return new PromptService(logger, quiet, contextService);
  }

  /**
   * Create a ContextService with consistent configuration
   */
  createContextService(options: ServiceFactoryOptions = {}): ContextService {
    const logger = this.createLogger(options);
    const quiet = options.quiet ?? false;

    return new ContextService(logger, quiet);
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
