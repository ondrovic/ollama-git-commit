import { Logger } from './logger';
import { createInterface } from 'readline';

interface PromptOptions {
  message: string;
  choices: { key: string; description: string }[];
  defaultChoice?: string;
}

export class InteractivePrompt {
  private static isRawModeEnabled = false;

  static async prompt(options: PromptOptions): Promise<string> {
    const { message, choices, defaultChoice } = options;

    // Show the prompt
    console.log(message);
    choices.forEach(choice => {
      const isDefault = choice.key === defaultChoice ? ' (default)' : '';
      console.log(`   [${choice.key}] ${choice.description}${isDefault}`);
    });
    console.log('');

    return new Promise((resolve, reject) => {
      // Set a timeout to prevent hanging
      const globalTimeout = setTimeout(() => {
        this.cleanup();
        Logger.warn('Prompt timed out, using default choice');
        resolve(defaultChoice || 'n');
      }, 60000); // 60 second timeout

      const cleanupAndResolve = (value: string) => {
        clearTimeout(globalTimeout);
        this.cleanup();
        resolve(value);
      };

      const cleanupAndReject = (error: Error) => {
        clearTimeout(globalTimeout);
        this.cleanup();
        reject(error);
      };

      // Try different input methods based on runtime
      if (this.isBunRuntime()) {
        this.handleBunInput(choices, defaultChoice, cleanupAndResolve, cleanupAndReject);
      } else {
        this.handleNodeInput(choices, defaultChoice, cleanupAndResolve, cleanupAndReject);
      }
    });
  }

  private static isBunRuntime(): boolean {
    return typeof process !== 'undefined' && process.versions?.bun !== undefined;
  }

  private static handleBunInput(
    choices: { key: string; description: string }[],
    defaultChoice: string | undefined,
    resolve: (value: string) => void,
    reject: (error: Error) => void,
  ): void {
    const askQuestion = async () => {
      process.stdout.write('What would you like to do? ');

      if (defaultChoice) {
        process.stdout.write(`[${defaultChoice}]: `);
      }

      try {
        // For Bun, try to use readline-like functionality
        if (process.stdin.isTTY) {
          // Set raw mode for single character input
          process.stdin.setRawMode(true);
          process.stdin.resume();

          process.stdin.once('data', (data) => {
            const input = data.toString().trim().toLowerCase();
            process.stdin.setRawMode(false);
            process.stdin.pause();

            console.log(input); // Echo the choice

            this.handleChoice(input || defaultChoice || '', choices, resolve, askQuestion);
          });

          process.stdin.once('error', (error) => {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            reject(error);
          });
        } else {
          // Fallback for non-TTY environments
          const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          rl.question('', (answer: string) => {
            rl.close();
            const input = answer.trim().toLowerCase() || defaultChoice || '';
            this.handleChoice(input, choices, resolve, askQuestion);
          });
        }
      } catch (error) {
        Logger.debug('Bun input error:', error);
        reject(error as Error);
      }
    };

    askQuestion();
  }

  private static handleNodeInput(
    choices: { key: string; description: string }[],
    defaultChoice: string | undefined,
    resolve: (value: string) => void,
    reject: (error: Error) => void,
  ): void {
    const askQuestion = () => {
      process.stdout.write('What would you like to do? ');

      if (defaultChoice) {
        process.stdout.write(`[${defaultChoice}]: `);
      }

      // Only set raw mode if it's not already enabled and stdin supports it
      if (!this.isRawModeEnabled && process.stdin.setRawMode && process.stdin.isTTY) {
        try {
          process.stdin.setRawMode(true);
          this.isRawModeEnabled = true;
        } catch (error) {
          Logger.debug('Failed to set raw mode:', error);
        }
      }

      process.stdin.resume();

      const onData = (data: Buffer) => {
        const choice = data.toString().toLowerCase().trim();

        // Clean up listeners first
        process.stdin.removeListener('data', onData);
        process.stdin.removeListener('error', onError);

        console.log(choice); // Echo the choice

        this.handleChoice(choice || defaultChoice || '', choices, resolve, askQuestion);
      };

      const onError = (error: Error) => {
        Logger.debug('Stdin error:', error);
        process.stdin.removeListener('data', onData);
        process.stdin.removeListener('error', onError);
        reject(error);
      };

      process.stdin.once('data', onData);
      process.stdin.once('error', onError);
    };

    askQuestion();
  }

  private static handleChoice(
    choice: string,
    choices: { key: string; description: string }[],
    resolve: (value: string) => void,
    askQuestion: () => void,
  ): void {
    const validChoice = choices.find(c => c.key === choice);

    if (validChoice) {
      resolve(choice);
    } else if (choice === '') {
      // Handle empty input - could be default or invalid
      const hasDefault = choices.some(c => c.key === choice);
      if (hasDefault) {
        resolve(choice);
      } else {
        console.log(`Please choose one of: ${choices.map(c => c.key).join(', ')}`);
        setTimeout(askQuestion, 100); // Small delay to prevent rapid loops
      }
    } else {
      console.log(`Please choose one of: ${choices.map(c => c.key).join(', ')}`);
      setTimeout(askQuestion, 100); // Small delay to prevent rapid loops
    }
  }

  // Cleanup method to call on process exit
  static cleanup(): void {
    if (this.isRawModeEnabled && process.stdin.setRawMode) {
      try {
        process.stdin.setRawMode(false);
        this.isRawModeEnabled = false;
      } catch (error) {
        Logger.debug('Failed to cleanup raw mode:', error);
      }
    }

    // Make sure stdin is paused
    try {
      process.stdin.pause();
    } catch (error) {
      Logger.debug('Failed to pause stdin:', error);
    }
  }
}

// Auto-cleanup on process exit
process.on('exit', () => InteractivePrompt.cleanup());
process.on('SIGINT', () => {
  InteractivePrompt.cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  InteractivePrompt.cleanup();
  process.exit(0);
});

// Utility function for simple yes/no prompts
export async function askYesNo(message: string, defaultChoice: 'y' | 'n' = 'n'): Promise<boolean> {
  try {
    const choice = await InteractivePrompt.prompt({
      message,
      choices: [
        { key: 'y', description: 'Yes' },
        { key: 'n', description: 'No' },
      ],
      defaultChoice,
    });

    return choice === 'y';
  } catch (error) {
    Logger.debug('askYesNo error:', error);
    return defaultChoice === 'y';
  }
}

// Utility function for commit action prompts
export async function askCommitAction(): Promise<'use' | 'copy' | 'regenerate' | 'cancel'> {
  try {
    const choice = await InteractivePrompt.prompt({
      message: '📋 Available actions:',
      choices: [
        { key: 'y', description: 'Use this message and copy commit command' },
        { key: 'c', description: 'Copy message to clipboard (if available)' },
        { key: 'r', description: 'Regenerate message' },
        { key: 'n', description: 'Cancel' },
      ],
      defaultChoice: 'y',
    });

    switch (choice) {
      case 'y': return 'use';
      case 'c': return 'copy';
      case 'r': return 'regenerate';
      case 'n': return 'cancel';
      default: return 'cancel';
    }
  } catch (error) {
    Logger.debug('askCommitAction error:', error);
    return 'cancel';
  }
}
