import { Command } from 'commander';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { Logger } from '../../../utils/logger';

export const registerCreateCommands = (configCommand: Command) => {
  const createCommand = configCommand
    .command('create')
    .description('Create configuration files');

  createCommand
    .command('user')
    .description('Create user configuration file')
    .action(async () => {
      try {
        const userConfigPath = path.join(os.homedir(), '.config', 'ollama-git-commit', 'config.json');
        const defaultConfig = {
          model: 'mistral:7b-instruct',
          host: '0.0.0.0:11434',
          verbose: false,
          interactive: true,
          debug: false,
          autoStage: false,
          autoModel: false,
          promptFile: path.join(os.homedir(), '.config', 'ollama-git-commit', 'prompt.txt'),
          configFile: userConfigPath,
          timeouts: {
            connection: 10000,
            generation: 120000,
            modelPull: 300000,
          },
          useEmojis: false,
          promptTemplate: 'default',
        };
        // Ensure directory exists
        await fs.mkdir(path.dirname(userConfigPath), { recursive: true });
        // Write config
        await fs.writeFile(userConfigPath, JSON.stringify(defaultConfig, null, 2));
        Logger.success(`User configuration file created at: ${userConfigPath}`);
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
        const localConfigPath = path.join(process.cwd(), '.ollama-git-commit.json');
        const defaultConfig = {
          model: 'mistral:7b-instruct',
          host: '0.0.0.0:11434',
          verbose: false,
          interactive: true,
          debug: false,
          autoStage: false,
          autoModel: false,
          timeouts: {
            connection: 10000,
            generation: 120000,
            modelPull: 300000,
          },
          useEmojis: false,
          promptTemplate: 'default',
        };
        // Write config
        await fs.writeFile(localConfigPath, JSON.stringify(defaultConfig, null, 2));
        Logger.success(`Local configuration file created at: ${localConfigPath}`);
      } catch (error) {
        Logger.error('Failed to create local configuration:', error);
        process.exit(1);
      }
    });
};
