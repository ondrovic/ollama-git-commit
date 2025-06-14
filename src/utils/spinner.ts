export class Spinner {
  private interval: NodeJS.Timeout | null = null;
  private isSpinning = false;
  private readonly frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;
  private message = '';

  start(message = 'Loading'): void {
    if (this.isSpinning) {
      this.stop();
    }

    this.message = message;
    this.isSpinning = true;
    this.currentFrame = 0;

    // Hide cursor
    process.stdout.write('\x1B[?25l');

    this.interval = setInterval(() => {
      process.stdout.write(`\r${this.frames[this.currentFrame]} ${this.message}`);
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
      clearInterval(this.interval);
      this.interval = null;
    }

    this.isSpinning = false;

    // Clear the spinner line
    process.stdout.write('\r\x1B[K');

    // Show cursor
    process.stdout.write('\x1B[?25h');

    if (finalMessage) {
      console.log(finalMessage);
    }
  }

  succeed(message?: string): void {
    this.stop();
    if (message) {
      console.log(`✅ ${message}`);
    }
  }

  fail(message?: string): void {
    this.stop();
    if (message) {
      console.log(`❌ ${message}`);
    }
  }

  warn(message?: string): void {
    this.stop();
    if (message) {
      console.log(`⚠️  ${message}`);
    }
  }

  info(message?: string): void {
    this.stop();
    if (message) {
      console.log(`ℹ️  ${message}`);
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

  add(id: string, message: string): void {
    const spinner = new Spinner();
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
