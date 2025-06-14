import { Command } from 'commander';
import { registerConnectionTest } from './connection';
import { registerModelTest } from './model';
import { registerSimplePromptTest } from './simple-prompt';
import { registerAllTests } from './all';
import { registerBenchmarkTest } from './benchmark';

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
