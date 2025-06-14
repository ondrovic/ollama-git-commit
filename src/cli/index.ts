#!/usr/bin/env bun

import { Command } from 'commander';
import { Logger } from '../utils/logger';
import { registerCommitCommand } from './commands/commit';
import { registerTestCommands } from './commands/test';
import { registerListModelsCommand } from './commands/list-models';
import { registerConfigCommands } from './commands/config';

// Version info
export const VERSION = '1.0.0';

const program = new Command();

program
  .name('ollama-commit')
  .description(
    'Enhanced Ollama Git Commit Message Generator - A CLI tool that generates meaningful commit messages using Ollama AI',
  )
  .version(VERSION);

// Register all commands
registerCommitCommand(program);
registerTestCommands(program);
registerListModelsCommand(program);
registerConfigCommands(program);

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
