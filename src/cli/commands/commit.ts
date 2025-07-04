import { Command } from 'commander';
import { CommitCommand } from '../../commands/commit';
import { ConfigManager } from '../../core/config';
import { Logger } from '../../utils/logger';
import { validateEnvironment } from '../../utils/validation';

export const registerCommitCommand = (program: Command) => {
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
    .action(async options => {
      try {
        const logger = new Logger();
        logger.setVerbose(options.verbose);
        logger.setDebug(options.debug);

        await validateEnvironment();

        const configManager = ConfigManager.getInstance(logger);
        await configManager.initialize();

        const commitCommand = new CommitCommand(
          options.directory,
          undefined,
          undefined,
          undefined,
          logger,
        );
        await commitCommand.execute({
          directory: options.directory,
          model: options.model,
          host: options.host,
          verbose: options.verbose,
          interactive: options.interactive,
          promptFile: options.promptFile,
          promptTemplate: options.promptTemplate,
          debug: options.debug,
          autoStage: options.autoStage,
          autoModel: options.autoModel,
          autoCommit: options.autoCommit,
        });
      } catch (error: unknown) {
        if (options.verbose) {
          Logger.error('Commit failed:', error);
        } else {
          if (error instanceof Error) {
            Logger.error('Commit failed:', error.message);
          } else {
            throw error;
          }
        }
        process.exit(1);
      }
    });
};
