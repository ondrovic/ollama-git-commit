import { SPINNER_FRAMES } from '../constants/ui';
import { Logger } from './logger';

// DI interfaces
export interface IProcessOutput {
  write: (data: string) => boolean;
}

export interface ITimer {
  setInterval: (callback: () => void, ms: number) => NodeJS.Timeout;
  clearInterval: (id: NodeJS.Timeout) => void;
}

export interface ILogger {
  info: (message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warn: (message: string) => void;
}

// Default implementations
const defaultProcessOutput: IProcessOutput = {
  write: (data: string) => process.stdout.write(data),
};

const defaultTimer: ITimer = {
  setInterval: (callback: () => void, ms: number) => setInterval(callback, ms),
  clearInterval: (id: NodeJS.Timeout) => clearInterval(id),
};
// QUESTION: should this be using ILogger
const defaultLogger: ILogger = {
  info: (message: string) => Logger.info(message),
  success: (message: string) => Logger.success(message),
  error: (message: string) => Logger.error(message),
  warn: (message: string) => Logger.warn(message),
};

export class Spinner {
  private interval: NodeJS.Timeout | null = null;
  private isSpinning = false;
  private readonly frames = SPINNER_FRAMES;
  private currentFrame = 0;
  private message = '';

  constructor(
    private processOutput: IProcessOutput = defaultProcessOutput,
    private timer: ITimer = defaultTimer,
    // QUESTION: should this be using ILogger
    private logger: ILogger = defaultLogger,
  ) {}

  start(message = 'Loading'): void {
    if (this.isSpinning) {
      this.stop();
    }

    this.message = message;
    this.isSpinning = true;
    this.currentFrame = 0;

    // Hide cursor
    this.processOutput.write('\x1B[?25l');

    this.interval = this.timer.setInterval(() => {
      this.processOutput.write(`\r${this.frames[this.currentFrame]} ${this.message}`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 100);
  }

  updateMessage(message: string): void {
    this.message = message;
  }

  stop(finalMessage?: string): void {
    if (!this.isSpinning) {
      return;
    }

    if (this.interval) {
      this.timer.clearInterval(this.interval);
      this.interval = null;
    }

    this.isSpinning = false;

    // Clear the spinner line
    this.processOutput.write('\r\x1B[K');

    // Show cursor
    this.processOutput.write('\x1B[?25h');

    if (finalMessage) {
      this.logger.info(finalMessage);
    }
  }

  succeed(message?: string): void {
    this.stop();
    if (message) {
      this.logger.success(message);
    }
  }

  fail(message?: string): void {
    this.stop();
    if (message) {
      this.logger.error(message);
    }
  }

  warn(message?: string): void {
    this.stop();
    if (message) {
      this.logger.warn(message);
    }
  }

  info(message?: string): void {
    this.stop();
    if (message) {
      this.logger.info(message);
    }
  }
}

export class MultiSpinner {
  private spinners: Map<
    string,
    { spinner: Spinner; status: 'spinning' | 'success' | 'error' | 'warning' }
  > = new Map();
  private completed = 0;
  private total = 0;

  constructor(
    private processOutput: IProcessOutput = defaultProcessOutput,
    private timer: ITimer = defaultTimer,
    private logger: ILogger = defaultLogger,
  ) {}

  add(id: string, message: string): void {
    const spinner = new Spinner(this.processOutput, this.timer, this.logger);
    this.spinners.set(id, { spinner, status: 'spinning' });
    this.total++;

    spinner.start(message);
  }

  succeed(id: string, message?: string): void {
    const item = this.spinners.get(id);
    if (item && item.status === 'spinning') {
      item.spinner.succeed(message);
      item.status = 'success';
      this.completed++;
    }
  }

  fail(id: string, message?: string): void {
    const item = this.spinners.get(id);
    if (item && item.status === 'spinning') {
      item.spinner.fail(message);
      item.status = 'error';
      this.completed++;
    }
  }

  warn(id: string, message?: string): void {
    const item = this.spinners.get(id);
    if (item && item.status === 'spinning') {
      item.spinner.warn(message);
      item.status = 'warning';
      this.completed++;
    }
  }

  update(id: string, message: string): void {
    const item = this.spinners.get(id);
    if (item && item.status === 'spinning') {
      item.spinner.updateMessage(message);
    }
  }

  stopAll(): void {
    for (const [, item] of this.spinners) {
      if (item.status === 'spinning') {
        item.spinner.stop();
      }
    }
  }

  isComplete(): boolean {
    return this.completed === this.total;
  }

  getProgress(): { completed: number; total: number; percentage: number } {
    return {
      completed: this.completed,
      total: this.total,
      percentage: this.total > 0 ? Math.round((this.completed / this.total) * 100) : 0,
    };
  }
}
