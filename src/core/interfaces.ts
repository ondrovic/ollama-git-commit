import type {
  ActiveFile,
  ConfigSources,
  ContextProvider,
  GitChanges,
  ModelConfig,
  ModelInfo,
  ModelRole,
  OllamaCommitConfig,
} from '../types';

export interface IGitService {
  getChanges(verbose: boolean, autoStage: boolean): GitChanges;
  getBranchName(): string;
  getLastCommitHash(): string;
  getRepositoryRoot(): string;
  isGitRepository(): boolean;
  execCommand(command: string, quiet?: boolean): string;
  setQuiet(quiet: boolean): void;
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
  generateEmbeddings(model: string, text: string, host?: string): Promise<number[]>;
  generateEmbeddingsBatch(model: string, texts: string[], host?: string): Promise<number[][]>;
  setQuiet(quiet: boolean): void;
}

export interface IPromptService {
  getSystemPrompt(promptFile: string, verbose: boolean, promptTemplate?: string): string;
  buildCommitPrompt(filesInfo: string, diff: string, systemPrompt: string): string;
  buildCommitPromptWithContext(
    filesInfo: string,
    diff: string,
    systemPrompt: string,
    contextProviders: ContextProvider[],
    directory: string,
    verbose?: boolean,
  ): Promise<string>;
  buildCommitPromptWithEmbeddings(
    filesInfo: string,
    diff: string,
    systemPrompt: string,
    ollamaService: IOllamaService,
    embeddingsModel: string,
    host: string,
  ): Promise<string>;
  validatePrompt(prompt: string): { valid: boolean; errors: string[] };
  getPromptTemplates(): Record<string, string>;
  createPromptFromTemplate(templateName: string): string;
  setQuiet(quiet: boolean): void;
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
  // Custom log methods for specific icons
  version(message: string, ...args: unknown[]): void;
  increment(message: string, ...args: unknown[]): void;
  changelog(message: string, ...args: unknown[]): void;
  tag(message: string, ...args: unknown[]): void;
  rocket(message: string, ...args: unknown[]): void;
  package(message: string, ...args: unknown[]): void;
  floppy(message: string, ...args: unknown[]): void;
  test(message: string, ...args: unknown[]): void;
  house(message: string, ...args: unknown[]): void;
  magnifier(message: string, ...args: unknown[]): void;
  hammer(message: string, ...args: unknown[]): void;
  memo(message: string, ...args: unknown[]): void;
  text(message: string, ...args: unknown[]): void;
  plain(message: string, ...args: unknown[]): void;
  settings(message: string, ...args: unknown[]): void;
  current(message: string, ...args: unknown[]): void;
  tableInfo(message: string, ...args: unknown[]): void;
}

/**
 * IConfigManager defines the interface for configuration management.
 * It is implemented by both ConfigManager and MockedConfigManager.
 * MockedConfigManager is used in tests to isolate tests from real filesystem/network.
 */
export interface IConfigManager {
  initialize(): Promise<void>;
  getConfig(): Promise<OllamaCommitConfig>;
  getConfigByType(type: 'user' | 'local'): Promise<OllamaCommitConfig>;
  saveConfig(config: Partial<OllamaCommitConfig>, type?: 'user' | 'local'): Promise<void>;
  removeConfig(type: 'user' | 'local'): Promise<void>;
  getConfigFiles(): Promise<{
    user: string;
    local: string;
    active: ActiveFile[];
  }>;
  getDebugInfo(): Promise<Record<string, unknown>>;
  getConfigSources(): Promise<ConfigSources>;
  // New multi-model methods
  getModelByRole(role: ModelRole): Promise<ModelConfig | null>;
  getEmbeddingsModel(): Promise<ModelConfig | null>;
  getContextProviders(): Promise<ContextProvider[]>;
  getChatModel(): Promise<ModelConfig | null>;
  getPrimaryModel(): Promise<string>;
  // Config keys method for the keys command
  getConfigKeys(): Promise<
    Array<{
      key: string;
      description: string;
      type: string;
      default: unknown;
      example?: string;
    }>
  >;
}
