import { Command } from 'commander';
import { ServiceFactory } from '../../../core/factory';
import { Logger } from '../../../utils/logger';

export const registerSimplePromptTestCommand = (testCommand: Command) => {
  testCommand
    .command('simple-prompt')
    .description('Test simple prompt generation')
    .option('-m, --model <model>', 'Model to use for testing')
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-v, --verbose', 'Show detailed output')
    .action(async options => {
      try {
        // Create services using the factory
        const factory = ServiceFactory.getInstance();
        const ollamaService = factory.createOllamaService({
          verbose: options.verbose,
        });

        const testPrompt = 'Write a simple commit message for: "Add new feature"';
        const message = await ollamaService.generateCommitMessage(
          options.model || 'llama3',
          options.host || 'http://localhost:11434',
          testPrompt,
          options.verbose,
        );

        Logger.success('✅ Simple prompt test passed');
        Logger.info(`Generated message: ${message}`);
      } catch (error) {
        Logger.error('Simple prompt test failed:', error);
        process.exit(1);
      }
    });
};
