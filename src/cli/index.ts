import { Command } from 'commander';
import { getConfig } from '../core/config';
import { ServiceFactory } from '../core/factory';
import { Logger } from '../utils/logger';
import { registerCommitCommand } from './commands/commit';
import { registerConfigCommands } from './commands/config';

import { VERSION } from '../generated/version';
import { registerTestCommands } from './commands/test';

const program = new Command();

program
  .name('ollama-git-commit')
  .description(
    'Enhanced Ollama Git Commit Message Generator - A CLI tool that generates meaningful commit messages using Ollama AI',
  )
  .version(VERSION);

// Create dependencies for commands
const logger = new Logger();
const serviceFactory = ServiceFactory.getInstance();

// Register all commands with dependencies
registerCommitCommand(program, {
  logger,
  serviceFactory,
  getConfig,
});
registerTestCommands(program, {
  getConfig,
  serviceFactory,
  logger,
});
registerConfigCommands(program, {
  logger,
  serviceFactory,
  getConfig,
});

// Error handling
process.on('uncaughtException', error => {
  Logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', reason => {
  Logger.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
