import { Command } from 'commander';
import { ModelsCommand } from '../../commands/models';
import { ConfigManager } from '../../core/config';
import { Logger } from '../../utils/logger';

export const registerListModelsCommand = (program: Command) => {
  program
    .command('list-models')
    .description('Show all available models on the server')
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-v, --verbose', 'Show detailed output')
    .action(async options => {
      const logger = new Logger();
      logger.setVerbose(options.verbose);
      try {
        const configManager = ConfigManager.getInstance(logger);
        await configManager.initialize();
        const modelsCommand = new ModelsCommand(logger);
        await modelsCommand.listModels(options.host, options.verbose);
      } catch (error) {
        Logger.error('List models failed:', error);
        process.exit(1);
      }
    });
};
