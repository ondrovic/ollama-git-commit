import { Command } from 'commander';

export const registerConnectionTestCommand = (
  testCommand: Command,
  deps: {
    getConfig: () => Promise<Readonly<import('../../../types').OllamaCommitConfig>>;
    serviceFactory: import('../../../core/factory').ServiceFactory;
    logger: import('../../../utils/logger').Logger;
  },
) => {
  testCommand
    .command('connection')
    .description('Test connection to Ollama server')
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-v, --verbose', 'Show detailed output')
    .action(async options => {
      try {
        // Get config for host
        const config = await deps.getConfig();
        const host = options.host || config.host || 'http://localhost:11434';

        // Create services using the factory
        const ollamaService = deps.serviceFactory.createOllamaService({
          verbose: options.verbose,
        });

        // Create test command instance to use the fixed verbose logging
        const { TestCommand } = await import('../../../commands/test');
        const testCommandInstance = new TestCommand(ollamaService, deps.logger);

        const success = await testCommandInstance.testConnection(host, options.verbose);
        if (success) {
          deps.logger.success('Connection test passed');
        } else {
          deps.logger.error('Connection test failed');
          process.exit(1);
        }
      } catch (error) {
        deps.logger.error('Connection test failed:', error);
        process.exit(1);
      }
    });
};
