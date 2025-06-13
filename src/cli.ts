#!/usr/bin/env bun

import { Command } from 'commander';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { CommitCommand } from './commands/commit';
import { TestCommand } from './commands/test';
import { ModelsCommand } from './commands/models';
import { ConfigManager } from './core/config';
import { Logger } from './utils/logger';
import { validateNodeVersion, validateEnvironment } from './utils/validation';

const program = new Command();

program
  .name('ollama-commit')
  .description('Enhanced Ollama Git Commit Message Generator - A CLI tool that generates meaningful commit messages using Ollama AI')
  .version('1.0.0');

// Main commit command
program
  .command('commit')
  .description('Generate a commit message using Ollama')
  .option('-d, --directory <dir>', 'Git repository directory')
  .option('-m, --model <model>', 'Ollama model to use')
  .option('-H, --host <host>', 'Ollama server URL')
  .option('-v, --verbose', 'Show detailed output')
  .option('-i, --interactive', 'Interactive mode')
  .option('-p, --prompt-file <file>', 'Custom prompt file')
  .option('--debug', 'Enable debug mode')
  .option('--auto-stage', 'Automatically stage changes')
  .option('--auto-model', 'Automatically select model')
  .action(async (options) => {
    try {
      await validateNodeVersion();
      await validateEnvironment();

      const configManager = ConfigManager.getInstance();
      await configManager.initialize();

      const commitCommand = new CommitCommand(options.directory);
      await commitCommand.execute({
        directory: options.directory,
        model: options.model,
        host: options.host,
        verbose: options.verbose,
        interactive: options.interactive,
        promptFile: options.promptFile,
        debug: options.debug,
        autoStage: options.autoStage,
        autoModel: options.autoModel,
      });
    } catch (error) {
      Logger.error('Commit failed:', error);
      process.exit(1);
    }
  });

// Test commands
const testCommand = program
  .command('test')
  .description('Run various tests on Ollama setup');

// Test connection subcommand
testCommand
  .command('connection')
  .description('Test connection to Ollama server')
  .option('-H, --host <host>', 'Ollama server URL')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    try {
      const test = new TestCommand();
      await test.testConnection(options.host, options.verbose);
    } catch (error) {
      Logger.error('Test failed:', error);
      process.exit(1);
    }
  });

// Test model subcommand
testCommand
  .command('model')
  .description('Test specific model on Ollama server')
  .option('-m, --model <model>', 'Model to test')
  .option('-H, --host <host>', 'Ollama server URL')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    try {
      const test = new TestCommand();
      await test.testModel(options.model, options.host, options.verbose);
    } catch (error) {
      Logger.error('Test failed:', error);
      process.exit(1);
    }
  });

// Test simple prompt subcommand
testCommand
  .command('simple-prompt')
  .description('Test simple prompt generation')
  .option('-m, --model <model>', 'Model to test')
  .option('-H, --host <host>', 'Ollama server URL')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    try {
      const test = new TestCommand();
      await test.testSimplePrompt(options.host, options.model, options.verbose);
    } catch (error) {
      Logger.error('Test failed:', error);
      process.exit(1);
    }
  });

// Test all subcommand
testCommand
  .command('all')
  .description('Run all tests')
  .option('-m, --model <model>', 'Model to test')
  .option('-H, --host <host>', 'Ollama server URL')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    try {
      const test = new TestCommand();
      await test.testAll(options.model, options.host, options.verbose);
    } catch (error) {
      Logger.error('Test failed:', error);
      process.exit(1);
    }
  });

// Test benchmark subcommand
testCommand
  .command('benchmark')
  .description('Benchmark model performance')
  .option('-m, --model <model>', 'Model to benchmark')
  .option('-H, --host <host>', 'Ollama server URL')
  .option('-i, --iterations <number>', 'Number of iterations', '3')
  .action(async (options) => {
    try {
      const test = new TestCommand();
      await test.benchmarkModel(options.model, options.host, parseInt(options.iterations));
    } catch (error) {
      Logger.error('Test failed:', error);
      process.exit(1);
    }
  });

// List models command
program
  .command('list-models')
  .description('Show all available models on the server')
  .option('-H, --host <host>', 'Ollama server URL')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options) => {
    try {
      const configManager = ConfigManager.getInstance();
      await configManager.initialize();
      const modelsCommand = new ModelsCommand();
      await modelsCommand.listModels(options.host, options.verbose);
    } catch (error) {
      Logger.error('List models failed:', error);
      process.exit(1);
    }
  });

// Configuration commands
const configCommand = program
  .command('config')
  .description('Manage configuration settings');

