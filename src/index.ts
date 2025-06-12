/**
 * Ollama Commit - Enhanced Git Commit Message Generator
 * 
 * A powerful CLI tool that generates meaningful, contextual commit messages using Ollama AI.
 * This is the main export file for programmatic usage.
 */

export { CommitCommand } from './commands/commit';
export { TestCommand } from './commands/test';
export { ModelsCommand } from './commands/models';

export { GitService } from './core/git';
export { OllamaService } from './core/ollama';
export { PromptService } from './core/prompt';

export { Logger } from './utils/logger';
export { validateNodeVersion, validateGitRepository } from './utils/validation';
export { copyToClipboard } from './utils/clipboard';
export { formatFileSize } from './utils/formatFileSize';
export { Spinner } from './utils/spinner';

// Types
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

// Default configuration
export const DEFAULT_CONFIG: Required<CommitConfig> = {
  model: 'mistral:7b-instruct',
  host: process.env.OLLAMA_HOST || 'http://192.168.0.3:11434',
  verbose: false,
  interactive: true,
  promptFile: '',
  debug: false,
  autoStage: false,
  autoModel: false,
};

// Version info
export const VERSION = '1.0.0';