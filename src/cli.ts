#!/usr/bin/env bun

import { parseArgs } from 'util';
import { CommitCommand } from './commands/commit';
import { TestCommand } from './commands/test';
import { ModelsCommand } from './commands/models';
import { Logger } from './utils/logger';
import { validateNodeVersion } from './utils/validation';

/*

  TODO: Remove the funny added message styling
  TODO: Check for staged, unstage, untracked files as well
  TODO: Check to make sure the prompt is being used correctly
  TODO: Update Response to only include useful info 
  
*/

interface CliArgs {
  directory: string;
  model?: string;
  host?: string;
  verbose?: boolean;
  'non-interactive'?: boolean;
  prompt?: string;
  'auto-stage'?: boolean;
  debug?: boolean;
  help?: boolean;
  test?: boolean;
  'list-models'?: boolean;
  'auto-model'?: boolean;
  'test-simple'?: string;
}

// Show help message
function showHelp(): void {
  console.log(`🤖 Enhanced Ollama Git Commit Message Generator

Usage: ollama-commit [OPTIONS]

Options:
  -d, --directory          Directory to use
  -m, --model              Specify Ollama model (default: mistral:7b-instruct)
  -H, --host               Ollama server URL (default: $OLLAMA_HOST or http://192.168.0.3:11434)
  -v, --verbose            Show detailed output and processing info
  -n, --non-interactive    Skip confirmation prompt and display message only
  -p, --prompt             Custom prompt file path (default: ~/.config/prompts/ollama-commit-prompt.txt)
  --auto-stage             Automatically stage all changes if no staged changes found
  --test                   Test connection to Ollama server
  --test-simple [model]    Test with a simple prompt to debug JSON issues
  --list-models            Show all available models on the server
  --auto-model             Automatically select the best available model
  --debug                  Enable debug mode with detailed logging
  -h, --help               Show this help

Examples:
  ollama-commit                    # Use defaults with confirmation
  ollama-commit -v                 # Verbose output
  ollama-commit -n                 # Non-interactive mode
  ollama-commit -m codellama       # Use CodeLlama model
  ollama-commit --list-models      # Show available models
  ollama-commit --auto-model       # Auto-select best model

Troubleshooting:
  If you get 'model not found' errors:
  1. Run: ollama-commit --list-models
  2. Install a model: ollama pull llama3.2
  3. Or use: ollama-commit --auto-model

This tool generates detailed, meaningful commit messages using Ollama.
It analyzes your staged changes and creates informative commit messages
following conventional commit format with emojis and detailed descriptions.`);
}

// Parse CLI arguments
function parseCliArgs(): CliArgs {
  try {
    const { values } = parseArgs({
      args: process.argv.slice(2),
      options: {
      directory: {type: 'string', short: 'd'},
      model: { type: 'string', short: 'm' },
      host: { type: 'string', short: 'H' },
      verbose: { type: 'boolean', short: 'v' },
      'non-interactive': { type: 'boolean', short: 'n' },
      prompt: { type: 'string', short: 'p' },
      'auto-stage': { type: 'boolean' },
      debug: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      test: { type: 'boolean' },
      'list-models': { type: 'boolean' },
      'auto-model': { type: 'boolean' },
      'test-simple': { type: 'string' },
      },
      allowPositionals: false,
    });

    if (!values.directory && !values.help && !values.test && !values['list-models'] && !values['test-simple']) {
      throw new Error('Directory (-d, --directory) is required');
    }

    return values as CliArgs;
  } catch (error: any) {
    Logger.error('Error parsing arguments:', error.message);
    process.exit(1);
  }
}

// Main CLI function
async function main(): Promise<void> {
  try {
    // Validate Node version
    validateNodeVersion();

    const args = parseCliArgs();
    
    // Handle help
    if (args.help) {
      showHelp();
      return;
    }

    // Initialize logger with debug/verbose settings
    Logger.setVerbose(args.verbose || false);
    Logger.setDebug(args.debug || false);

    // Handle special commands
    if (args.test) {
      const testCmd = new TestCommand();
      const success = await testCmd.testConnection(args.host, args.verbose);
      process.exit(success ? 0 : 1);
    }

    if (args['list-models']) {
      const modelsCmd = new ModelsCommand();
      await modelsCmd.listModels(args.host);
      return;
    }

    if (args['test-simple'] !== undefined) {
      const testCmd = new TestCommand();
      const testModel = args['test-simple'] || args.model || 'mistral:7b-instruct';
      const success = await testCmd.testSimplePrompt(args.host, testModel, args.verbose);
      process.exit(success ? 0 : 1);
    }

    // Handle main commit command
    const commitCmd = new CommitCommand(args.directory);
    await commitCmd.execute({
      model: args.model,
      host: args.host,
      verbose: args.verbose,
      interactive: !(args['non-interactive']),
      promptFile: args.prompt,
      autoStage: args['auto-stage'],
      debug: args.debug,
      autoModel: args['auto-model'],
      directory: args.directory,
    });

  } catch (error: any) {
    Logger.error('Fatal error:', error.message);
    if (Logger.isDebug()) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught exception:', error.message);
  if (Logger.isDebug()) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    Logger.error('Unhandled error:', error.message);
    process.exit(1);
  });
}