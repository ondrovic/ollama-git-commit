import { Command } from 'commander';
import { registerCreateCommands } from './create';
import { registerKeysCommands } from './keys';
import { registerModelsCommands } from './models';
import { registerPromptsCommands } from './prompts';
import { registerRemoveCommands } from './remove';
import { registerSetCommands } from './set';
import { registerShowCommands } from './show';

export interface ConfigCommandsDeps {
  logger: import('../../../utils/logger').Logger;
  serviceFactory: import('../../../core/factory').ServiceFactory;
  getConfig: () => Promise<Readonly<import('../../../types').OllamaCommitConfig>>;
}

export const registerConfigCommands = (program: Command, deps: ConfigCommandsDeps) => {
  const configCommand = program.command('config').description('Manage configuration');

  // Register all config subcommands with dependencies
  registerCreateCommands(configCommand, deps);
  registerKeysCommands(configCommand, deps);
  registerRemoveCommands(configCommand, deps);
  registerSetCommands(configCommand, deps);
  registerShowCommands(configCommand, deps);
  registerModelsCommands(configCommand, deps);
  registerPromptsCommands(configCommand, deps);
};
