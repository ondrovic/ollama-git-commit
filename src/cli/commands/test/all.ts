import { Command } from 'commander';
import { TestCommand } from '../../../commands/test';
import { OllamaService } from '../../../core/ollama';
import { Logger } from '../../../utils/logger';

export const registerAllTests = (testCommand: Command) => {
  testCommand
    .command('all')
    .description('Run all tests')
    .option('-m, --model <model>', 'Model to test')
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-v, --verbose', 'Show detailed output')
    .action(async options => {
      const logger = new Logger();
      logger.setVerbose(options.verbose);
      logger.setDebug(options.verbose);
      try {
        const ollamaService = new OllamaService(logger);
        const test = new TestCommand(ollamaService, logger);
        await test.testAll(options.model, options.host, options.verbose);
      } catch (error) {
        Logger.error('Test failed:', error);
        process.exit(1);
      }
    });
};
