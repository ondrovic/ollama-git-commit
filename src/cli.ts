#!/usr/bin/env bun

import { parseArgs } from 'util';
import { CommitCommand } from './commands/commit';
import { TestCommand } from './commands/test';
import { ModelsCommand } from './commands/models';
import { ConfigManager } from './core/config';
import { Logger } from './utils/logger';
import { validateNodeVersion } from './utils/validation';

/*

  TODO: Remove the funny added message styling
  TODO: Check for staged, unstage, untracked files as well
  TODO: Check to make sure the prompt is being used correctly
  TODO: Interactive prompt
  TODO: Update Response to only include useful info
  TODO: Prompt examples
  TODO: Tests
  TODO: Remove dead code
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
  'config-init'?: boolean;
  'config-show'?: boolean;
  'config-debug'?: boolean;
  'debug-clipboard'?: boolean;
  'test-interactive'?: boolean;
}

// Show help message
function showHelp(): void {
  console.log(`🤖 Enhanced Ollama Git Commit Message Generator

Usage: ollama-commit [OPTIONS]

Options:
  -d, --directory          Directory to use
  -m, --model              Specify Ollama model
  -H, --host               Ollama server URL
  -v, --verbose            Show detailed output and processing info
  -n, --non-interactive    Skip confirmation prompt and display message only
  -p, --prompt             Custom prompt file path
  --auto-stage             Automatically stage all changes if no staged changes found
  --test                   Test connection to Ollama server
  --test-simple [model]    Test with a simple prompt to debug JSON issues
  --list-models            Show all available models on the server
  --auto-model             Automatically select the best available model
  --debug                  Enable debug mode with detailed logging
  -h, --help               Show this help

Configuration Commands:
  --config-init            Create default configuration file
  --config-show            Show current configuration and file locations
  --config-debug           Show detailed configuration debug information
  --debug-clipboard        Test all clipboard tools
  --test-interactive       Test interactive prompt functionality

Configuration Files (in order of priority):
  1. Local: ./.ollama-git-commit.json
  2. Global: ~/.ollama-git-commit.json  
  3. Default: ~/.config/ollama-git-commit/config.json

Environment Variables:
  OLLAMA_HOST                        Ollama server URL
  OLLAMA_COMMIT_MODEL                Default model to use
  OLLAMA_COMMIT_HOST                 Ollama server URL (overrides OLLAMA_HOST)
  OLLAMA_COMMIT_VERBOSE              Enable verbose output (true/false)
  OLLAMA_COMMIT_DEBUG                Enable debug mode (true/false)
  OLLAMA_COMMIT_AUTO_STAGE           Auto-stage changes (true/false)
  OLLAMA_COMMIT_AUTO_MODEL           Auto-select model (true/false)
  OLLAMA_COMMIT_PROMPT_FILE          Custom prompt file path
  OLLAMA_COMMIT_TIMEOUT_CONNECTION   Connection timeout (ms)
  OLLAMA_COMMIT_TIMEOUT_GENERATION   Generation timeout (ms)

Examples:
  ollama-commit                      # Use configuration defaults
  ollama-commit -v                   # Verbose output
  ollama-commit -n                   # Non-interactive mode
  ollama-commit -m codellama         # Override model
  ollama-commit --list-models        # Show available models
  ollama-commit --auto-model         # Auto-select best model
  ollama-commit --config-init        # Create default config file
  ollama-commit --config-show        # Show current configuration

Configuration File Format (.json):
{
  "model": "llama3.2:latest",
  "host": "http://localhost:11434", 
  "verbose": false,
  "interactive": true,
  "autoStage": false,
  "useEmojis": true,
  "promptTemplate": "default",
  "timeouts": {
    "connection": 10000,
    "generation": 120000,
    "modelPull": 300000
  }
}

Troubleshooting:
  If you get 'model not found' errors:
  1. Run: ollama-commit --list-models
  2. Install a model: ollama pull llama3.2
  3. Or use: ollama-commit --auto-model

  Configuration Issues:
  1. Run: ollama-commit --config-debug
  2. Check: ollama-commit --config-show
  3. Reset: ollama-commit --config-init

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
        directory: { type: 'string', short: 'd' },
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
        'config-init': { type: 'boolean' },
        'config-show': { type: 'boolean' },
        'config-debug': { type: 'boolean' },
        'debug-clipboard': { type: 'boolean' },
        'test-interactive': { type: 'boolean' },
      },
      allowPositionals: false,
    });

    // Check if directory is required (not needed for help or config commands)
    const needsDirectory =
      !values.help &&
      !values.test &&
      !values['list-models'] &&
      !values['test-simple'] &&
      !values['config-init'] &&
      !values['config-show'] &&
      !values['config-debug'] &&
      !values['debug-clipboard'] &&
      !values['test-interactive'];

    if (needsDirectory && !values.directory) {
      throw new Error('Directory (-d, --directory) is required. Use -h or --help for usage.');
    }

    return values as CliArgs;
  } catch (error: unknown) {
    if (typeof error === 'object' && error && 'message' in error) {
      Logger.error('Error parsing arguments:', (error as { message: string }).message);
    } else {
      Logger.error('Error parsing arguments:', String(error));
    }
    process.exit(1);
  }
}

// Show current configuration
async function showConfiguration(): Promise<void> {
  try {
    const configManager = ConfigManager.getInstance();
    const config = configManager.getConfig();
    const files = configManager.getConfigFiles();

    console.log('📋 Current Configuration:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Core settings
    console.log('🔧 Core Settings:');
    console.log(`   Model: ${config.model}`);
    console.log(`   Host: ${config.host}`);
    console.log(`   Prompt File: ${config.promptFile}`);
    console.log(`   Prompt Template: ${config.promptTemplate}`);
    console.log('');

    // Behavior settings
    console.log('⚙️  Behavior:');
    console.log(`   Verbose: ${config.verbose}`);
    console.log(`   Interactive: ${config.interactive}`);
    console.log(`   Debug: ${config.debug}`);
    console.log(`   Auto Stage: ${config.autoStage}`);
    console.log(`   Auto Model: ${config.autoModel}`);
    console.log(`   Use Emojis: ${config.useEmojis}`);
    console.log('');

    // Timeouts
    console.log('⏱️  Timeouts:');
    console.log(`   Connection: ${config.timeouts.connection}ms`);
    console.log(`   Generation: ${config.timeouts.generation}ms`);
    console.log(`   Model Pull: ${config.timeouts.modelPull}ms`);
    console.log('');

    // Configuration files
    console.log('📁 Configuration Files:');
    if (files.active.length > 0) {
      files.active.forEach((file, index) => {
        const priority = files.active.length - index;
        console.log(
          `   ${priority === files.active.length ? '🟢' : '🟡'} Priority ${priority}: ${file}`,
        );
      });
    } else {
      console.log('   ⚠️  No configuration files found');
      console.log('   💡 Run --config-init to create default configuration');
    }

    console.log('');
    console.log('📚 Available locations:');
    console.log(`   Local (highest priority): ${files.local}`);
    console.log(`   Global: ${files.global}`);
    console.log(`   Default (lowest priority): ${files.default}`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error: unknown) {
    if (typeof error === 'object' && error && 'message' in error) {
      Logger.error('Failed to show configuration:', (error as { message: string }).message);
    } else {
      Logger.error('Failed to show configuration:', String(error));
    }
    process.exit(1);
  }
}

// Show configuration debug information
async function showConfigurationDebug(): Promise<void> {
  try {
    const configManager = ConfigManager.getInstance();
    const debugInfo = configManager.getDebugInfo();

    console.log('🐛 Configuration Debug Information:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(debugInfo, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error: unknown) {
    if (typeof error === 'object' && error && 'message' in error) {
      Logger.error('Failed to show debug information:', (error as { message: string }).message);
    } else {
      Logger.error('Failed to show debug information:', String(error));
    }
    process.exit(1);
  }
}

// Test interactive prompt functionality
async function testInteractivePrompt(): Promise<void> {
  try {
    console.log('🧪 Testing interactive prompt functionality...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { InteractivePrompt, askYesNo, askCommitAction } = await import('./utils/interactive');

    // Test 1: Simple prompt
    console.log('\n1️⃣  Testing simple prompt...');
    const choice1 = await InteractivePrompt.prompt({
      message: 'Choose a test option:',
      choices: [
        { key: 'a', description: 'Option A' },
        { key: 'b', description: 'Option B' },
        { key: 'c', description: 'Option C' },
      ],
      defaultChoice: 'a',
    });
    console.log(`✅ You chose: ${choice1}`);

    // Test 2: Yes/No prompt
    console.log('\n2️⃣  Testing yes/no prompt...');
    const yesno = await askYesNo('Do you want to continue?', 'y');
    console.log(`✅ Yes/No result: ${yesno ? 'Yes' : 'No'}`);

    // Test 3: Commit action prompt
    console.log('\n3️⃣  Testing commit action prompt...');
    const action = await askCommitAction();
    console.log(`✅ Commit action: ${action}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Interactive prompt test completed successfully!');

    // Show runtime info
    // @ts-expect-error Bun is not defined in types
    const runtime = typeof Bun !== 'undefined' ? 'Bun' : 'Node.js';
    console.log(`🏃 Runtime: ${runtime}`);
    console.log(`🖥️  Platform: ${process.platform}`);
  } catch (error: unknown) {
    if (typeof error === 'object' && error && 'message' in error) {
      Logger.error('Interactive prompt test failed:', (error as { message: string }).message);
      if (Logger.isDebug() && 'stack' in error) {
        console.error((error as { stack?: string }).stack);
      }
    } else {
      Logger.error('Interactive prompt test failed:', String(error));
    }
    process.exit(1);
  }
}

// Initialize default configuration
async function initializeConfiguration(): Promise<void> {
  try {
    const configManager = ConfigManager.getInstance();
    await configManager.createDefaultConfig();

    console.log('');
    console.log('🎉 Configuration initialized successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Edit your config: nano ~/.config/ollama-git-commit/config.json');
    console.log('   2. View current settings: ollama-commit --config-show');
    console.log('   3. Test your setup: ollama-commit --test');
    console.log('');
    console.log('💡 Pro tips:');
    console.log('   • Create project-specific config: .ollama-git-commit.json');
    console.log('   • Use environment variables for sensitive data');
    console.log('   • Run --config-debug for troubleshooting');
  } catch (error: unknown) {
    if (typeof error === 'object' && error && 'message' in error) {
      Logger.error('Failed to initialize configuration:', (error as { message: string }).message);
    } else {
      Logger.error('Failed to initialize configuration:', String(error));
    }
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

    // Initialize logger with debug/verbose settings from config or CLI
    const configManager = ConfigManager.getInstance();
    const config = configManager.getConfig();

    // CLI args override config settings
    const verbose = args.verbose || config.verbose;
    const debug = args.debug || config.debug;

    Logger.setVerbose(verbose);
    Logger.setDebug(debug);

    // Handle configuration commands
    if (args['config-init']) {
      await initializeConfiguration();
      return;
    }

    if (args['config-show']) {
      await showConfiguration();
      return;
    }

    if (args['config-debug']) {
      await showConfigurationDebug();
      return;
    }

    if (args['debug-clipboard']) {
      console.log('🔍 Testing clipboard functionality...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      try {
        const { copyToClipboard, getClipboardCapabilities, hasClipboardSupport } = await import('./utils/clipboard');

        console.log(`🖥️  Platform: ${process.platform}`);
        console.log(`🪟 WSL detected: ${process.env.WSL_DISTRO_NAME || process.env.WSLENV ? 'Yes' : 'No'}`);
        console.log('🌐 Environment variables:');
        console.log(`   DISPLAY: ${process.env.DISPLAY || 'not set'}`);
        console.log(`   WAYLAND_DISPLAY: ${process.env.WAYLAND_DISPLAY || 'not set'}`);
        console.log(`   WSL_DISTRO_NAME: ${process.env.WSL_DISTRO_NAME || 'not set'}`);
        console.log(`   WSLENV: ${process.env.WSLENV || 'not set'}`);
        console.log('');

        // Test clipboard support
        console.log('📋 Testing clipboard support...');
        const hasSupport = await hasClipboardSupport();
        console.log(`   Has clipboard support: ${hasSupport ? '✅ Yes' : '❌ No'}`);

        // Test capabilities
        console.log('🔧 Testing clipboard capabilities...');
        const capabilities = await getClipboardCapabilities();
        if (capabilities.length > 0) {
          console.log('   Available tools:');
          capabilities.forEach(tool => console.log(`   ✅ ${tool}`));
        } else {
          console.log('   ❌ No clipboard tools found');
        }

        // Test actual copy
        console.log('');
        console.log('📝 Testing clipboard copy...');
        await copyToClipboard('Test clipboard content from ollama-commit debug');

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('💡 If clipboard failed, try:');
        console.log('   Linux: sudo apt install xclip');
        console.log('   WSL: Make sure xclip is installed or use clip.exe');
        console.log('   macOS: pbcopy should work by default');
        console.log('   Windows: clip should work by default');

      } catch (error: unknown) {
        Logger.error('Failed to test clipboard:', String(error));
        if (Logger.isDebug()) {
          console.error(String(error));
        }
      }
      return;
    }

    if (args['test-interactive']) {
      await testInteractivePrompt();
      return;
    }

    // Override config with CLI arguments for this session
    const sessionOverrides: Record<string, unknown> = {};
    if (args.model) sessionOverrides.model = args.model;
    if (args.host) sessionOverrides.host = args.host;
    if (args.verbose !== undefined) sessionOverrides.verbose = args.verbose;
    if (args.debug !== undefined) sessionOverrides.debug = args.debug;
    if (args['auto-stage'] !== undefined) sessionOverrides.autoStage = args['auto-stage'];
    if (args['auto-model'] !== undefined) sessionOverrides.autoModel = args['auto-model'];
    if (args.prompt) sessionOverrides.promptFile = args.prompt;

    if (Object.keys(sessionOverrides).length > 0) {
      configManager.override(sessionOverrides);
      if (debug) {
        Logger.debug('CLI overrides applied:', sessionOverrides);
      }
    }

    // Get final config after overrides
    const finalConfig = configManager.getConfig();

    // Handle special commands that don't need a directory
    if (args.test) {
      const testCmd = new TestCommand();
      const success = await testCmd.testConnection(finalConfig.host, verbose);
      process.exit(success ? 0 : 1);
    }

    if (args['list-models']) {
      const modelsCmd = new ModelsCommand();
      await modelsCmd.listModels(finalConfig.host);
      return;
    }

    if (args['test-simple'] !== undefined) {
      const testCmd = new TestCommand();
      const testModel = args['test-simple'] || finalConfig.model;
      const success = await testCmd.testSimplePrompt(finalConfig.host, testModel, verbose);
      process.exit(success ? 0 : 1);
    }

    // Handle main commit command
    const commitCmd = new CommitCommand(args.directory);
    await commitCmd.execute({
      model: finalConfig.model,
      host: finalConfig.host,
      verbose: finalConfig.verbose,
      interactive:
        args['non-interactive'] !== undefined ? !args['non-interactive'] : finalConfig.interactive,
      promptFile: finalConfig.promptFile,
      autoStage: finalConfig.autoStage,
      debug: finalConfig.debug,
      autoModel: finalConfig.autoModel,
      directory: args.directory,
    });
  } catch (error: unknown) {
    if (typeof error === 'object' && error && 'message' in error) {
      Logger.error('Fatal error:', (error as { message: string }).message);
      if (Logger.isDebug() && 'stack' in error) {
        console.error((error as { stack?: string }).stack);
      }
      // Provide helpful hints for common errors
      if ((error as { message: string }).message.includes('config')) {
        console.log('');
        console.log('💡 Configuration help:');
        console.log('   • Run: ollama-commit --config-show');
        console.log('   • Reset: ollama-commit --config-init');
        console.log('   • Debug: ollama-commit --config-debug');
      }
      if ((error as { message: string }).message.includes('connect') || (error as { message: string }).message.includes('Ollama')) {
        console.log('');
        console.log('💡 Connection help:');
        console.log('   • Test: ollama-commit --test');
        console.log('   • Check host: ollama-commit --config-show');
        console.log('   • List models: ollama-commit --list-models');
      }
    } else {
      Logger.error('Fatal error:', String(error));
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
process.on('uncaughtException', error => {
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
  main().catch(error => {
    Logger.error('Unhandled error:', error.message);
    process.exit(1);
  });
}
