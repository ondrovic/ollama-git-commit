// import { homedir } from 'os';
// import { join } from 'path';
import { GitService, GitCommandError, GitNoChangesError, GitRepositoryError } from '../core/git';
import { OllamaService } from '../core/ollama';
import { PromptService } from '../core/prompt';
import { Logger } from '../utils/logger';
import { validateGitRepository } from '../utils/validation';
import { askCommitAction } from '../utils/interactive';
import { copyToClipboard } from '../utils/clipboard';
import { ModelsCommand } from './models';
import { TestCommand } from './test';
import type { CommitConfig } from '../index';
import { getConfig } from '../core/config';

interface CommitOptions {
  directory: string;
  model?: string;
  host?: string;
  verbose?: boolean;
  interactive?: boolean;
  promptFile?: string;
  debug?: boolean;
  autoStage?: boolean;
  autoModel?: boolean;
}

export class CommitCommand {
  private gitService: GitService;
  private ollamaService: OllamaService;
  private promptService: PromptService;
  private modelsCommand: ModelsCommand;
  private testCommand: TestCommand;

  constructor(directory: string = process.cwd()) {
    this.gitService = new GitService(directory);
    this.ollamaService = new OllamaService();
    this.promptService = new PromptService();
    this.modelsCommand = new ModelsCommand();
    this.testCommand = new TestCommand();
  }

