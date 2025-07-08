import { Command } from 'commander';
import { ConfigManager } from '../../../core/config';
import { ServiceFactory } from '../../../core/factory';
import { Logger } from '../../../utils/logger';

export const registerFullWorkflowTestCommand = (testCommand: Command) => {
  testCommand
    .command('full-workflow')
    .description('Run full workflow test (connection, model, and prompt generation)')
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

        // Create test command instance
        const { TestCommand } = await import('../../../commands/test');
        const testCommand = new TestCommand(ollamaService, Logger);

        // Run the full workflow test
        const success = await testCommand.testFullWorkflow(
          options.host,
          modelToTest,
          options.verbose,
        );

        if (!success) {
          Logger.error('Full workflow test failed');
          process.exit(1);
        }

        Logger.success('Full workflow test completed successfully');
      } catch (error) {
        Logger.error('Full workflow test failed:', error);
        process.exit(1);
      }
    });
};
