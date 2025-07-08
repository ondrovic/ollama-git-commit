import { Command } from 'commander';

export const registerAllTestCommand = (
  testCommand: Command,
  deps: {
    getConfig: () => Promise<Readonly<import('../../../types').OllamaCommitConfig>>;
    serviceFactory: import('../../../core/factory').ServiceFactory;
    logger: import('../../../utils/logger').Logger;
  },
) => {
  testCommand
    .command('all')
    .description('Run all tests')
    .option('-m, --model <model>', 'Model to use for testing (uses config model if not provided)')
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-v, --verbose', 'Show detailed output')
    .action(async options => {
      try {
        // Get model and host from options or config
        const config = await deps.getConfig();
        let modelToTest = options.model;
        if (!modelToTest) {
          modelToTest = config.model || 'llama3';
          deps.logger.info(`Using model from config: ${modelToTest}`);
        }

        const host = options.host || config.host || 'http://localhost:11434';

        // Create services using the factory
        const ollamaService = deps.serviceFactory.createOllamaService({
          verbose: options.verbose,
        });

        deps.logger.test('Running all tests...');

        // Test connection
        const connectionSuccess = await ollamaService.testConnection(host, options.verbose);
        if (!connectionSuccess) {
          deps.logger.error('Connection test failed');
          process.exit(1);
        }
        deps.logger.success('Connection test passed');

        // Test model availability
        const modelSuccess = await ollamaService.isModelAvailable(host, modelToTest);
        if (!modelSuccess) {
          deps.logger.error('Model availability test failed');
          process.exit(1);
        }
        deps.logger.success('Model availability test passed');

        // Test simple prompt
        const testPrompt = 'Write a commit message for: "Add new feature"';
        await ollamaService.generateCommitMessage(modelToTest, host, testPrompt, options.verbose);
        deps.logger.success('Simple prompt test passed');

        deps.logger.celebrate('All tests passed!');
      } catch (error) {
        deps.logger.error('All tests failed:', error);
        process.exit(1);
      }
    });
};
