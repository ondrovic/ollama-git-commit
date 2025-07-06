import { EMOJIS, SIZE_UNITS } from '../constants/ui';
import { ILogger } from '../core/interfaces';
import { BoxOptions, createBorderedLine, createBox, createDivider, createSectionBox } from './box';

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
    console.info(`${EMOJIS.INFO} ${message}`, ...args);
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
      console.log(`${EMOJIS.DEBUG} ${message}`, ...args);
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

  group(label: string, fn: () => void | Promise<void>): void {
    if (this.verbose) {
      console.group(`${EMOJIS.GROUP} ${label}`);
      const result = fn();
      if (result instanceof Promise) {
        result.finally(() => console.groupEnd());
      } else {
        console.groupEnd();
      }
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

  version(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.VERSION} ${message}`, ...args);
  }

  increment(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.INCREMENT} ${message}`, ...args);
  }

  changelog(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.CHANGELOG} ${message}`, ...args);
  }

  tag(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.TAG} ${message}`, ...args);
  }

  rocket(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.ROCKET} ${message}`, ...args);
  }

  package(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.PACKAGE} ${message}`, ...args);
  }

  floppy(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.FLOPPY} ${message}`, ...args);
  }

  test(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.TEST} ${message}`, ...args);
  }

  house(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.HOUSE} ${message}`, ...args);
  }

  magnifier(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.MAGNIFIER} ${message}`, ...args);
  }

  hammer(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.HAMMER} ${message}`, ...args);
  }

  memo(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.MEMO} ${message}`, ...args);
  }

  text(message: string, ...args: LogArgs): void {
    if (this.verbose) {
      console.log(message, ...args);
    }
  }

  plain(message: string, ...args: LogArgs): void {
    console.log(message, ...args);
  }

  settings(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.SETTINGS} ${message}`, ...args);
  }

  current(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.CURRENT} ${message}`, ...args);
  }

  tableInfo(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.TABLE} ${message}`, ...args);
  }

  clock(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.CLOCK} ${message}`, ...args);
  }

  celebrate(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.CELEBRATE} ${message}`, ...args);
  }

  question(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.QUESTION} ${message}`, ...args);
  }

  retry(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.RETRY} ${message}`, ...args);
  }

  up(message: string, ...args: LogArgs): void {
    console.log(`${EMOJIS.UP} ${message}`, ...args);
  }

  // Box utility methods
  box(content: string | string[], options?: BoxOptions): void {
    const boxLines = createBox(content, options);
    boxLines.forEach(line => this.plain(line));
  }

  sectionBox(title: string, content: string | string[], options?: BoxOptions): void {
    const boxLines = createSectionBox(title, content, options);
    boxLines.forEach(line => this.plain(line));
  }

  borderedLine(content: string, options?: BoxOptions): void {
    const line = createBorderedLine(content, options);
    this.plain(line);
  }

  divider(width?: number, style?: string): void {
    const line = createDivider(width, style);
    this.plain(line);
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
  static group(label: string, fn: () => void | Promise<void>): void {
    Logger.getDefault().group(label, fn);
  }
  static time(label: string): void {
    Logger.getDefault().time(label);
  }
  static timeEnd(label: string): void {
    Logger.getDefault().timeEnd(label);
  }
  static version(message: string, ...args: LogArgs): void {
    Logger.getDefault().version(message, ...args);
  }
  static increment(message: string, ...args: LogArgs): void {
    Logger.getDefault().increment(message, ...args);
  }
  static changelog(message: string, ...args: LogArgs): void {
    Logger.getDefault().changelog(message, ...args);
  }
  static tag(message: string, ...args: LogArgs): void {
    Logger.getDefault().tag(message, ...args);
  }
  static rocket(message: string, ...args: LogArgs): void {
    Logger.getDefault().rocket(message, ...args);
  }
  static package(message: string, ...args: LogArgs): void {
    Logger.getDefault().package(message, ...args);
  }
  static floppy(message: string, ...args: LogArgs): void {
    Logger.getDefault().floppy(message, ...args);
  }
  static test(message: string, ...args: LogArgs): void {
    Logger.getDefault().test(message, ...args);
  }
  static house(message: string, ...args: LogArgs): void {
    Logger.getDefault().house(message, ...args);
  }
  static magnifier(message: string, ...args: LogArgs): void {
    Logger.getDefault().magnifier(message, ...args);
  }
  static hammer(message: string, ...args: LogArgs): void {
    Logger.getDefault().hammer(message, ...args);
  }
  static memo(message: string, ...args: LogArgs): void {
    Logger.getDefault().memo(message, ...args);
  }
  static text(message: string, ...args: LogArgs): void {
    Logger.getDefault().text(message, ...args);
  }
  static plain(message: string, ...args: LogArgs): void {
    Logger.getDefault().plain(message, ...args);
  }
  static settings(message: string, ...args: LogArgs): void {
    Logger.getDefault().settings(message, ...args);
  }
  static current(message: string, ...args: LogArgs): void {
    Logger.getDefault().current(message, ...args);
  }
  static tableInfo(message: string, ...args: LogArgs): void {
    Logger.getDefault().tableInfo(message, ...args);
  }
  static clock(message: string, ...args: LogArgs): void {
    Logger.getDefault().clock(message, ...args);
  }
  static celebrate(message: string, ...args: LogArgs): void {
    Logger.getDefault().celebrate(message, ...args);
  }
  static question(message: string, ...args: LogArgs): void {
    Logger.getDefault().question(message, ...args);
  }
  static retry(message: string, ...args: LogArgs): void {
    Logger.getDefault().retry(message, ...args);
  }
  static up(message: string, ...args: LogArgs): void {
    Logger.getDefault().up(message, ...args);
  }
  // Static box utility methods
  static box(content: string | string[], options?: BoxOptions): void {
    Logger.getDefault().box(content, options);
  }

  static sectionBox(title: string, content: string | string[], options?: BoxOptions): void {
    Logger.getDefault().sectionBox(title, content, options);
  }

  static borderedLine(content: string, options?: BoxOptions): void {
    Logger.getDefault().borderedLine(content, options);
  }

  static divider(width?: number, style?: string): void {
    Logger.getDefault().divider(width, style);
  }
}
