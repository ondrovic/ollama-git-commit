import { Command } from 'commander';
import { ServiceFactory } from '../../../core/factory';
import { Logger } from '../../../utils/logger';

export const registerModelTestCommand = (testCommand: Command) => {
  testCommand
    .command('model')
    .description('Test specific model on Ollama server')
    .requiredOption('-m, --model <model>', 'Model name to test')
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-v, --verbose', 'Show detailed output')
    .action(async options => {
      try {
        // Create services using the factory
        const factory = ServiceFactory.getInstance();
        const ollamaService = factory.createOllamaService({
          verbose: options.verbose,
        });

        const success = await ollamaService.isModelAvailable(options.host, options.model);
        if (success) {
          Logger.success(`Model ${options.model} is available`);
        } else {
          Logger.error(`Model '${options.model}' is not available`);
          process.exit(1);
        }
      } catch (error) {
        if (error instanceof Error) {
          Logger.error(`Error testing model: ${error.message}`);
        } else {
          Logger.error(`Error testing model: ${String(error)}`);
        }
        process.exit(1);
      }
    });
};
