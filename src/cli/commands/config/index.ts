import { Command } from 'commander';
import { registerCreateCommands } from './create';
import { registerKeysCommands } from './keys';
import { registerModelsCommands } from './models';
import { registerPromptsCommands } from './prompts';
import { registerRemoveCommands } from './remove';
import { registerSetCommands } from './set';
import { registerShowCommands } from './show';

export const registerConfigCommands = (program: Command) => {
  const configCommand = program.command('config').description('Manage configuration');

  // Register all config subcommands
  registerCreateCommands(configCommand);
  registerKeysCommands(configCommand);
  registerRemoveCommands(configCommand);
  registerSetCommands(configCommand);
  registerShowCommands(configCommand);
  registerModelsCommands(configCommand);
  registerPromptsCommands(configCommand);
};
