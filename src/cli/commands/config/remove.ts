import { Command } from 'commander';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { Logger } from '../../../utils/logger';

export const registerRemoveCommands = (configCommand: Command) => {
  const removeCommand = configCommand
    .command('remove')
    .description('Remove configuration files');

  removeCommand
    .command('user')
    .description('Remove user configuration file')
    .action(async () => {
      try {
        const userConfigPath = path.join(os.homedir(), '.config', 'ollama-git-commit', 'config.json');

        try {
          await fs.access(userConfigPath);
          await fs.unlink(userConfigPath);
          Logger.success(`User configuration file removed: ${userConfigPath}`);
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
    .command('project')
    .description('Remove project configuration file from current directory')
    .action(async () => {
      try {
        const projectConfigPath = path.join(process.cwd(), '.ollama-git-commit.json');

        try {
          await fs.access(projectConfigPath);
          await fs.unlink(projectConfigPath);
          Logger.success(`Project configuration file removed: ${projectConfigPath}`);
        } catch (error: unknown) {
          if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            Logger.info('No project configuration file found in current directory.');
          } else {
            throw error;
          }
        }
      } catch (error) {
        Logger.error('Failed to remove project configuration:', error);
        process.exit(1);
      }
    });
};
