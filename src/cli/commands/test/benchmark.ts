import { Command } from 'commander';
import { ServiceFactory } from '../../../core/factory';
import { Logger } from '../../../utils/logger';

export const registerBenchmarkTestCommand = (testCommand: Command) => {
  testCommand
    .command('benchmark')
    .description('Run performance benchmark tests')
    .option('-m, --model <model>', 'Model to use for benchmarking')
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-v, --verbose', 'Show detailed output')
    .action(async options => {
      try {
        // Create services using the factory
        const factory = ServiceFactory.getInstance();
        const ollamaService = factory.createOllamaService({
          verbose: options.verbose,
        });

        Logger.info('🚀 Starting benchmark tests...');

        const startTime = Date.now();
        const testPrompt = 'Write a commit message for: "Performance optimization"';

        await ollamaService.generateCommitMessage(
          options.model || 'llama3',
          options.host || 'http://localhost:11434',
          testPrompt,
          options.verbose,
        );

        const endTime = Date.now();
        const duration = endTime - startTime;

        Logger.success(`Benchmark completed in ${duration}ms`);
      } catch (error) {
        Logger.error('Benchmark test failed:', error);
        process.exit(1);
      }
    });
};
