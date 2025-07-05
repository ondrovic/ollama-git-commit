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
}

/**
 * IConfigManager defines the interface for configuration management.
 * It is implemented by both ConfigManager and MockedConfigManager.
 * MockedConfigManager is used in tests to isolate tests from real filesystem/network.
 */
export interface IConfigManager {
  initialize(): Promise<void>;
  getConfig(): Promise<OllamaCommitConfig>;
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
}
