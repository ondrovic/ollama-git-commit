import { Command } from 'commander';
import { ConfigManager } from '../../../core/config';
import { ServiceFactory } from '../../../core/factory';
import { Logger } from '../../../utils/logger';

export const registerModelTestCommand = (testCommand: Command) => {
  testCommand
    .command('model')
    .description('Test specific model on Ollama server')
    .option('-m, --model <model>', 'Model name to test (uses config model if not provided)')
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-v, --verbose', 'Show detailed output')
    .action(async options => {
      try {
        // Get model from options or config
        let modelToTest = options.model;
        if (!modelToTest) {
          const configManager = ConfigManager.getInstance();
          await configManager.initialize();
          modelToTest = await configManager.getPrimaryModel();
          Logger.info(`Using model from config: ${modelToTest}`);
        }

        // Create services using the factory
        const factory = ServiceFactory.getInstance();
        const ollamaService = factory.createOllamaService({
          verbose: options.verbose,
        });

        const success = await ollamaService.isModelAvailable(options.host, modelToTest);
        if (success) {
          Logger.success(`Model ${modelToTest} is available`);
        } else {
          Logger.error(`Model '${modelToTest}' is not available`);
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
