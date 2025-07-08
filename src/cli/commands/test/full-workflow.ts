import { Command } from 'commander';

export const registerFullWorkflowTestCommand = (
  testCommand: Command,
  deps: {
    getConfig: () => Promise<Readonly<import('../../../types').OllamaCommitConfig>>;
    serviceFactory: import('../../../core/factory').ServiceFactory;
    logger: import('../../../utils/logger').Logger;
  },
) => {
  testCommand
    .command('full-workflow')
    .description('Run full workflow test (connection, model, and prompt generation)')
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

        // Create test command instance
        const { TestCommand } = await import('../../../commands/test');
        const testCommand = new TestCommand(ollamaService, deps.logger);

        // Run the full workflow test
        const success = await testCommand.testFullWorkflow(host, modelToTest, options.verbose);

        if (!success) {
          deps.logger.error('Full workflow test failed');
          process.exit(1);
        }

        deps.logger.success('Full workflow test completed successfully');
      } catch (error) {
        deps.logger.error('Full workflow test failed:', error);
        process.exit(1);
      }
    });
};