// Init subcommands
const initCommand = configCommand
  .command('init')
  .description('Initialize configuration files');

initCommand
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

initCommand
  .command('project')
  .description('Create project configuration file in current directory')
  .action(async () => {
    try {
      const projectConfigPath = path.join(process.cwd(), '.ollama-git-commit.json');
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
      await fs.writeFile(projectConfigPath, JSON.stringify(defaultConfig, null, 2));
      Logger.success(`Project configuration file created at: ${projectConfigPath}`);
    } catch (error) {
      Logger.error('Failed to create project configuration:', error);
      process.exit(1);
    }
  });

// Remove subcommands
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

// Helper to get friendly source name
const getFriendlySource = (source: string): string => {
  if (!source) return 'DEFAULT';
  if (source === 'environment variable') return 'ENV';
  if (source === 'default') return 'DEFAULT';

  // Normalize path separators for Windows
  const normalizedSource = source.replace(/\\/g, '/');

  // Check for project config
  if (normalizedSource.includes('.ollama-git-commit.json')) return 'Project';

  // Check for user config
  if (normalizedSource.includes('.config/ollama-git-commit')) return 'User';

  // If we get a full path, try to determine if it's Project or User
  const currentDir = process.cwd().replace(/\\/g, '/');
  if (normalizedSource.includes(currentDir)) return 'Project';

  // Check for user config in home directory
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir && normalizedSource.includes(homeDir.replace(/\\/g, '/'))) {
    if (normalizedSource.includes('.config/ollama-git-commit')) return 'User';
  }

  return source;
};

// Config show command
configCommand
  .command('show')
  .description('Show current configuration')
  .action(async () => {
    try {
      const configManager = ConfigManager.getInstance();
      await configManager.initialize();
      await configManager.reload();
      const config = await configManager.getConfig();
      const files = await configManager.getConfigFiles();
      const configSources = await configManager.getConfigSources();

      console.log('Current Configuration:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Show active config files
      console.log('Config Files (in order of precedence):');
      files.active.forEach((file, index) => {
        const prefix = index === 0 ? '   → ' : '     ';
        const type = file.includes('.ollama-git-commit.json') ? 'Project' : 'User';
        console.log(`${prefix}${type} - ${file}`);
      });
      console.log('');

      // Core Settings
      console.log('Core Settings:');
      console.log(`   Model: ${config.model} (from ${getFriendlySource(configSources.model)})`);
      console.log(`   Host: ${config.host} (from ${getFriendlySource(configSources.host)})`);
      console.log(`   Prompt File: ${config.promptFile} (from ${getFriendlySource(configSources.promptFile)})`);
      console.log(`   Prompt Template: ${config.promptTemplate} (from ${getFriendlySource(configSources.promptTemplate)})`);
      console.log('');

      // Behavior Settings
      console.log('Behavior Settings:');
      console.log(`   Verbose: ${config.verbose} (from ${getFriendlySource(configSources.verbose)})`);
      console.log(`   Interactive: ${config.interactive} (from ${getFriendlySource(configSources.interactive)})`);
      console.log(`   Debug: ${config.debug} (from ${getFriendlySource(configSources.debug)})`);
      console.log(`   Auto Stage: ${config.autoStage} (from ${getFriendlySource(configSources.autoStage)})`);
      console.log(`   Auto Model: ${config.autoModel} (from ${getFriendlySource(configSources.autoModel)})`);
      console.log(`   Use Emojis: ${config.useEmojis} (from ${getFriendlySource(configSources.useEmojis)})`);
      console.log('');

      // Timeouts
      console.log('Timeouts (ms):');
      console.log(`   Connection: ${config.timeouts.connection}ms (from ${getFriendlySource(configSources.timeouts.connection)})`);
      console.log(`   Generation: ${config.timeouts.generation}ms (from ${getFriendlySource(configSources.timeouts.generation)})`);
      console.log(`   Model Pull: ${config.timeouts.modelPull}ms (from ${getFriendlySource(configSources.timeouts.modelPull)})`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error) {
      Logger.error('Failed to show configuration:', error);
      process.exit(1);
    }
  });

configCommand
  .command('debug')
  .description('Show detailed configuration debug information')
  .action(async () => {
    try {
      console.log('Starting config-debug...');
      const configManager = ConfigManager.getInstance();
      console.log('ConfigManager instance created');
      await configManager.initialize();
      console.log('ConfigManager initialized');
      const debugInfo = await configManager.getDebugInfo();
      console.log('Debug info retrieved');
      console.log(JSON.stringify(debugInfo, null, 2));
    } catch (error) {
      Logger.error('Failed to get debug information:', error);
      process.exit(1);
    }
  });

// Error handling
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
