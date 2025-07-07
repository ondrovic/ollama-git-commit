import { Command } from 'commander';
import { ServiceFactory } from '../../../core/factory';
import { Logger } from '../../../utils/logger';

export const registerConnectionTestCommand = (testCommand: Command) => {
  testCommand
    .command('connection')
    .description('Test connection to Ollama server')
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-v, --verbose', 'Show detailed output')
    .action(async options => {
      try {
        // Create services using the factory
        const factory = ServiceFactory.getInstance();
        const ollamaService = factory.createOllamaService({
          verbose: options.verbose,
        });

        // Create test command instance to use the fixed verbose logging
        const { TestCommand } = await import('../../../commands/test');
        const testCommandInstance = new TestCommand(ollamaService, Logger);

        const success = await testCommandInstance.testConnection(options.host, options.verbose);
        if (success) {
          Logger.success('Connection test passed');
        } else {
          Logger.error('Connection test failed');
          process.exit(1);
        }
      } catch (error) {
        Logger.error('Connection test failed:', error);
        process.exit(1);
      }
    });
};
