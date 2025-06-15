export const VERSION = '1.0.1';
export const APP_NAME = 'ollama-git-commit';
export const DEFAULT_MODEL = 'llama3.2:latest';
export const DEFAULT_HOST = 'http://localhost:11434';
export const DEFAULT_TIMEOUTS = {
  CONNECTION: 10000, // 10 seconds
  GENERATION: 120000, // 2 minutes
  MODEL_PULL: 300000, // 5 minutes
} as const;
