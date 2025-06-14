export interface CommitConfig {
  model?: string;
  host?: string;
  verbose?: boolean;
  interactive?: boolean;
  promptFile?: string;
  debug?: boolean;
  autoStage?: boolean;
  autoModel?: boolean;
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
