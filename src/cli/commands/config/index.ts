import { Command } from 'commander';
import { registerCreateCommands } from './create';
import { registerModelsCommands } from './models';
import { registerRemoveCommands } from './remove';
import { registerShowCommands } from './show';

export const registerConfigCommands = (program: Command) => {
  const configCommand = program.command('config').description('Manage configuration');

  // Register all config subcommands
  registerCreateCommands(configCommand);
  registerRemoveCommands(configCommand);
  registerShowCommands(configCommand);
  registerModelsCommands(configCommand);
};
