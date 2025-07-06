import { execSync as realExecSync, spawn as realSpawn } from 'child_process';
import { readFileSync as realReadFileSync } from 'fs';
import { homedir as realHomedir } from 'os';
import { join as realJoin } from 'path';
import { VALID_TEMPLATES, type VALID_TEMPLATE } from '../constants/prompts';
import { ConfigManager, getConfig } from '../core/config';
import { GitCommandError, GitNoChangesError, GitRepositoryError } from '../core/git';
import { IGitService, ILogger, IOllamaService, IPromptService } from '../core/interfaces';
import type { CommitConfig, CommitOptions } from '../types';
import { copyToClipboard } from '../utils/clipboard';
import { askCommitAction } from '../utils/interactive';
import { validateGitRepository } from '../utils/validation';
import { ModelsCommand } from './models';
import { TestCommand } from './test';

export interface CommitCommandDeps {
  fs?: { readFileSync?: typeof realReadFileSync };
  path?: { join?: typeof realJoin };
  os?: { homedir?: typeof realHomedir };
  spawn?: typeof realSpawn;
  execSync?: typeof realExecSync;
}

type ConfigProvider = () => Promise<Required<CommitConfig>>;

export class CommitCommand {
  private modelsCommand: ModelsCommand;
  private testCommand: TestCommand;
  private gitService: IGitService;
  private ollamaService: IOllamaService;
  private promptService: IPromptService;
  private logger: ILogger;
  private configProvider: ConfigProvider;
  private quiet: boolean;
  private fs: { readFileSync: typeof realReadFileSync };
  private path: { join: typeof realJoin };
  private os: { homedir: typeof realHomedir };
  private spawn: typeof realSpawn;
  private execSync: typeof realExecSync;

  constructor(
    private directory: string,
    gitService: IGitService,
    ollamaService: IOllamaService,
    promptService: IPromptService,
    logger: ILogger,
    configProvider?: ConfigProvider,
    quiet = false,
    deps: CommitCommandDeps = {},
  ) {
    this.logger = logger;
    this.quiet = quiet;
    this.gitService = gitService;
    this.ollamaService = ollamaService;
    this.promptService = promptService;

    // Create command instances
    this.modelsCommand = new ModelsCommand(ollamaService, logger);
    this.testCommand = new TestCommand(ollamaService, logger);

    this.configProvider = configProvider || (async () => await getConfig());
    this.fs = { readFileSync: deps.fs?.readFileSync || realReadFileSync };
    this.path = { join: deps.path?.join || realJoin };
    this.os = { homedir: deps.os?.homedir || realHomedir };
    this.spawn = deps.spawn || realSpawn;
    this.execSync = deps.execSync || realExecSync;
  }

