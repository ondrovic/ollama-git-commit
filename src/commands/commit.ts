import { execSync, spawn } from 'child_process';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { VALID_TEMPLATES, type VALID_TEMPLATE } from '../constants/prompts';
import { ConfigManager, getConfig } from '../core/config';
import { GitCommandError, GitNoChangesError, GitRepositoryError, GitService } from '../core/git';
import { IGitService, ILogger, IOllamaService, IPromptService } from '../core/interfaces';
import { OllamaService } from '../core/ollama';
import { PromptService } from '../core/prompt';
import type { CommitConfig, CommitOptions } from '../types';
import { copyToClipboard } from '../utils/clipboard';
import { askCommitAction } from '../utils/interactive';
import { Logger } from '../utils/logger';
import { validateGitRepository } from '../utils/validation';
import { ModelsCommand } from './models';
import { TestCommand } from './test';

type ConfigProvider = () => Promise<Required<CommitConfig>>;

export class CommitCommand {
  private modelsCommand: ModelsCommand;
  private testCommand: TestCommand;
  private gitService: IGitService;
  private ollamaService: IOllamaService;
  private promptService: IPromptService;
  private logger: ILogger;
  private configProvider: ConfigProvider;

  constructor(
    private directory: string,
    gitService?: IGitService,
    ollamaService?: IOllamaService,
    promptService?: IPromptService,
    logger: ILogger = Logger.getDefault(),
    configProvider?: ConfigProvider,
  ) {
    this.logger = logger;
    this.gitService = gitService || new GitService(this.directory, this.logger);
    this.ollamaService = ollamaService || new OllamaService(this.logger);
    this.promptService = promptService || new PromptService(this.logger);
    this.modelsCommand = new ModelsCommand();
    this.testCommand = new TestCommand();
    this.configProvider = configProvider || (async () => await getConfig());
  }

  async execute(options: CommitOptions): Promise<void> {
    // Set up configuration with defaults
    const config = await this.buildConfig(options);

    this.logger.debug('Configuration:', config);

    // Run staging script for both auto-stage and auto-commit
    if (config.autoStage || config.autoCommit) {
      // Check if staging script exists
      const packageJsonPath = join(this.directory, 'package.json');
      let hasStageScript = false;

      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
        hasStageScript = packageJson.scripts && packageJson.scripts.stage;
      } catch {
        // If package.json doesn't exist or is invalid, assume no stage script
        hasStageScript = false;
      }

      if (hasStageScript) {
        // Run the full staging script
        this.logger.info('Running staging script (format, lint, test, stage)...');
        execSync('bun run stage', {
          cwd: this.directory,
          stdio: 'inherit',
          env: process.env,
        });
        this.logger.success('Staging completed!');
      } else {
        // Fall back to simple git add if no staging script exists
        this.logger.info('No staging script found, using simple git add...');
        this.logger.info(
          'Note: For full formatting, linting, and testing, ensure your project has a "stage" script in package.json',
        );

        try {
          execSync('git add -A', {
            cwd: this.directory,
            stdio: 'inherit',
            env: { ...process.env, GIT_SKIP_HOOKS: '1' },
          });
          this.logger.success('Files staged successfully!');
        } catch (addError) {
          this.logger.error(
            'Failed to stage files:',
            addError instanceof Error ? addError.message : String(addError),
          );
          throw addError;
        }
      }
    }

    // Validate environment
    validateGitRepository(options.directory || process.cwd());

    // Test Ollama connection
    if (config.verbose || config.debug) {
      this.logger.info(`Testing connection to ${config.host}...`);
    }

    if (!(await this.testCommand.testConnection(config.host, config.verbose))) {
      throw new Error('Failed to connect to Ollama');
    }

    // Handle auto-model selection
    if (config.autoModel) {
      const autoModel = await this.modelsCommand.getDefaultModel(config.host, true);
      if (autoModel) {
        config.model = autoModel;
        this.logger.info(`Auto-selected model: ${autoModel}`);
      } else {
        throw new Error('No suitable model found');
      }
    }

    // Setup system prompt
    const systemPrompt = this.promptService.getSystemPrompt(
      config.promptFile,
      config.verbose,
      config.promptTemplate,
    );

