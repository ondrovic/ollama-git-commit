import { Command } from 'commander';
import { CommitCommand } from '../../commands/commit';
import { getConfig } from '../../core/config';
import { ServiceFactory } from '../../core/factory';
import { IConfigManager, ILogger } from '../../core/interfaces';
import { validateEnvironment } from '../../utils/validation';

export interface CommitCommandDeps {
  configManager?: IConfigManager;
  serviceFactory: ServiceFactory;
  logger: ILogger;
  getConfig: typeof getConfig;
}

export interface CommitActionOptions {
  directory: string;
  model?: string;
  host?: string;
  verbose?: boolean;
  interactive?: boolean;
  promptFile?: string;
  promptTemplate?: string;
  debug?: boolean;
  autoStage?: boolean;
  autoCommit?: boolean;
  autoModel?: boolean;
  quiet?: boolean;
}

export const executeCommitAction = async (
  options: CommitActionOptions,
  deps: CommitCommandDeps,
): Promise<void> => {
  const { logger, serviceFactory, getConfig: getConfigFn } = deps;

  try {
    // Validate environment before proceeding
    const validation = validateEnvironment(options.directory);
    if (!validation.valid) {
      logger.error('Environment validation failed:');
      validation.errors.forEach(error => logger.error(`  ${error}`));
      if (validation.warnings.length > 0) {
        logger.warn('Warnings:');
        validation.warnings.forEach(warning => logger.warn(`  ${warning}`));
      }
      throw new Error('Environment validation failed');
    }
    if (validation.warnings.length > 0) {
      logger.warn('Environment warnings:');
      validation.warnings.forEach(warning => logger.warn(`  ${warning}`));
    }

    // Create services using the injected factory
    const commandLogger = serviceFactory.createLogger({
      verbose: options.verbose,
    });
    const gitService = serviceFactory.createGitService({
      verbose: options.verbose,
      quiet: options.quiet,
    });
    const ollamaService = serviceFactory.createOllamaService({
      verbose: options.verbose,
    });
    const promptService = serviceFactory.createPromptService({
      verbose: options.verbose,
    });
    const configProvider = async () => await getConfigFn();

    const commitCommand = new CommitCommand(
      options.directory,
      gitService,
      ollamaService,
      promptService,
      commandLogger,
      configProvider,
    );

    await commitCommand.execute(options);
  } catch (error) {
    logger.error('Commit failed:', error);
    throw error;
  }
};

export const registerCommitCommand = (program: Command, deps: CommitCommandDeps) => {
  program
    .command('commit')
    .description('Generate a commit message using Ollama')
    .requiredOption('-d, --directory <dir>', 'Git repository directory')
    .option('-m, --model <model>', 'Ollama model to use')
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-v, --verbose', 'Show detailed output')
    .option('-i, --interactive', 'Interactive mode')
    .option('-p, --prompt-file <file>', 'Custom prompt file')
    .option('-t, --prompt-template <template>', 'Prompt template to use')
    .option('--debug', 'Enable debug mode')
    .option('--auto-stage', 'Automatically stage changes')
    .option('--auto-commit', 'Automatically commit changes and push to remote')
    .option('--auto-model', 'Automatically select model')
    .option('-q, --quiet', 'Suppress git command output')
    .action(async options => {
      const { logger, serviceFactory, getConfig: getConfigFn } = deps;

      try {
        await executeCommitAction(options, { logger, serviceFactory, getConfig: getConfigFn });
      } catch {
        process.exit(1);
      }
    });
};
