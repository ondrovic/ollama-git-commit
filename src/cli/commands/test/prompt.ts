import { Command } from 'commander';

export const registerPromptTestCommand = (
  testCommand: Command,
  deps: {
    getConfig: () => Promise<Readonly<import('../../../types').OllamaCommitConfig>>;
    serviceFactory: import('../../../core/factory').ServiceFactory;
    logger: import('../../../utils/logger').Logger;
  },
) => {
  testCommand
    .command('prompt')
    .description('Test custom prompt generation')
    .option('-m, --model <model>', 'Model to use for testing (uses config model if not provided)')
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-p, --prompt <prompt>', 'Custom prompt to test (defaults to "Test prompt")')
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

        deps.logger.test('Testing custom prompt...');

        // Run the prompt test
        const success = await testCommand.testPrompt(
          host,
          modelToTest,
          options.prompt,
          options.verbose,
        );

        if (!success) {
          deps.logger.error('Prompt test failed');
          process.exit(1);
        }

        deps.logger.success('Prompt test completed successfully');
      } catch (error) {
        deps.logger.error('Prompt test failed:', error);
        process.exit(1);
      }
    });
};
