import { Command } from 'commander';
import { ConfigManager } from '../../../core/config';
import { ServiceFactory } from '../../../core/factory';
import { Logger } from '../../../utils/logger';

export const registerPromptTestCommand = (testCommand: Command) => {
  testCommand
    .command('prompt')
    .description('Test custom prompt generation')
    .option('-m, --model <model>', 'Model to use for testing (uses config model if not provided)')
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-p, --prompt <prompt>', 'Custom prompt to test (defaults to "Test prompt")')
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

        // Create test command instance
        const { TestCommand } = await import('../../../commands/test');
        const testCommand = new TestCommand(ollamaService, Logger);

        Logger.test('Testing custom prompt...');

        // Run the prompt test
        const success = await testCommand.testPrompt(
          options.host,
          modelToTest,
          options.prompt,
          options.verbose,
        );

        if (!success) {
          Logger.error('Prompt test failed');
          process.exit(1);
        }

        Logger.success('Prompt test completed successfully');
      } catch (error) {
        Logger.error('Prompt test failed:', error);
        process.exit(1);
      }
    });
};
