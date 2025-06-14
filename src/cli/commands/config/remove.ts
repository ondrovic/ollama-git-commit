import { Command } from 'commander';
import { ConfigManager } from '../../../core/config';
import { Logger } from '../../../utils/logger';
import { getConfigFileInfo } from '../../utils/get-friendly-source';
import fsExtra from 'fs-extra';

export const registerRemoveCommands = (configCommand: Command) => {
  const removeCommand = configCommand
    .command('remove')
    .description('Remove configuration files');

  removeCommand
    .command('user')
    .description('Remove user configuration file')
    .action(async () => {
      try {
        const configManager = ConfigManager.getInstance();
        await configManager.initialize();
        const files = await configManager.getConfigFiles();
        const userConfigPath = files.user;

        try {
          await fsExtra.unlink(userConfigPath);
          const fileInfo = getConfigFileInfo(userConfigPath);
          Logger.success(`${fileInfo.label} configuration file removed: ${userConfigPath}`);
        } catch (error: unknown) {
          if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            Logger.info('No user configuration file found.');
          } else {
            throw error;
          }
        }
      } catch (error) {
        Logger.error('Failed to remove user configuration:', error);
        process.exit(1);
      }
    });

  removeCommand
    .command('local')
    .description('Remove local configuration file from current directory')
    .action(async () => {
      try {
        const configManager = ConfigManager.getInstance();
        await configManager.initialize();
        const files = await configManager.getConfigFiles();
        const projectConfigPath = files.local;

        try {
          await fsExtra.unlink(projectConfigPath);
          const fileInfo = getConfigFileInfo(projectConfigPath);
          Logger.success(`${fileInfo.label} configuration file removed: ${projectConfigPath}`);
        } catch (error: unknown) {
          if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            Logger.info('No local configuration file found in current directory.');
          } else {
            throw error;
          }
        }
      } catch (error) {
        Logger.error('Failed to remove local configuration:', error);
        process.exit(1);
      }
    });
};
