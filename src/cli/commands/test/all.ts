import { Command } from 'commander';
import { ConfigManager } from '../../../core/config';
import { ServiceFactory } from '../../../core/factory';
import { Logger } from '../../../utils/logger';

export const registerAllTestCommand = (testCommand: Command) => {
  testCommand
    .command('all')
    .description('Run all tests')
    .option('-m, --model <model>', 'Model to use for testing (uses config model if not provided)')
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

        Logger.info('🧪 Running all tests...');

        // Test connection
        const connectionSuccess = await ollamaService.testConnection(options.host, options.verbose);
        if (!connectionSuccess) {
          Logger.error('❌ Connection test failed');
          process.exit(1);
        }
        Logger.success('Connection test passed');

        // Test model availability
        const modelSuccess = await ollamaService.isModelAvailable(options.host, modelToTest);
        if (!modelSuccess) {
          Logger.error('❌ Model availability test failed');
          process.exit(1);
        }
        Logger.success('Model availability test passed');

        // Test simple prompt
        const testPrompt = 'Write a commit message for: "Add new feature"';
        await ollamaService.generateCommitMessage(
          modelToTest,
          options.host || 'http://localhost:11434',
          testPrompt,
          options.verbose,
        );
        Logger.success('Simple prompt test passed');

        Logger.success('🎉 All tests passed!');
      } catch (error) {
        Logger.error('All tests failed:', error);
        process.exit(1);
      }
    });
};
