import { Logger } from './logger';

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

    return new Promise((resolve) => {
      // Try different input methods based on runtime
      if (this.isBunRuntime()) {
        this.handleBunInput(choices, defaultChoice, resolve);
      } else {
        this.handleNodeInput(choices, defaultChoice, resolve);
      }
    });
  }

  private static isBunRuntime(): boolean {
    // @ts-ignore - Bun global exists only in Bun runtime
    return typeof Bun !== 'undefined' || process.versions?.bun !== undefined;
  }

  private static handleBunInput(
    choices: { key: string; description: string }[],
    defaultChoice: string | undefined,
    resolve: (value: string) => void
  ): void {
    // For Bun, use the console iterator approach with proper cleanup
    const askQuestion = async () => {
      process.stdout.write('What would you like to do? ');
      
      if (defaultChoice) {
        process.stdout.write(`[${defaultChoice}]: `);
      }

      try {
        // Use console iterator for Bun
        const iterator = (console as any)[Symbol.asyncIterator]();
        const result = await iterator.next();
        
        if (result.done) {
          resolve(defaultChoice || 'n');
          return;
        }

        const input = result.value?.toString().trim().toLowerCase() || '';
        const choice = input || defaultChoice || '';

        // Clean up the iterator
        if (iterator.return) {
          await iterator.return();
        }

        this.handleChoice(choice, choices, resolve, askQuestion);
      } catch (error) {
        Logger.debug('Bun input error:', error);
        // Fallback to default choice
        resolve(defaultChoice || 'n');
      }
    };

    askQuestion();
  }

  private static handleNodeInput(
    choices: { key: string; description: string }[],
    defaultChoice: string | undefined,
    resolve: (value: string) => void
  ): void {
    const askQuestion = () => {
      process.stdout.write('What would you like to do? ');
      
      if (defaultChoice) {
        process.stdout.write(`[${defaultChoice}]: `);
      }

      // Only set raw mode if it's not already enabled
      if (!this.isRawModeEnabled && process.stdin.setRawMode) {
        try {
          process.stdin.setRawMode(true);
          this.isRawModeEnabled = true;
        } catch (error) {
          Logger.debug('Failed to set raw mode:', error);
        }
      }

      process.stdin.resume();
      
      const cleanup = () => {
        if (this.isRawModeEnabled && process.stdin.setRawMode) {
          try {
            process.stdin.setRawMode(false);
            this.isRawModeEnabled = false;
          } catch (error) {
            Logger.debug('Failed to unset raw mode:', error);
          }
        }
        process.stdin.pause();
      };

      const onData = (data: Buffer) => {
        const choice = data.toString().toLowerCase().trim();
        
        // Clean up listeners
        process.stdin.removeListener('data', onData);
        process.stdin.removeListener('error', onError);
        cleanup();

        console.log(choice); // Echo the choice

        this.handleChoice(choice, choices, resolve, askQuestion);
      };

      const onError = (error: Error) => {
        Logger.debug('Stdin error:', error);
        process.stdin.removeListener('data', onData);
        process.stdin.removeListener('error', onError);
        cleanup();
        resolve(defaultChoice || 'n');
      };

      process.stdin.once('data', onData);
      process.stdin.once('error', onError);

      // Timeout fallback to prevent hanging
      const timeout = setTimeout(() => {
        process.stdin.removeListener('data', onData);
        process.stdin.removeListener('error', onError);
        cleanup();
        console.log('\nTimeout - using default choice');
        resolve(defaultChoice || 'n');
      }, 30000); // 30 second timeout

      process.stdin.once('data', () => clearTimeout(timeout));
    };

    askQuestion();
  }

  private static handleChoice(
    choice: string,
    choices: { key: string; description: string }[],
    resolve: (value: string) => void,
    askQuestion: () => void
  ): void {
    const validChoice = choices.find(c => c.key === choice);
    
    if (validChoice) {
      resolve(choice);
    } else {
      console.log(`Please choose one of: ${choices.map(c => c.key).join(', ')}`);
      askQuestion();
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
  const choice = await InteractivePrompt.prompt({
    message,
    choices: [
      { key: 'y', description: 'Yes' },
      { key: 'n', description: 'No' }
    ],
    defaultChoice
  });
  
  return choice === 'y';
}

// Utility function for commit action prompts
export async function askCommitAction(): Promise<'use' | 'copy' | 'regenerate' | 'cancel'> {
  const choice = await InteractivePrompt.prompt({
    message: '📋 Available actions:',
    choices: [
      { key: 'y', description: 'Use this message and copy commit command' },
      { key: 'c', description: 'Copy message to clipboard (if available)' },
      { key: 'r', description: 'Regenerate message' },
      { key: 'n', description: 'Cancel' }
    ],
    defaultChoice: 'y'
  });

  switch (choice) {
    case 'y': return 'use';
    case 'c': return 'copy';
    case 'r': return 'regenerate';
    case 'n': return 'cancel';
    default: return 'cancel';
  }
}