import { Command } from 'commander';

export const registerSimplePromptTestCommand = (
  testCommand: Command,
  deps: {
    getConfig: () => Promise<Readonly<import('../../../types').OllamaCommitConfig>>;
    serviceFactory: import('../../../core/factory').ServiceFactory;
    logger: import('../../../utils/logger').Logger;
  },
) => {
  testCommand
    .command('simple-prompt')
    .description('Test simple prompt generation')
    .option('-m, --model <model>', 'Model to use for testing')
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-v, --verbose', 'Show detailed output')
    .action(async options => {
      try {
        // Get model and host from config
        const config = await deps.getConfig();
        const model = options.model || config.model || 'llama3';
        const host = options.host || config.host || 'http://localhost:11434';

        // Create services using the factory
        const ollamaService = deps.serviceFactory.createOllamaService({
          verbose: options.verbose,
        });

        const testPrompt = 'Write a simple commit message for: "Add new feature"';
        const message = await ollamaService.generateCommitMessage(
          model,
          host,
          testPrompt,
          options.verbose,
        );

        deps.logger.success('Simple prompt test passed');
        deps.logger.plain(`Generated message: ${message}`);
      } catch (error) {
        deps.logger.error('Simple prompt test failed:', error);
        process.exit(1);
      }
    });
};
