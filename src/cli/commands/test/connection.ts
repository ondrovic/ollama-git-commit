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

        const success = await ollamaService.testConnection(options.host, options.verbose);
        if (success) {
          Logger.success('Connection test passed');
        } else {
          Logger.error('❌ Connection test failed');
          process.exit(1);
        }
      } catch (error) {
        Logger.error('Connection test failed:', error);
        process.exit(1);
      }
    });
};
