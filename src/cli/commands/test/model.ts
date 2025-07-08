import { Command } from 'commander';

export const registerModelTestCommand = (
  testCommand: Command,
  deps: {
    getConfig: () => Promise<Readonly<import('../../../types').OllamaCommitConfig>>;
    serviceFactory: import('../../../core/factory').ServiceFactory;
    logger: import('../../../utils/logger').Logger;
  },
) => {
  testCommand
    .command('model')
    .description('Test specific model on Ollama server')
    .option('-m, --model <model>', 'Model name to test (uses config model if not provided)')
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

        const success = await ollamaService.isModelAvailable(host, modelToTest);
        if (success) {
          deps.logger.success(`Model ${modelToTest} is available`);
        } else {
          deps.logger.error(`Model '${modelToTest}' is not available`);
          process.exit(1);
        }
      } catch (error) {
        if (error instanceof Error) {
          deps.logger.error(`Error testing model: ${error.message}`);
        } else {
          deps.logger.error(`Error testing model: ${String(error)}`);
        }
        process.exit(1);
      }
    });
};