  async execute(options: CommitOptions): Promise<void> {
    // Set up configuration with defaults
    const config = this.buildConfig(options);

    Logger.debug('Configuration:', config);

    // Validate environment
    validateGitRepository(options.directory);

    // Test Ollama connection
    if (config.verbose || config.debug) {
      Logger.info(`Testing connection to ${config.host}...`);
    }

    if (!(await this.testCommand.testConnection(config.host, config.verbose))) {
      throw new Error('Failed to connect to Ollama');
    }

    // Handle auto-model selection
    if (config.autoModel) {
      const autoModel = await this.modelsCommand.getDefaultModel(config.host, true);
      if (autoModel) {
        config.model = autoModel;
        Logger.info(`Auto-selected model: ${autoModel}`);
      } else {
        throw new Error('No suitable model found');
      }
    }

    // Run simple test if in debug mode
    if (config.debug) {
      Logger.info('Running simple prompt test...');
      if (!(await this.testCommand.testSimplePrompt(config.host, config.model))) {
        throw new Error(
          `Simple test failed - there may be issues with the Ollama setup. Try: ollama pull ${config.model}`,
        );
      }
      Logger.success('Simple test passed');
    }

    // Setup system prompt
    const systemPrompt = this.promptService.getSystemPrompt(config.promptFile, config.verbose);

    // Helper function to determine if an error should be retried
    function isRetryableError(error: Error): boolean {
      // Non-retryable errors (permanent states)
      if (error instanceof GitNoChangesError || error instanceof GitRepositoryError) {
        return false;
      }

      // Retryable errors (temporary issues)
      if (error instanceof GitCommandError) {
        return true;
      }

      // For Ollama errors, check message content for specific cases
      const errorMessage = error.message.toLowerCase();

      // Non-retryable Ollama errors
      if (
        errorMessage.includes('empty response') ||
        errorMessage.includes('model not found') ||
        errorMessage.includes('invalid model')
      ) {
        return false;
      }

      // Retryable Ollama errors (connection, timeout, etc.)
      if (
        errorMessage.includes('failed to connect') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('http')
      ) {
        return true;
      }

      // For unknown errors, don't retry to fail fast
      return false;
    }

    // Generate commit message with retries
    async function generateMessage(): Promise<string> {
      const maxErrorRetries = 3;
      let errorRetryCount = 0;

      while (errorRetryCount < maxErrorRetries) {
        try {
          // Get git changes
          const gitChanges = this.gitService.getChanges(config.verbose, config.autoStage);

          if (config.verbose) {
            Logger.info('Analysis complete, generating commit message...');
          }

          // Build enhanced prompt
          const fullPrompt = this.promptService.buildCommitPrompt(
            gitChanges.filesInfo,
            gitChanges.diff,
            systemPrompt,
          );

          // Call Ollama API
          const response = await this.ollamaService.generateCommitMessage(
            config.model,
            config.host,
            fullPrompt,
            config.verbose,
          );

          // Parse response
          const message = this.ollamaService.parseResponse(
            response,
            config.verbose,
            config.model,
            config.host,
          );

          return message;
        } catch (error: unknown) {
          // Check if this error should be retried
          if (!isRetryableError(error as Error)) {
            // Non-retryable error - handle immediately and exit
            if (error instanceof GitNoChangesError || error instanceof GitRepositoryError) {
              console.log(`ℹ️  ${error.message}`);
              process.exit(0);
            } else {
              // These are actual non-retryable errors
              throw error;
            }
          }

          // This is a retryable error
          errorRetryCount++;
          if (typeof error === 'object' && error && 'message' in error) {
            Logger.error(`❌ Failed on attempt ${errorRetryCount}: ${(error as { message: string }).message}`);
          } else {
            Logger.error(`❌ Failed on attempt ${errorRetryCount}: ${String(error)}`);
          }

          if (errorRetryCount >= maxErrorRetries) {
            Logger.error(`❌ Maximum error retries (${maxErrorRetries}) reached. Giving up.`);
            throw error;
          }

          if (config.verbose) {
            Logger.info(`Retrying... (${errorRetryCount}/${maxErrorRetries})`);
            Logger.debug(`Error type: ${error.constructor.name} (retryable)`);
          }

          // Add backoff delay for retryable errors
          const delay = Math.min(1000 * Math.pow(2, errorRetryCount - 1), 5000);
          if (config.verbose) {
            Logger.info(`Waiting ${delay}ms before retry...`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw new Error(`Failed to generate commit message after ${maxErrorRetries} attempts`);
    }

    // Main user interaction loop - completely separate from error handling
    while (true) {
      // Generate message (with its own error handling)
      const message = await generateMessage.call(this);

      // Display result and handle user interaction
      const displayResult = await this.displayCommitResult(message, config.interactive);

      if (displayResult === 2) {
        // User requested regeneration - continue loop
        if (config.verbose) {
          Logger.info('Regenerating commit message...');
        }
        continue; // Generate a new message
      } else if (displayResult === 0) {
        // Success - user accepted the message
        break;
      } else {
        // User cancelled (displayResult === 1)
        Logger.info('Operation cancelled by user');
        break;
      }
    }
  }

  private async displayCommitResult(message: string, interactive: boolean): Promise<number> {
    console.log('');
    Logger.success('Generated commit message:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(message);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    if (interactive) {
      try {
        const action = await askCommitAction();
        let result: number;

        switch (action) {
          case 'use': {
            console.log('');
            console.log('📋 Copy and run this command:');
            const escapedMessage = message.replace(/"/g, '\\"');
            console.log(`git commit -m "${escapedMessage}"`);
            result = 0;
            break;
          }
          case 'copy': {
            await copyToClipboard(message);
            result = 0;
            break;
          }
          case 'regenerate': {
            result = 2;
            break;
          }
          case 'cancel': {
            result = 1;
            break;
          }
          default: {
            result = 1;
            break;
          }
        }
        return result;
      } catch (error: unknown) {
        if (typeof error === 'object' && error && 'message' in error) {
          Logger.error('Interactive prompt failed:', (error as { message: string }).message);
        } else {
          Logger.error('Interactive prompt failed:', String(error));
        }
        Logger.info('Falling back to non-interactive mode');

        // Fallback to non-interactive behavior
        console.log('📋 To commit with this message, run:');
        const escapedMessage = message.replace(/"/g, '\\"');
        console.log(`git commit -m "${escapedMessage}"`);
        console.log('');
        return 0;
      }
    } else {
      console.log('📋 To commit with this message, run:');
      const escapedMessage = message.replace(/"/g, '\\"');
      console.log(`git commit -m "${escapedMessage}"`);
      console.log('');
      return 0;
    }
  }

  private buildConfig(options: CommitOptions): Required<CommitConfig> {
    // Get base config from the config system
    const baseConfig = getConfig();

    // Override with CLI options (CLI options take highest priority)
    return {
      model: options.model || baseConfig.model,
      host: options.host || baseConfig.host,
      verbose: options.verbose || baseConfig.verbose,
      interactive: options.interactive !== undefined ? options.interactive : baseConfig.interactive,
      promptFile: options.promptFile || baseConfig.promptFile,
      debug: options.debug || baseConfig.debug,
      autoStage: options.autoStage || baseConfig.autoStage,
      autoModel: options.autoModel || baseConfig.autoModel,
    };
  }
}
