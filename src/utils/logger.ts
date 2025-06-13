type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';
type LogArgs = unknown[];

export class Logger {
  private static verbose = false;
  private static debugMode = false;

  static setVerbose(enabled: boolean): void {
    this.verbose = enabled;
  }

  static setDebug(enabled: boolean): void {
    this.debugMode = enabled;
    if (enabled) {
      this.verbose = true;
    }
  }

  static isVerbose(): boolean {
    return this.verbose;
  }

  static isDebug(): boolean {
    return this.debugMode;
  }

  static info(message: string, ...args: LogArgs): void {
    if (this.verbose) {
      console.log(`🔍 ${message}`, ...args);
    }
  }

  static success(message: string, ...args: LogArgs): void {
    console.log(`✅ ${message}`, ...args);
  }

  static warn(message: string, ...args: LogArgs): void {
    console.log(`⚠️  ${message}`, ...args);
  }

  static error(message: string, ...args: LogArgs): void {
    console.error(`❌ ${message}`, ...args);
  }

  static debug(message: string, ...args: LogArgs): void {
    if (this.debugMode) {
      console.log(`🐛 ${message}`, ...args);
    }
  }

  static log(level: LogLevel, message: string, ...args: LogArgs): void {
    switch (level) {
      case 'info':
        this.info(message, ...args);
        break;
      case 'warn':
        this.warn(message, ...args);
        break;
      case 'error':
        this.error(message, ...args);
        break;
      case 'success':
        this.success(message, ...args);
        break;
      case 'debug':
        this.debug(message, ...args);
        break;
      default:
        console.log(message, ...args);
    }
  }

  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  static formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }

    return `${seconds}s`;
  }

  static table(data: Record<string, unknown>[]): void {
    if (this.verbose) {
      console.table(data);
    }
  }

  static group(label: string, fn: () => void): void {
    if (this.verbose) {
      console.group(`📋 ${label}`);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  }

  static time(label: string): void {
    if (this.debugMode) {
      console.time(label);
    }
  }

  static timeEnd(label: string): void {
    if (this.debugMode) {
      console.timeEnd(label);
    }
  }
}