    // Show prompt template info in verbose/debug mode
    if (config.verbose || config.debug) {
      const currentTemplate = config.promptTemplate || 'default';
      this.logger.info(`Using prompt template: ${currentTemplate}`);
      if (currentTemplate === 'custom') {
        this.logger.info(`Custom prompt file: ${config.promptFile}`);
      }
    }

    // Run prompt test if in debug mode
    if (config.debug) {
      this.logger.info('Running in debug mode...');
      this.logger.debug('Configuration:', config);

      // Test the actual prompt template instead of a simple test
      const testSuccess = await this.testCommand.testPrompt(
        config.host,
        config.model,
        systemPrompt,
        true,
      );

      if (!testSuccess) {
        this.logger.error('❌ Prompt test failed');
        process.exit(1);
      }

      this.logger.success('Prompt test passed');
    }

    // Helper function to determine if an error should be retried
    const isRetryableError = (error: Error): boolean => {
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
    };

    // Generate commit message with retries
    const generateMessage = async (): Promise<string> => {
      const maxErrorRetries = 3;
      let errorRetryCount = 0;

      while (errorRetryCount < maxErrorRetries) {
        try {
          // Get git changes
          const gitChanges = this.gitService.getChanges(config.verbose, config.autoStage);

          if (config.verbose) {
            this.logger.info('Analysis complete, generating commit message...');
          }

          // Check if embeddings model and context providers are available
          const configManager = ConfigManager.getInstance();
          const embeddingsModel = await configManager.getEmbeddingsModel();
          const contextProviders = await configManager.getContextProviders();

          let fullPrompt: string;

          // Use context-enhanced prompt if context providers are available
          if (contextProviders && contextProviders.length > 0) {
            fullPrompt = await this.promptService.buildCommitPromptWithContext(
              gitChanges.filesInfo,
              gitChanges.diff,
              systemPrompt,
              contextProviders,
              this.directory,
              config.verbose,
            );
            if (config.verbose) {
              this.logger.info(`Using ${contextProviders.length} context providers`);
            }
          } else if (embeddingsModel) {
            // Use embeddings-enhanced prompt
            fullPrompt = await this.promptService.buildCommitPromptWithEmbeddings(
              gitChanges.filesInfo,
              gitChanges.diff,
              systemPrompt,
              this.ollamaService,
              embeddingsModel.model,
              config.host,
            );
            if (config.verbose) {
              this.logger.info(`Using embeddings model: ${embeddingsModel.model}`);
            }
          } else {
            // Use basic prompt
            fullPrompt = this.promptService.buildCommitPrompt(
              gitChanges.filesInfo,
              gitChanges.diff,
              systemPrompt,
            );
          }

          // Call Ollama API
          let message = await this.ollamaService.generateCommitMessage(
            config.model,
            config.host,
            fullPrompt,
            config.verbose,
          );

          // Post-processing: Replace incorrect version lines with correct ones in their proper position
          const versionSectionMatch = gitChanges.filesInfo.match(/📦 Version Changes:\n([\s\S]+)/);
          if (versionSectionMatch && versionSectionMatch[1]) {
            const versionLines = versionSectionMatch[1]
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.startsWith('📦'));
            // Remove emoji from version lines
            const cleanVersionLines = versionLines.map(line => line.replace(/^📦\s*/, ''));

            // Replace incorrect version lines with correct ones
            cleanVersionLines.forEach(cleanLine => {
              // Replace any line containing 'from .. to ..' (case insensitive) with the correct version
              const incorrectVersionRegex = new RegExp(
                '(.*from\\s+\\.\\.\\s+to\\s+\\.\\..*)',
                'gi',
              );
              message = message.replace(incorrectVersionRegex, `- ${cleanLine}`);
            });
          }

          return message;
        } catch (error: unknown) {
          // Check if this error should be retried
          if (!isRetryableError(error as Error)) {
            // Non-retryable error - handle immediately and exit
            if (error instanceof GitNoChangesError) {
              console.log(`ℹ️  ${error.message}`);
              process.exit(0); // Only exit for NoChangesError
            } else if (error instanceof GitRepositoryError) {
              // Allow GitRepositoryError to throw
              throw error;
            } else if (error instanceof Error) {
              // These are actual non-retryable errors
              throw error;
            } else {
              throw new Error(`An unexpected non-retryable error occurred: ${String(error)}`);
            }
          }

          // This is a retryable error
          errorRetryCount++;
          if (typeof error === 'object' && error && 'message' in error) {
            this.logger.error(
              `❌ Failed on attempt ${errorRetryCount}: ${(error as { message: string }).message}`,
            );
          } else {
            this.logger.error(`❌ Failed on attempt ${errorRetryCount}: ${String(error)}`);
          }

          if (errorRetryCount >= maxErrorRetries) {
            this.logger.error(`❌ Maximum error retries (${maxErrorRetries}) reached. Giving up.`);
            throw error;
          }

          if (config.verbose) {
            this.logger.info(`Retrying... (${errorRetryCount}/${maxErrorRetries})`);
            if (error instanceof Error) {
              this.logger.debug(`Error type: ${error.constructor.name} (retryable)`);
            } else {
              this.logger.debug('Error type: Unknown (retryable)');
            }
          }

          // Add backoff delay for retryable errors
          const delay = Math.min(1000 * Math.pow(2, errorRetryCount - 1), 5000);
          if (config.verbose) {
            this.logger.info(`Waiting ${delay}ms before retry...`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw new Error(`Failed to generate commit message after ${maxErrorRetries} attempts`);
    };

    // Main user interaction loop - completely separate from error handling
    while (true) {
      // Generate message (with its own error handling)
      const message = await generateMessage.call(this);

      // Display result and handle user interaction
      const displayResult = await this.displayCommitResult(message, config.interactive, config);

      if (displayResult === 2) {
        // User requested regeneration - continue loop
        if (config.verbose) {
          this.logger.info('Regenerating commit message...');
        }
        continue; // Generate a new message
      } else if (displayResult === 0) {
        // Success - user accepted the message
        break;
      } else {
        // User cancelled (displayResult === 1)
        this.logger.info('Operation cancelled by user');
        break;
      }
    }
  }

  private async displayCommitResult(
    message: string,
    interactive: boolean,
    config: Required<CommitConfig>,
  ): Promise<number> {
    console.log('');
    this.logger.success('Generated commit message:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(message);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    if (interactive) {
      try {
        const action = await askCommitAction(config.autoCommit);
        let result: number;

        switch (action) {
          case 'use': {
            if (config.autoCommit) {
              // Auto-commit mode: automatically commit with the AI-generated message
              try {
                // Helper to run a command and await its completion
                const runSpawn = (cmd: string, args: string[]) =>
                  new Promise<number>((resolve, reject) => {
                    const child = spawn(cmd, args, {
                      cwd: this.directory,
                      stdio: 'inherit',
                      env: process.env,
                    });
                    child.on('exit', code => resolve(code ?? 1));
                    child.on('error', err => reject(err));
                  });

                const commitCode = await runSpawn('git', ['commit', '-m', message]);
                if (commitCode === 0) {
                  this.logger.success('Changes committed successfully!');
                  this.logger.info('Pushing changes to remote repository...');
                  const pushCode = await runSpawn('git', ['push']);
                  if (pushCode === 0) {
                    this.logger.success('Changes pushed successfully!');
                    result = 0;
                  } else {
                    this.logger.error('Failed to push changes.');
                    this.logger.error(
                      'If you are using 1Password SSH agent, ensure the 1Password CLI is running and SSH_AUTH_SOCK is set.',
                    );
                    result = 1;
                  }
                } else {
                  this.logger.error('Failed to commit changes.');
                  this.logger.error(
                    'If you are using 1Password SSH agent, ensure the 1Password CLI is running and SSH_AUTH_SOCK is set.',
                  );
                  result = 1;
                }
              } catch (error) {
                this.logger.error(
                  'Failed to commit changes:',
                  error instanceof Error ? error.message : String(error),
                );
                this.logger.error(
                  'If you are using 1Password SSH agent, ensure the 1Password CLI is running and SSH_AUTH_SOCK is set.',
                );
                result = 1;
              }
            } else {
              // Auto-stage mode: require manual commit (user types the message)
              console.log('');
              console.log('📋 Copy and run this command:');
              const escapedMessage = message.replace(/"/g, '\\"');
              console.log(`git commit -m "${escapedMessage}"`);
              result = 0;
            }
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
          this.logger.error('Interactive prompt failed:', (error as { message: string }).message);
        } else {
          this.logger.error('Interactive prompt failed:', String(error));
        }
        this.logger.info('Falling back to non-interactive mode');

        // Non-interactive mode: ensure auto-commit always commits AND pushes
        if (config.autoCommit) {
          try {
            const escapedMessage = message.replace(/"/g, '\\"');
            // Commit changes
            this.gitService.execCommand(`git commit -m "${escapedMessage}"`);
            this.logger.success('Changes committed successfully!');

            // Always push after commit in auto-commit mode
            this.logger.info('Pushing changes to remote repository...');
            try {
              this.gitService.execCommand('git push');
              this.logger.success('Changes pushed successfully!');
              return 0;
            } catch (pushError) {
              this.logger.error(
                'Failed to push changes:',
                pushError instanceof Error ? pushError.message : String(pushError),
              );
              this.logger.error(
                'If you are using 1Password SSH agent, ensure the 1Password CLI is running and SSH_AUTH_SOCK is set.',
              );
              return 1;
            }
          } catch (error) {
            this.logger.error(
              'Failed to commit changes:',
              error instanceof Error ? error.message : String(error),
            );
            this.logger.error(
              'If you are using 1Password SSH agent, ensure the 1Password CLI is running and SSH_AUTH_SOCK is set.',
            );
            return 1;
          }
        } else {
          // Auto-stage mode: require manual commit (user types the message)
          console.log('📋 To commit with this message, run:');
          const escapedMessage = message.replace(/"/g, '\\"');
          console.log(`git commit -m "${escapedMessage}"`);
          console.log('');
          return 0;
        }
      }
    } else {
      // Non-interactive mode: ensure auto-commit always commits AND pushes
      if (config.autoCommit) {
        try {
          const escapedMessage = message.replace(/"/g, '\\"');
          // Commit changes
          this.gitService.execCommand(`git commit -m "${escapedMessage}"`);
          this.logger.success('Changes committed successfully!');

          // Always push after commit in auto-commit mode
          this.logger.info('Pushing changes to remote repository...');
          try {
            this.gitService.execCommand('git push');
            this.logger.success('Changes pushed successfully!');
            return 0;
          } catch (pushError) {
            this.logger.error(
              'Failed to push changes:',
              pushError instanceof Error ? pushError.message : String(pushError),
            );
            this.logger.error(
              'If you are using 1Password SSH agent, ensure the 1Password CLI is running and SSH_AUTH_SOCK is set.',
            );
            return 1;
          }
        } catch (error) {
          this.logger.error(
            'Failed to commit changes:',
            error instanceof Error ? error.message : String(error),
          );
          this.logger.error(
            'If you are using 1Password SSH agent, ensure the 1Password CLI is running and SSH_AUTH_SOCK is set.',
          );
          return 1;
        }
      } else {
        // Auto-stage mode: require manual commit (user types the message)
        console.log('📋 To commit with this message, run:');
        const escapedMessage = message.replace(/"/g, '\\"');
        console.log(`git commit -m "${escapedMessage}"`);
        console.log('');
        return 0;
      }
    }
  }

  private async buildConfig(options: CommitOptions): Promise<Required<CommitConfig>> {
    const baseConfig = await this.configProvider();

    // If autoCommit is true, force autoStage to be true as well
    const autoStage = options.autoCommit ? true : options.autoStage || baseConfig.autoStage;

    // Validate prompt template if provided
    const promptTemplate =
      options.promptTemplate && VALID_TEMPLATES.includes(options.promptTemplate as VALID_TEMPLATE)
        ? options.promptTemplate
        : baseConfig.promptTemplate;

    // Get the model to use - prefer CLI option, then chat model from multi-model config, then legacy model
    let model = options.model;
    if (!model) {
      // Try to get chat model from multi-model configuration
      const configManager = ConfigManager.getInstance();
      const chatModel = await configManager.getChatModel();
      model = chatModel?.model || baseConfig.model;
    }

    // Override with CLI options (CLI options take highest priority)
    return {
      model: model,
      host: options.host || baseConfig.host,
      verbose: options.verbose !== undefined ? options.verbose : baseConfig.verbose,
      interactive: options.interactive !== undefined ? options.interactive : baseConfig.interactive,
      promptFile:
        options.promptFile ||
        baseConfig.promptFile ||
        join(homedir(), '.config', 'ollama-git-commit', 'prompt.txt'),
      debug: options.debug || baseConfig.debug,
      autoStage,
      autoModel: options.autoModel || baseConfig.autoModel,
      autoCommit: options.autoCommit || baseConfig.autoCommit,
      promptTemplate,
    };
  }
}
