import { EMOJIS, SIZE_UNITS } from '../constants/ui';
import { ILogger } from '../core/interfaces';

export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';
export type LogArgs = unknown[];

export class Logger implements ILogger {
  private verbose = false;
  private debugMode = false;

  // Static default instance for global use
  private static defaultInstance: Logger = new Logger();

  static getDefault(): Logger {
    return Logger.defaultInstance;
  }

  setVerbose(enabled: boolean): void {
    this.verbose = enabled;
  }

  setDebug(enabled: boolean): void {
    this.debugMode = enabled;
    if (enabled) {
      this.verbose = true;
    }
  }

  isVerbose(): boolean {
    return this.verbose;
  }

  isDebug(): boolean {
    return this.debugMode;
  }

  info(message: string, ...args: LogArgs): void {
    if (this.verbose) {
      console.info(`${EMOJIS.INFO} ${message}`, ...args);
    }
  }

  success(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.SUCCESS} ${message}`, ...args);
  }

  warn(message: string, ...args: LogArgs): void {
    console.warn(`${EMOJIS.WARNING} ${message}`, ...args);
  }

  error(message: string, ...args: LogArgs): void {
    console.error(`${EMOJIS.ERROR} ${message}`, ...args);
  }

  debug(message: string, ...args: LogArgs): void {
    if (this.debugMode) {
      console.log(`🐛 ${message}`, ...args);
    }
  }

  log(level: LogLevel, message: string, ...args: LogArgs): void {
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

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = bytes / Math.pow(k, i);
    const formattedSize = size < 10 ? size.toFixed(1) : Math.round(size).toString();
    return `${formattedSize} ${SIZE_UNITS[i]}`;
  }

  formatDuration(ms: number): string {
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

  table(data: Record<string, unknown>[]): void {
    if (this.verbose) {
      console.table(data);
    }
  }

  group(label: string, fn: () => void): void {
    if (this.verbose) {
      console.group(`📋 ${label}`);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  }

  time(label: string): void {
    if (this.debugMode) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.debugMode) {
      console.timeEnd(label);
    }
  }

  // --- Static proxies for backward compatibility ---
  static setVerbose(enabled: boolean): void {
    Logger.getDefault().setVerbose(enabled);
  }
  static setDebug(enabled: boolean): void {
    Logger.getDefault().setDebug(enabled);
  }
  static isVerbose(): boolean {
    return Logger.getDefault().isVerbose();
  }
  static isDebug(): boolean {
    return Logger.getDefault().isDebug();
  }
  static info(message: string, ...args: LogArgs): void {
    Logger.getDefault().info(message, ...args);
  }
  static success(message: string, ...args: LogArgs): void {
    Logger.getDefault().success(message, ...args);
  }
  static warn(message: string, ...args: LogArgs): void {
    Logger.getDefault().warn(message, ...args);
  }
  static error(message: string, ...args: LogArgs): void {
    Logger.getDefault().error(message, ...args);
  }
  static debug(message: string, ...args: LogArgs): void {
    Logger.getDefault().debug(message, ...args);
  }
  static log(level: LogLevel, message: string, ...args: LogArgs): void {
    Logger.getDefault().log(level, message, ...args);
  }
  static formatBytes(bytes: number): string {
    return Logger.getDefault().formatBytes(bytes);
  }
  static formatDuration(ms: number): string {
    return Logger.getDefault().formatDuration(ms);
  }
  static table(data: Record<string, unknown>[]): void {
    Logger.getDefault().table(data);
  }
  static group(label: string, fn: () => void): void {
    Logger.getDefault().group(label, fn);
  }
  static time(label: string): void {
    Logger.getDefault().time(label);
  }
  static timeEnd(label: string): void {
    Logger.getDefault().timeEnd(label);
  }
}
