import { Command } from 'commander';
import { TestCommand } from '../../../commands/test';
import { Logger } from '../../../utils/logger';

export const registerBenchmarkTest = (testCommand: Command) => {
  testCommand
    .command('benchmark')
    .description('Benchmark model performance')
    .option('-m, --model <model>', 'Model to benchmark')
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-i, --iterations <number>', 'Number of iterations', '3')
    .action(async options => {
      const logger = new Logger();
      logger.setVerbose(options.verbose);
      logger.setDebug(options.verbose);
      try {
        const test = new TestCommand(undefined, logger);
        await test.benchmarkModel(options.model, options.host, parseInt(options.iterations));
      } catch (error) {
        Logger.error('Test failed:', error);
        process.exit(1);
      }
    });
};
