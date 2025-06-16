import { Command } from 'commander';
import { registerAllTests } from './all';
import { registerBenchmarkTest } from './benchmark';
import { registerConnectionTest } from './connection';
import { registerModelTest } from './model';
import { registerSimplePromptTest } from './simple-prompt';

export const registerTestCommands = (program: Command) => {
  const testCommand = program
    .command('test')
    .description('Run various tests on Ollama setup')
    .action(async (options, command) => {
      // Show help if no subcommand is provided
      if (!command.args.length) {
        command.outputHelp();
        return;
      }
    });

  // Register all test subcommands
  registerConnectionTest(testCommand);
  registerModelTest(testCommand);
  registerSimplePromptTest(testCommand);
  registerAllTests(testCommand);
  registerBenchmarkTest(testCommand);
};
