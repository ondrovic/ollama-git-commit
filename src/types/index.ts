export type ActiveFile = { type: 'user' | 'local'; path: string; 'in-use': boolean };

export interface CommitOptions {
  directory?: string;
  model?: string;
  host?: string;
  verbose?: boolean;
  interactive?: boolean;
  promptFile?: string;
  debug?: boolean;
  autoStage?: boolean;
  autoModel?: boolean;
  autoCommit?: boolean;
  promptTemplate?: string;
  quiet?: boolean;
}

export interface CommitConfig {
  model: string;
  host: string;
  verbose: boolean;
  interactive: boolean;
  promptFile: string;
  debug: boolean;
  autoStage: boolean;
  autoModel: boolean;
  autoCommit: boolean;
  promptTemplate?: string;
  quiet: boolean;
}

export interface GitChanges {
  diff: string;
  staged: boolean;
  stats: {
    files: number;
    insertions: number;
    deletions: number;
  };
  filesInfo: string;
}

export interface OllamaResponse {
  response?: string;
  error?: string;
  model?: string;
  created_at?: string;
  done?: boolean;
}

// New interfaces for multi-model configuration
export interface ModelConfig {
  name: string;
  provider: 'ollama' | 'openai' | 'anthropic';
  model: string;
  roles: ModelRole[];
}

export type ModelRole = 'chat' | 'edit' | 'autocomplete' | 'apply' | 'summarize' | 'embed';

export interface ContextProvider {
  provider: 'code' | 'docs' | 'diff' | 'terminal' | 'problems' | 'folder' | 'codebase';
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export interface OllamaCommitConfig {
  // Core settings
  model: string;
  host: string;

  // Behavior settings
  verbose: boolean;
  interactive: boolean;
  debug: boolean;
  autoStage: boolean;
  autoModel: boolean;
  autoCommit: boolean;
  quiet: boolean;

  // File paths
  promptFile: string;
  configFile: string;

  // Network settings
  timeouts: {
    connection: number;
    generation: number;
    modelPull: number;
  };

  // UI settings
  useEmojis: boolean;
  promptTemplate: 'default' | 'conventional' | 'simple' | 'detailed';

  // Embeddings model (simple field for backward compatibility)
  embeddingsModel?: string;

  // New multi-model support (optional for backward compatibility)
  models?: ModelConfig[];
  embeddingsProvider?: string; // name of the model with 'embed' role

  // Context providers
  context?: ContextProvider[];
}

export interface ModelInfo {
  name: string;
  size: number;
  digest: string;
  details?: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface ConfigSourceInfo {
  model: string;
  host: string;
  promptFile: string;
  promptTemplate: string;
  verbose: string;
  interactive: string;
  debug: string;
  autoStage: string;
  autoModel: string;
  autoCommit: string;
  useEmojis: string;
  quiet: string;
  timeouts: {
    connection: string;
    generation: string;
    modelPull: string;
  };
  models?: string;
  embeddingsProvider?: string;
  embeddingsModel?: string;
  context?: string;
}

export interface ConfigSources {
  model?: string;
  host?: string;
  promptFile?: string;
  promptTemplate?: string;
  verbose?: string;
  interactive?: string;
  debug?: string;
  autoStage?: string;
  autoModel?: string;
  autoCommit?: string;
  useEmojis?: string;
  quiet?: string;
  timeouts?: {
    connection?: string;
    generation?: string;
    modelPull?: string;
  };
  models?: string;
  embeddingsProvider?: string;
  embeddingsModel?: string;
  context?: string;
}

export interface ConfigFileInfo {
  path: string;
  label: string;
  type: 'local' | 'global' | 'default';
}
