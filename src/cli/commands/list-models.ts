import { Command } from 'commander';
import { ModelsCommand } from '../../commands/models';
import { ServiceFactory } from '../../core/factory';
import { Logger } from '../../utils/logger';

export const registerListModelsCommand = (program: Command) => {
  program
    .command('list-models')
    .description('Show all available models on the server')
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-v, --verbose', 'Show detailed output')
    .action(async options => {
      try {
        // Create services using the factory
        const factory = ServiceFactory.getInstance();
        const logger = factory.createLogger({
          verbose: options.verbose,
        });
        const ollamaService = factory.createOllamaService({
          verbose: options.verbose,
        });

        const modelsCommand = new ModelsCommand(ollamaService, logger);
        await modelsCommand.listModels(options.host, options.verbose);
      } catch (error) {
        Logger.error('List models failed:', error);
        process.exit(1);
      }
    });
};
