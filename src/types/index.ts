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
  timeouts: {
    connection: string;
    generation: string;
    modelPull: string;
  };
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
  useEmojis?: string;
  timeouts?: {
    connection?: string;
    generation?: string;
    modelPull?: string;
  };
}

export interface ConfigFileInfo {
  path: string;
  label: string;
  type: 'local' | 'global' | 'default';
}
