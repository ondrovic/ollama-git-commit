import { Command } from 'commander';
import fsExtra from 'fs-extra';
import { ConfigManager } from '../../../core/config';
import { Logger } from '../../../utils/logger';
import { getConfigFileInfo } from '../../utils/get-friendly-source';

export interface RemoveCommandsDeps {
  logger: Logger;
  serviceFactory: import('../../../core/factory').ServiceFactory;
  getConfig: () => Promise<Readonly<import('../../../types').OllamaCommitConfig>>;
}

export const registerRemoveCommands = (configCommand: Command, deps: RemoveCommandsDeps) => {
  const removeCommand = configCommand.command('remove').description('Remove configuration files');

  removeCommand
    .command('user')
    .description('Remove user configuration file')
    .action(async () => {
      try {
        const configManager = ConfigManager.getInstance(deps.logger);
        await configManager.initialize();
        const files = await configManager.getConfigFiles();
        const userConfigPath = files.user;

        try {
          await fsExtra.unlink(userConfigPath);
          const fileInfo = getConfigFileInfo(userConfigPath);
          deps.logger.success(`${fileInfo.label} configuration file removed: ${userConfigPath}`);
        } catch (error: unknown) {
          if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            deps.logger.info('No user configuration file found.');
          } else {
            throw error;
          }
        }
      } catch (error) {
        deps.logger.error('Failed to remove user configuration:', error);
        process.exit(1);
      }
    });

  removeCommand
    .command('local')
    .description('Remove local configuration file from current directory')
    .action(async () => {
      try {
        const configManager = ConfigManager.getInstance(deps.logger);
        await configManager.initialize();
        const files = await configManager.getConfigFiles();
        const projectConfigPath = files.local;

        try {
          await fsExtra.unlink(projectConfigPath);
          const fileInfo = getConfigFileInfo(projectConfigPath);
          deps.logger.success(`${fileInfo.label} configuration file removed: ${projectConfigPath}`);
        } catch (error: unknown) {
          if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            deps.logger.info('No local configuration file found in current directory.');
          } else {
            throw error;
          }
        }
      } catch (error) {
        deps.logger.error('Failed to remove local configuration:', error);
        process.exit(1);
      }
    });
};
