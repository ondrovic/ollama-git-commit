import { createInterface } from 'readline';
import { Logger } from './logger';

interface PromptOptions {
  message: string;
  choices: { key: string; description: string }[];
  defaultChoice?: string;
}

// DI interfaces
export interface IInteractiveDeps {
  logger: typeof Logger;
  fileSystem?: typeof import('fs-extra'); // For future extensibility
  configManager?: typeof import('../core/config').ConfigManager; // For future extensibility
  processObj?: typeof process;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

export class InteractivePromptDI {
  private isRawModeEnabled = false;
  constructor(private deps: IInteractiveDeps) {}

  async prompt(options: PromptOptions): Promise<string> {
    const { message, choices, defaultChoice } = options;
    const { logger, processObj, setTimeoutFn, clearTimeoutFn } = this.deps;

    if (!processObj) {
      throw new Error('Process object not available');
    }

    logger.plain(message);
    choices.forEach(choice => {
      const isDefault = choice.key === defaultChoice ? ' (default)' : '';
      logger.plain(`   [${choice.key}] ${choice.description}${isDefault}`);
    });
    logger.plain('');
    return new Promise((resolve, reject) => {
      const globalTimeout = (setTimeoutFn || setTimeout)(() => {
        this.cleanup();
        logger.warn('Prompt timed out, using default choice');
        resolve(defaultChoice || 'n');
      }, 60000);
      const cleanupAndResolve = (value: string) => {
        (clearTimeoutFn || clearTimeout)(globalTimeout);
        this.cleanup();
        resolve(value);
      };
      const cleanupAndReject = (error: Error) => {
        (clearTimeoutFn || clearTimeout)(globalTimeout);
        this.cleanup();
        reject(error);
      };
      if (this.isBunRuntime(processObj)) {
        this.handleBunInput(
          choices,
          defaultChoice,
          cleanupAndResolve,
          cleanupAndReject,
          processObj,
          logger,
        );
      } else {
        this.handleNodeInput(
          choices,
          defaultChoice,
          cleanupAndResolve,
          cleanupAndReject,
          processObj,
          logger,
        );
      }
    });
  }
  private isBunRuntime(processObj?: typeof process): boolean {
    return typeof processObj !== 'undefined' && processObj.versions?.bun !== undefined;
  }
  // QUESTION: can we make a considate the handelBunInput, handleNodeInput into one function that just takes isBunRuntime instead of having two functions that are almost identical?
  private handleBunInput(
    choices: { key: string; description: string }[],
    defaultChoice: string | undefined,
    resolve: (value: string) => void,
    reject: (error: Error) => void,
    processObj: typeof process,
    logger: typeof Logger,
  ): void {
    const askQuestion = async () => {
      if (!processObj) {
        reject(new Error('Process object not available'));
        return;
      }

      processObj.stdout.write('What would you like to do? ');

      if (defaultChoice) {
        processObj.stdout.write(`[${defaultChoice}]: `);
      }

      try {
        // For Bun, try to use readline-like functionality
        if (processObj.stdin.isTTY) {
          // Set raw mode for single character input
          processObj.stdin.setRawMode(true);
          processObj.stdin.resume();

          processObj.stdin.once('data', data => {
            const input = data.toString().trim().toLowerCase();
            processObj.stdin.setRawMode(false);
            processObj.stdin.pause();

            this.handleChoice(input || defaultChoice || '', choices, resolve, askQuestion, logger);
          });

          processObj.stdin.once('error', error => {
            processObj.stdin.setRawMode(false);
            processObj.stdin.pause();
            reject(error);
          });
        } else {
          // Fallback for non-TTY environments
          const rl = createInterface({
            input: processObj.stdin,
            output: processObj.stdout,
          });

          rl.question('', (answer: string) => {
            rl.close();
            const input = answer.trim().toLowerCase() || defaultChoice || '';
            this.handleChoice(input, choices, resolve, askQuestion, logger);
          });
        }
      } catch (error) {
        logger.debug('Bun input error:', error);
        reject(error as Error);
      }
    };

    askQuestion();
  }

  private handleNodeInput(
    choices: { key: string; description: string }[],
    defaultChoice: string | undefined,
    resolve: (value: string) => void,
    reject: (error: Error) => void,
    processObj: typeof process,
    logger: typeof Logger,
  ): void {
    const askQuestion = () => {
      if (!processObj) {
        reject(new Error('Process object not available'));
        return;
      }

      processObj.stdout.write('What would you like to do? ');

      if (defaultChoice) {
        processObj.stdout.write(`[${defaultChoice}]: `);
      }

      // Only set raw mode if it's not already enabled and stdin supports it
      if (!this.isRawModeEnabled && processObj.stdin.setRawMode && processObj.stdin.isTTY) {
        try {
          processObj.stdin.setRawMode(true);
          this.isRawModeEnabled = true;
        } catch (error) {
          logger.debug('Failed to set raw mode:', error);
        }
      }

      processObj.stdin.resume();

      const onData = (data: Buffer) => {
        const choice = data.toString().toLowerCase().trim();

        // Clean up listeners first
        processObj.stdin.removeListener('data', onData);
        processObj.stdin.removeListener('error', onError);

        this.handleChoice(choice || defaultChoice || '', choices, resolve, askQuestion, logger);
      };

      const onError = (error: Error) => {
        logger.debug('Stdin error:', error);
        processObj.stdin.removeListener('data', onData);
        processObj.stdin.removeListener('error', onError);
        reject(error);
      };

      processObj.stdin.once('data', onData);
      processObj.stdin.once('error', onError);
    };

    askQuestion();
  }

