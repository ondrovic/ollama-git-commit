import { Command } from 'commander';
import { TestCommand } from '../../../commands/test';
import { Logger } from '../../../utils/logger';
import { getConfig } from '../../../core/config';
import { OllamaService } from '../../../core/ollama';

export const registerConnectionTest = (testCommand: Command) => {
  testCommand
    .command('connection')
    .description('Test connection to Ollama server')
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-v, --verbose', 'Show detailed output')
    .action(async options => {
      const logger = new Logger();
      logger.setVerbose(options.verbose);
      logger.setDebug(options.verbose);

      try {
        const config = await getConfig();
        const ollamaService = new OllamaService(logger);
        const test = new TestCommand(ollamaService, logger);
        const success = await test.testConnection(options.host, options.verbose);
        if (success) {
          logger.success(
            `Successfully connected to Ollama server at ${options.host || config.host}`,
          );
        }
      } catch (error) {
        Logger.error('Test failed:', error);
        process.exit(1);
      }
    });
};
