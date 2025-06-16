import { CONFIGURATIONS } from '@/constants/configurations';
import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { Logger } from '../../../utils/logger';

export const registerCreateCommands = (configCommand: Command) => {
  const createCommand = configCommand.command('create').description('Create configuration files');
  const defaultConfig = { ...CONFIGURATIONS.DEFAULT };

  createCommand
    .command('user')
    .description('Create user configuration file')
    .action(async () => {
      try {
        const configPath = path.join(os.homedir(), '.config', 'ollama-git-commit', 'config.json');
        defaultConfig.configFile = configPath;
        // Ensure directory exists
        await fs.mkdir(path.dirname(defaultConfig.configFile), { recursive: true });
        // Write config
        await fs.writeFile(defaultConfig.configFile, JSON.stringify(defaultConfig, null, 2));
        Logger.success(`User configuration file created at: ${defaultConfig.configFile}`);
      } catch (error) {
        Logger.error('Failed to create user configuration:', error);
        process.exit(1);
      }
    });

  createCommand
    .command('local')
    .description('Create local configuration file in current directory')
    .action(async () => {
      try {
        const configPath = path.join(process.cwd(), '.ollama-git-commit.json');
        defaultConfig.configFile = configPath;
        // Write config
        await fs.writeFile(defaultConfig.configFile, JSON.stringify(defaultConfig, null, 2));
        Logger.success(`Local configuration file created at: ${defaultConfig.configFile}`);
      } catch (error) {
        Logger.error('Failed to create local configuration:', error);
        process.exit(1);
      }
    });
};
