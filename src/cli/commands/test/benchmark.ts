import { Command } from 'commander';
import stringWidth from 'string-width';
import { ServiceFactory } from '../../../core/factory';
import { Logger } from '../../../utils/logger';

export const registerBenchmarkTestCommand = (
  testCommand: Command,
  {
    getConfig,
    serviceFactory = ServiceFactory.getInstance(),
    logger = new Logger(),
  }: {
    getConfig: () => Promise<Readonly<import('../../../types').OllamaCommitConfig>>;
    serviceFactory?: typeof ServiceFactory.prototype;
    logger?: import('../../../utils/logger').Logger;
  },
) => {
  testCommand
    .command('benchmark')
    .description('Run performance benchmark tests')
    .option(
      '-m, --model <model>',
      'Model to use for benchmarking (uses config model if not provided)',
    )
    .option('-H, --host <host>', 'Ollama server URL')
    .option('-r, --runs <number>', 'Number of benchmark runs', '3')
    .option('-v, --verbose', 'Show detailed output')
    .action(async options => {
      try {
        // Get model from options or config
        let modelToTest = options.model;
        if (!modelToTest) {
          const config = await getConfig();
          modelToTest = config.model || 'llama3';
          logger.info(`Using model from config: ${modelToTest}`);
        }

        const iterations = parseInt(options.runs, 10);
        if (isNaN(iterations) || iterations < 1) {
          logger.error('Invalid number of runs. Must be a positive integer.');
          process.exit(1);
        }

        // Create services using the factory
        const ollamaService = serviceFactory.createOllamaService({
          verbose: options.verbose,
        });

        logger.sectionBox('🚀 Performance Benchmark', ['Ollama Model Tests'], {
          width: 80,
          style: 'single',
        });
        logger.plain('');
        logger.plain('Running benchmarks... ⏱️');
        logger.plain('');

        const times: number[] = [];
        const testPrompt = 'Write a commit message for: "Performance optimization"';

        // Collect test results first
        const testResults: string[] = [];
        let maxResultLineWidth = 0;
        for (let i = 0; i < iterations; i++) {
          try {
            const startTime = Date.now();
            const config = await getConfig();
            await ollamaService.generateCommitMessage(
              modelToTest,
              options.host || config.host || 'http://localhost:11434',
              testPrompt,
              options.verbose,
            );
            const duration = Date.now() - startTime;
            times.push(duration);
            const status = duration < 2000 ? 'PASS' : 'SLOW';
            const emoji = duration < 2000 ? '✅' : '⚠️';
            const resultLine = `Run ${i + 1}: ${duration}ms ${emoji} ${status}`;
            testResults.push(resultLine);
            if (resultLine.length > maxResultLineWidth) maxResultLineWidth = resultLine.length;
          } catch (error) {
            const resultLine = `Run ${i + 1}: ❌ FAILED - ${error}`;
            testResults.push(resultLine);
            if (resultLine.length > maxResultLineWidth) maxResultLineWidth = resultLine.length;
          }
        }

        // Calculate dynamic width for the box (with some padding)
        const boxWidth = Math.max(40, ...testResults.map(line => stringWidth(line))) + 4;

        // Display test results in a visually appealing box
        logger.sectionBox('Test Suite: Model Performance', testResults, {
          width: boxWidth,
          style: 'rounded',
        });

        logger.plain('');

        // Calculate and display results
        if (times.length > 0) {
          const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
          const minTime = Math.min(...times);
          const maxTime = Math.max(...times);
          const totalTime = times.reduce((a, b) => a + b, 0);
          const successRate = Math.round((times.length / iterations) * 100);

          // Calculate dynamic width for summary and info boxes
          const summaryLines = [
            `🏆 Best Performance:  ${minTime}ms (Run ${times.indexOf(minTime) + 1})`,
            `📊 Worst Performance: ${maxTime}ms (Run ${times.indexOf(maxTime) + 1})`,
            `⚡ Average Latency:   ${avgTime}ms`,
            `📈 Total Operations:  ${times.length}`,
            `⏰ Total Time:        ${totalTime}ms`,
            `🎯 Success Rate:      ${successRate}%`,
          ];
          const infoLines = [
            `Model: ${modelToTest}`,
            `Host:  ${options.host || 'http://localhost:11434'}`,
            `Runs:  ${iterations}`,
          ];
          const summaryBoxWidth = Math.max(40, ...summaryLines.map(line => stringWidth(line))) + 4;
          const infoBoxWidth = Math.max(40, ...infoLines.map(line => stringWidth(line))) + 4;

          logger.sectionBox('Performance Summary', summaryLines, {
            width: summaryBoxWidth,
            style: 'rounded',
          });

          logger.sectionBox('System Info', infoLines, { width: infoBoxWidth, style: 'rounded' });

          // Performance rating
          if (avgTime < 2000) {
            logger.rocket('Performance: Excellent (< 2s)');
          } else if (avgTime < 5000) {
            logger.success('Performance: Good (< 5s)');
          } else if (avgTime < 10000) {
            logger.warn('Performance: Slow (< 10s)');
          } else {
            logger.error('Performance: Very Slow (> 10s)');
          }
        } else {
          logger.error('No successful runs completed');
          process.exit(1);
        }
      } catch (error) {
        logger.error('Benchmark test failed:', error);
        process.exit(1);
      }
    });
};
