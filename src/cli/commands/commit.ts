import { Command } from 'commander';
import { CommitCommand } from '../../commands/commit';
import { ServiceFactory } from '../../core/factory';
import { getConfig } from '../../core/config';
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
    .option('-q, --quiet', 'Suppress git command output')
    .action(async options => {
      try {
        // Validate environment before proceeding
        validateEnvironment();

        // Create services using the factory
        const factory = ServiceFactory.getInstance();
        const logger = factory.createLogger({
          verbose: options.verbose,
        });
        const gitService = factory.createGitService({
          verbose: options.verbose,
          quiet: options.quiet,
        });
        const ollamaService = factory.createOllamaService({
          verbose: options.verbose,
        });
        const promptService = factory.createPromptService({
          verbose: options.verbose,
        });
        const configProvider = async () => await getConfig();

        const commitCommand = new CommitCommand(
          options.directory,
          gitService,
          ollamaService,
          promptService,
          logger,
          configProvider,
        );

        await commitCommand.execute(options);
      } catch (error) {
        Logger.error('Commit failed:', error);
        process.exit(1);
      }
    });
};
