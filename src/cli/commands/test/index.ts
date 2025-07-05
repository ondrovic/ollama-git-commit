import { Command } from 'commander';
import { registerAllTestCommand } from './all';
import { registerBenchmarkTestCommand } from './benchmark';
import { registerConnectionTestCommand } from './connection';
import { registerModelTestCommand } from './model';
import { registerSimplePromptTestCommand } from './simple-prompt';

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
  registerConnectionTestCommand(testCommand);
  registerModelTestCommand(testCommand);
  registerSimplePromptTestCommand(testCommand);
  registerAllTestCommand(testCommand);
  registerBenchmarkTestCommand(testCommand);
};