  async execute(options: CommitOptions): Promise<void> {
    // Set up configuration with defaults
    const config = await this.buildConfig(options);

    // Update the quiet property from the resolved config
    this.quiet = config.quiet;

    // Update GitService quiet setting to match the resolved configuration
    if (
      typeof (this.gitService as IGitService & { setQuiet?: (quiet: boolean) => void }).setQuiet ===
      'function'
    ) {
      (this.gitService as IGitService & { setQuiet: (quiet: boolean) => void }).setQuiet(
        config.quiet,
      );
    }

    // Update PromptService quiet setting to match the resolved configuration
    if (
      typeof (this.promptService as IPromptService & { setQuiet?: (quiet: boolean) => void })
        .setQuiet === 'function'
    ) {
      (this.promptService as IPromptService & { setQuiet: (quiet: boolean) => void }).setQuiet(
        config.quiet,
      );
    }

    // Update OllamaService quiet setting to match the resolved configuration
    if (
      typeof (this.ollamaService as IOllamaService & { setQuiet?: (quiet: boolean) => void })
        .setQuiet === 'function'
    ) {
      (this.ollamaService as IOllamaService & { setQuiet: (quiet: boolean) => void }).setQuiet(
        config.quiet,
      );
    }

    this.logger.debug('Configuration:', config);

    // Show initial progress even in quiet mode
    if (this.quiet) {
      this.logger.rocket('Starting commit process...');
    }

    // Run staging script for both auto-stage and auto-commit
    if (config.autoStage || config.autoCommit) {
      // Show staging progress even in quiet mode
      if (this.quiet) {
        this.logger.package('Staging changes...');
      }

      // Check if staging script exists
      const packageJsonPath = this.path.join(this.directory, 'package.json');
      let hasStageScript = false;

      try {
        const packageJson = JSON.parse(this.fs.readFileSync(packageJsonPath, 'utf8'));
        hasStageScript = packageJson.scripts && packageJson.scripts.stage;
      } catch {
        // If package.json doesn't exist or is invalid, assume no stage script
        hasStageScript = false;
      }

      if (hasStageScript) {
        // Run the full staging script
        this.logger.hammer('Running staging script (format, lint, test, stage)...');
        this.execSync('bun run stage', {
          cwd: this.directory,
          stdio: this.quiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
          env: { ...process.env, ...(this.quiet && { QUIET: 'true' }) },
        });
        this.logger.success('Staging completed!');
      } else {
        // Fall back to simple git add if no staging script exists
        this.logger.info('No staging script found, using simple git add...');
        this.logger.info(
          'Note: For full formatting, linting, and testing, ensure your project has a "stage" script in package.json',
        );

        try {
          this.gitService.execCommand('git add -A', this.quiet);
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

    // Show analysis progress even in quiet mode
    if (this.quiet) {
      this.logger.magnifier('Analyzing changes...');
    }

    // Test Ollama connection
    if (config.verbose || config.debug) {
      this.logger.test(`Testing connection to ${config.host}...`);
    }

    if (!(await this.ollamaService.testConnection(config.host, config.verbose))) {
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
      this.logger.settings(`Using prompt template: ${currentTemplate}`);
      if (currentTemplate === 'custom') {
        this.logger.settings(`Custom prompt file: ${config.promptFile}`);
      }
    }

    // Run prompt test if in debug mode
    if (config.debug) {
      this.logger.debug('Running in debug mode...');
      this.logger.debug('Configuration:', config);

      // Test the actual prompt template instead of a simple test
      const testSuccess = await this.testCommand.testPrompt(
        config.host,
        config.model,
        systemPrompt,
        config.verbose && !config.quiet, // Only show verbose output if verbose is true AND quiet is false
      );

      if (!testSuccess) {
        this.logger.error('Prompt test failed');
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
          const gitChanges = this.gitService.getChanges(
            config.verbose && !config.quiet,
            config.autoStage,
          );

          if (config.verbose && !config.quiet) {
            this.logger.success('Analysis complete, generating commit message...');
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
              config.verbose && !config.quiet, // Only show verbose output if verbose is true AND quiet is false
            );
            if (config.verbose && !config.quiet) {
              this.logger.settings(`Using ${contextProviders.length} context providers`);
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
            if (config.verbose && !config.quiet) {
              this.logger.settings(`Using embeddings model: ${embeddingsModel.model}`);
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
            config.verbose && !config.quiet, // Only show verbose output if verbose is true AND quiet is false
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
              this.logger.error(error.message);
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
              `Failed on attempt ${errorRetryCount}: ${(error as { message: string }).message}`,
            );
          } else {
            this.logger.error(`Failed on attempt ${errorRetryCount}: ${String(error)}`);
          }

          if (errorRetryCount >= maxErrorRetries) {
            this.logger.error(`Maximum error retries (${maxErrorRetries}) reached. Giving up.`);
            throw error;
          }

          if (config.verbose && !config.quiet) {
            this.logger.retry(`Retrying... (${errorRetryCount}/${maxErrorRetries})`);
            if (error instanceof Error) {
              this.logger.error(`Error type: ${error.constructor.name} (retryable)`);
            } else {
              this.logger.error('Error type: Unknown (retryable)');
            }
          }

          // Add backoff delay for retryable errors
          const delay = Math.min(1000 * Math.pow(2, errorRetryCount - 1), 5000);
          if (config.verbose && !config.quiet) {
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
        if (config.verbose && !config.quiet) {
          this.logger.retry('Regenerating commit message...');
        }
        continue; // Generate a new message
      } else if (displayResult === 0) {
        // Success - user accepted the message
        break;
      } else {
        // User cancelled (displayResult === 1)
        this.logger.error('Operation cancelled by user');
        break;
      }
    }
  }

  private async displayCommitResult(
    message: string,
    interactive: boolean,
    config: Required<CommitConfig>,
  ): Promise<number> {
    this.logger.success('Generated commit message:');
    // Use plain output instead of table to ensure it shows regardless of verbose mode
    this.logger.plain(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    );
    this.logger.plain(message);
    this.logger.plain(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    );
    this.logger.plain('');

    if (interactive) {
      return this.handleInteractiveMode(message, config);
    } else {
      return this.handleNonInteractiveMode(message, config);
    }
  }

  private async handleInteractiveMode(
    message: string,
    config: Required<CommitConfig>,
  ): Promise<number> {
    try {
      const action = await askCommitAction(config.autoCommit);
      return this.handleUserAction(action, message, config);
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'message' in error) {
        this.logger.error('Interactive prompt failed:', (error as { message: string }).message);
      } else {
        this.logger.error('Interactive prompt failed:', String(error));
      }
      this.logger.info('Falling back to non-interactive mode');
      return this.handleNonInteractiveMode(message, config);
    }
  }

  private async handleNonInteractiveMode(
    message: string,
    config: Required<CommitConfig>,
  ): Promise<number> {
    if (config.autoCommit) {
      return this.performAutoCommit(message, config);
    } else {
      return this.showManualCommitInstructions(message);
    }
  }

  private async handleUserAction(
    action: 'use' | 'copy' | 'regenerate' | 'cancel',
    message: string,
    config: Required<CommitConfig>,
  ): Promise<number> {
    switch (action) {
      case 'use': {
        if (config.autoCommit) {
          return this.performInteractiveAutoCommit(message, config);
        } else {
          return this.showManualCommitInstructions(message);
        }
      }
      case 'copy': {
        await copyToClipboard(message);
        return 0;
      }
      case 'regenerate': {
        return 2;
      }
      case 'cancel': {
        return 1;
      }
      default: {
        return 1;
      }
    }
  }

  private async performAutoCommit(
    message: string,
    _config: Required<CommitConfig>,
  ): Promise<number> {
    try {
      const escapedMessage = message.replace(/"/g, '\\"');

      // Commit changes
      this.gitService.execCommand(`git commit -m "${escapedMessage}"`, this.quiet);
      this.logger.success('Changes committed successfully!');

      // Always push after commit in auto-commit mode
      return this.performAutoPush();
    } catch (error) {
      return this.handleCommitError(error);
    }
  }

  private async performInteractiveAutoCommit(
    message: string,
    _config: Required<CommitConfig>,
  ): Promise<number> {
    try {
      // Helper to run a command and await its completion
      const runSpawn = (cmd: string, args: string[]) =>
        new Promise<number>((resolve, reject) => {
          const child = this.spawn(cmd, args, {
            cwd: this.directory,
            stdio: this.quiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
            env: process.env,
          });
          child.on('exit', code => resolve(code ?? 1));
          child.on('error', err => reject(err));
        });

      const commitCode = await runSpawn('git', ['commit', '-m', message]);
      if (commitCode === 0) {
        this.logger.success('Changes committed successfully!');
        this.logger.up('Pushing changes to remote repository...');
        const pushCode = await runSpawn('git', ['push']);
        if (pushCode === 0) {
          this.logger.success('Changes pushed successfully!');
          return 0;
        } else {
          this.logger.error('Failed to push changes.');
          this.logger.error(
            'If you are using 1Password SSH agent, ensure the 1Password CLI is running and SSH_AUTH_SOCK is set.',
          );
          return 1;
        }
      } else {
        this.logger.error('Failed to commit changes.');
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
  }

  private async performAutoPush(): Promise<number> {
    if (this.quiet) {
      this.logger.rocket('Pushing to remote...');
    } else {
      this.logger.up('Pushing changes to remote repository...');
    }

    try {
      this.gitService.execCommand('git push', this.quiet);
      this.logger.success('Changes pushed successfully!');
      return 0;
    } catch (pushError) {
      return this.handlePushError(pushError);
    }
  }

  private async showManualCommitInstructions(message: string): Promise<number> {
    await this.logger.group('To commit with this message, run:', () => {
      const escapedMessage = message.replace(/"/g, '\\"');
      this.logger.info(`git commit -m "${escapedMessage}"`);
      this.logger.plain('');
    });
    return 0;
  }

  private handleCommitError(error: unknown): number {
    this.logger.error(
      'Failed to commit changes:',
      error instanceof Error ? error.message : String(error),
    );
    this.logger.error(
      'If you are using 1Password SSH agent, ensure the 1Password CLI is running and SSH_AUTH_SOCK is set.',
    );
    return 1;
  }

  private handlePushError(pushError: unknown): number {
    this.logger.error(
      'Failed to push changes:',
      pushError instanceof Error ? pushError.message : String(pushError),
    );
    this.logger.error(
      'If you are using 1Password SSH agent, ensure the 1Password CLI is running and SSH_AUTH_SOCK is set.',
    );
    return 1;
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
    const config = {
      model: model,
      host: options.host || baseConfig.host,
      verbose: options.verbose !== undefined ? options.verbose : baseConfig.verbose,
      interactive: options.interactive !== undefined ? options.interactive : baseConfig.interactive,
      promptFile:
        options.promptFile ||
        baseConfig.promptFile ||
        this.path.join(this.os.homedir(), '.config', 'ollama-git-commit', 'prompt.txt'),
      debug: options.debug || baseConfig.debug,
      autoStage,
      autoModel: options.autoModel || baseConfig.autoModel,
      autoCommit: options.autoCommit || baseConfig.autoCommit,
      promptTemplate,
      quiet: options.quiet !== undefined ? options.quiet : baseConfig.quiet,
    };

    // Update the instance quiet property to use the config value
    this.quiet = config.quiet;

    return config;
  }
}
