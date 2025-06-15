import type { ConfigSources, GitChanges, ModelInfo, OllamaCommitConfig } from '../types';

export interface IGitService {
  getChanges(verbose: boolean, autoStage: boolean): GitChanges;
  getBranchName(): string;
  getLastCommitHash(): string;
  getRepositoryRoot(): string;
  isGitRepository(): boolean;
}

export interface IOllamaService {
  generateCommitMessage(
    model: string,
    host: string,
    prompt: string,
    verbose?: boolean,
  ): Promise<string>;
  testConnection(host: string, verbose?: boolean): Promise<boolean>;
  getModels(host: string): Promise<ModelInfo[]>;
  isModelAvailable(host: string, model: string): Promise<boolean>;
}

export interface IPromptService {
  getSystemPrompt(promptFile: string, verbose: boolean, promptTemplate?: string): string;
  buildCommitPrompt(filesInfo: string, diff: string, systemPrompt: string): string;
  validatePrompt(prompt: string): { valid: boolean; errors: string[] };
  getPromptTemplates(): Record<string, string>;
  createPromptFromTemplate(templateName: string): string;
}

export interface ILogger {
  setVerbose(enabled: boolean): void;
  setDebug(enabled: boolean): void;
  isVerbose(): boolean;
  isDebug(): boolean;
  info(message: string, ...args: unknown[]): void;
  success(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, error?: unknown): void;
  debug(message: string, ...args: unknown[]): void;
  log(
    level: 'info' | 'warn' | 'error' | 'success' | 'debug',
    message: string,
    ...args: unknown[]
  ): void;
  table(data: Record<string, unknown>[]): void;
  group(label: string, fn: () => void): void;
  time(label: string): void;
  timeEnd(label: string): void;
}

export interface IConfigManager {
  initialize(): Promise<void>;
  get<K extends keyof OllamaCommitConfig>(key: K): OllamaCommitConfig[K];
  reload(): Promise<void>;
  getConfigSources(): Promise<ConfigSources>;
}
