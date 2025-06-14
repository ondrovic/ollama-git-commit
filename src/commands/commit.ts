import { homedir } from 'os';
import { join } from 'path';
import { GitService, GitCommandError, GitNoChangesError, GitRepositoryError } from '../core/git';
import { OllamaService } from '../core/ollama';
import { PromptService } from '../core/prompt';
import { Logger } from '../utils/logger';
import { validateGitRepository } from '../utils/validation';
import { copyToClipboard } from '../utils/clipboard';
import { ModelsCommand } from './models';
import { TestCommand } from './test';
import type { CommitConfig } from '../index';

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
        throw new Error(`Simple test failed - there may be issues with the Ollama setup. Try: ollama pull ${config.model}`);
      }
      Logger.success('Simple test passed');
    }

    // Setup system prompt
    const systemPrompt = this.promptService.getSystemPrompt(config.promptFile, config.verbose);

    // Helper function to determine if an error should be retried
    function isRetryableError(error: Error): boolean {
      // Non-retryable errors (permanent states)
      if (error instanceof GitNoChangesError ||
        error instanceof GitRepositoryError) {
        return false;
      }

      // Retryable errors (temporary issues)
      if (error instanceof GitCommandError) {
        return true;
      }

      // For Ollama errors, check message content for specific cases
      const errorMessage = error.message.toLowerCase();

      // Non-retryable Ollama errors
      if (errorMessage.includes('empty response') ||
        errorMessage.includes('model not found') ||
        errorMessage.includes('invalid model')) {
        return false;
      }

      // Retryable Ollama errors (connection, timeout, etc.)
      if (errorMessage.includes('failed to connect') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('http')) {
        return true;
      }

      // For unknown errors, don't retry to fail fast
      return false;
    }

    // Main generation loop
    const maxErrorRetries = 3;
    let errorRetryCount = 0;

    try {
      while (true) { // Continue until user accepts, cancels, or we hit max error retries
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
            systemPrompt
          );

          // Call Ollama API
          const response = await this.ollamaService.generateCommitMessage(
            config.model,
            config.host,
            fullPrompt,
            config.verbose
          );

          // Parse response
          const message = this.ollamaService.parseResponse(
            response,
            config.verbose,
            config.model,
            config.host
          );

          // Display result and handle user interaction
          const displayResult = await this.displayCommitResult(message, config.interactive);

          if (displayResult === 2) {
            // User requested regeneration - continue loop (don't increment error counter)
            if (config.verbose) {
              Logger.info('Regenerating commit message...');
            }
            continue;
          } else if (displayResult === 0) {
            // Success - user accepted the message
            break;
          } else {
            // User cancelled
            break;
          }

          // Reset error counter on successful generation
          errorRetryCount = 0;

        } catch (error: any) {
          // Check if this error should be retried
          if (!isRetryableError(error)) {
            // Non-retryable error - handle immediately and exit
            if (error instanceof GitNoChangesError || error instanceof GitRepositoryError) {
              // These are informational, not fatal errors - always show them
              console.log(`ℹ️  ${error.message}`);
              process.exit(0); // Exit cleanly with success code
            } else {
              // These are actual non-retryable errors
              throw error; // Let outer handler deal with it
            }
          }

          // This is a retryable error
          errorRetryCount++;
          Logger.error(`❌ Failed on attempt ${errorRetryCount}: ${error.message}`);

          if (errorRetryCount >= maxErrorRetries) {
            Logger.error(`❌ Maximum error retries (${maxErrorRetries}) reached. Giving up.`);
            throw error; // Don't add "Fatal error:" here, let outer handler do it
          }

          if (config.verbose) {
            Logger.info(`Retrying... (${errorRetryCount}/${maxErrorRetries})`);
            Logger.debug(`Error type: ${error.constructor.name} (retryable)`);
          }

          // Add backoff delay for retryable errors
          const delay = Math.min(1000 * Math.pow(2, errorRetryCount - 1), 5000); // Cap at 5 seconds
          if (config.verbose) {
            Logger.info(`Waiting ${delay}ms before retry...`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));

          continue;
        }
      }
    } catch (error: any) {
      // Only actual fatal errors reach here
      Logger.error(`❌ Fatal error: ${error.message}`);
      throw error;
    }
  }

  private buildConfig(options: CommitOptions): Required<CommitConfig> {
    const defaultPromptFile = join(homedir(), '.config', 'prompts', 'ollama-commit-prompt.txt');

    return {
      model: options.model || 'mistral:7b-instruct',
      host: options.host || process.env.OLLAMA_HOST || 'http://192.168.0.3:11434',
      verbose: options.verbose || false,
      interactive: options.interactive !== undefined ? options.interactive : true,
      promptFile: options.promptFile || defaultPromptFile,
      debug: options.debug || false,
      autoStage: options.autoStage || false,
      autoModel: options.autoModel || false,
    };
  }

  private async displayCommitResult(message: string, interactive: boolean): Promise<number> {
    console.log('');
    Logger.success('Generated commit message:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(message);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    if (interactive) {
      console.log('📋 Available actions:');
      console.log('   [y] Use this message and copy commit command');
      console.log('   [c] Copy message to clipboard (if available)');
      console.log('   [r] Regenerate message');
      console.log('   [n] Cancel');
      console.log('');

      return new Promise((resolve) => {
        const askQuestion = () => {
          process.stdout.write('What would you like to do? [y/c/r/n]: ');

          process.stdin.setRawMode(true);
          process.stdin.resume();
          process.stdin.once('data', (data) => {
            const choice = data.toString().toLowerCase().trim();
            process.stdin.setRawMode(false);
            process.stdin.pause();

            console.log(choice); // Echo the choice

            switch (choice) {
              case 'y':
                console.log('');
                console.log('📋 Copy and run this command:');
                const escapedMessage = message.replace(/"/g, '\\"');
                console.log(`git commit -m "${escapedMessage}"`);
                resolve(0);
                break;

              case 'c':
                copyToClipboard(message);
                resolve(0);
                break;

              case 'r':
                Logger.info('Regenerating message...');
                resolve(2);
                break;

              case 'n':
                Logger.warn('Cancelled');
                resolve(1);
                break;

              default:
                console.log('Please choose y, c, r, or n');
                askQuestion();
            }
          });
        };

        askQuestion();
      });
    } else {
      console.log('📋 To commit with this message, run:');
      const escapedMessage = message.replace(/"/g, '\\"');
      console.log(`git commit -m "${escapedMessage}"`);
      console.log('');
      return 0;
    }
  }
}