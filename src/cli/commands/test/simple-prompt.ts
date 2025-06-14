import { Command } from 'commander';
import { TestCommand } from '../../../commands/test';
import { Logger } from '../../../utils/logger';
import { OllamaService } from '../../../core/ollama';

export const registerSimplePromptTest = (testCommand: Command) => {
  testCommand
    .command('simple-prompt')
    .description('Test simple prompt generation')
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
        await test.testSimplePrompt(options.host, options.model, options.verbose);
      } catch (error) {
        Logger.error('Test failed:', error);
        process.exit(1);
      }
    });
};