  private handleChoice(
    choice: string,
    choices: { key: string; description: string }[],
    resolve: (value: string) => void,
    askQuestion: () => void,
    logger: typeof Logger,
  ): void {
    const validChoice = choices.find(c => c.key === choice);

    if (validChoice) {
      // Add a newline after user input to separate from subsequent logger messages
      if (this.deps.processObj?.stdout?.write) {
        this.deps.processObj.stdout.write('\n');
      }
      resolve(choice);
    } else if (choice === '') {
      // Handle empty input - could be default or invalid
      const hasDefault = choices.some(c => c.key === choice);
      if (hasDefault) {
        // Add a newline after user input to separate from subsequent logger messages
        if (this.deps.processObj?.stdout?.write) {
          this.deps.processObj.stdout.write('\n');
        }
        resolve(choice);
      } else {
        logger.plain(`Please choose one of: ${choices.map(c => c.key).join(', ')}`);
        (this.deps.setTimeoutFn || setTimeout)(askQuestion, 100); // Small delay to prevent rapid loops
      }
    } else {
      logger.plain(`Please choose one of: ${choices.map(c => c.key).join(', ')}`);
      (this.deps.setTimeoutFn || setTimeout)(askQuestion, 100); // Small delay to prevent rapid loops
    }
  }

  // Cleanup method to call on process exit
  cleanup(): void {
    const { processObj, logger } = this.deps;
    if (this.isRawModeEnabled && processObj?.stdin?.setRawMode) {
      try {
        processObj.stdin.setRawMode(false);
      } catch (error) {
        logger.debug('Failed to cleanup raw mode:', error);
      }
    }

    if (processObj?.stdin?.pause) {
      try {
        processObj.stdin.pause();
      } catch (error) {
        logger.debug('Failed to pause stdin:', error);
      }
    }

    this.isRawModeEnabled = false;
  }
}

// Default instance using real dependencies
const defaultInteractivePrompt = new InteractivePromptDI({
  logger: Logger,
  processObj: process,
  setTimeoutFn: setTimeout,
  clearTimeoutFn: clearTimeout,
});

// Auto-cleanup on process exit
process.on('exit', () => defaultInteractivePrompt.cleanup());
process.on('SIGINT', () => {
  defaultInteractivePrompt.cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  defaultInteractivePrompt.cleanup();
  process.exit(0);
});

// Question: can we consolidate the askYesNoDI, askCommitActionDI into one function that just takes autoCommit as a boolean and interactivePromptDI as a dependency, and then builds the choices dynamically?
/**
 * Prompts the user with a yes/no question and returns their choice.
 *
 * @param message - The question to ask the user
 * @param defaultChoice - The default choice if user doesn't provide input ('y' or 'n')
 * @returns Promise resolving to true for 'yes' or false for 'no'
 */
export async function askYesNoDI(
  message: string,
  defaultChoice: 'y' | 'n' = 'n',
  deps: IInteractiveDeps = {
    logger: Logger,
    processObj: process,
    setTimeoutFn: setTimeout,
    clearTimeoutFn: clearTimeout,
  },
): Promise<boolean> {
  try {
    const choice = await new InteractivePromptDI(deps).prompt({
      message,
      choices: [
        { key: 'y', description: 'Yes' },
        { key: 'n', description: 'No' },
      ],
      defaultChoice,
    });
    return choice === 'y';
  } catch (error) {
    deps.logger.debug('askYesNo error:', error);
    return defaultChoice === 'y';
  }
}

/**
 * Prompts the user to choose an action for the commit message.
 *
 * @param autoCommit - Whether to include the option to commit changes
 * @returns Promise resolving to the chosen action:
 * - 'use': Use the message and copy commit command
 * - 'copy': Copy message to clipboard
 * - 'regenerate': Generate a new message
 * - 'cancel': Cancel the operation
 */
export async function askCommitActionDI(
  autoCommit = false,
  deps: IInteractiveDeps = {
    logger: Logger,
    processObj: process,
    setTimeoutFn: setTimeout,
    clearTimeoutFn: clearTimeout,
  },
): Promise<'use' | 'copy' | 'regenerate' | 'cancel'> {
  try {
    const choice = await new InteractivePromptDI(deps).prompt({
      message: 'Available actions:',
      choices: [
        {
          key: 'y',
          description: autoCommit
            ? 'Use this message and commit changes'
            : 'Use this message and copy commit command',
        },
        // TODO: hide option c if autoCommitm or not interactive
        { key: 'c', description: 'Copy message to clipboard (if available)' },
        // TODO: hide if not interactive prompt
        { key: 'r', description: 'Regenerate message' },
        { key: 'n', description: 'Cancel' },
      ],
      defaultChoice: 'y',
    });

    switch (choice) {
      case 'y':
        return 'use';
      // TODO: hide option c if autoCommit
      case 'c':
        return 'copy';
      case 'r':
        return 'regenerate';
      case 'n':
        return 'cancel';
      default:
        return 'cancel';
    }
  } catch (error) {
    deps.logger.debug('askCommitAction error:', error);
    return 'cancel';
  }
}

// Default exports using real dependencies
export const InteractivePrompt = defaultInteractivePrompt;
// QUESTION consilidate these maybe since they are similar then build the choices dynamically?
export const askYesNo = async (message: string, defaultChoice: 'y' | 'n' = 'n') =>
  askYesNoDI(message, defaultChoice);
export const askCommitAction = async (autoCommit = false) => askCommitActionDI(autoCommit);
