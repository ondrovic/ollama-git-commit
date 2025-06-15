export const MODELS = {
  DEFAULT: 'mistral:7b-instruct',
  PREFERRED: [
    'llama3.2:latest',
    'llama3.2:3b',
    'llama3.2:1b',
    'llama3:latest',
    'llama3:8b',
    'codellama:latest',
    'codellama:7b',
    'mistral:latest',
    'mistral:7b',
    'mistral:7b-instruct',
    'qwen2.5:latest',
    'qwen2.5:7b',
    'deepseek-coder:latest',
    'deepseek-coder:6.7b',
    'phi3:latest',
    'gemma2:latest',
  ] as const,
  POPULAR: `🚀 Popular models for code tasks:
      ollama pull llama3.2        # Fast, good for most tasks
      ollama pull codellama       # Specialized for code
      ollama pull mistral         # Good balance of speed/quality
      ollama pull qwen2.5:7b      # Excellent for coding
      ollama pull deepseek-coder  # Great for code understanding
      ` as const,
  CONFIGURATION: `⚙️  Configuration options:
      - Set default model: edit ~/.config/ollama-git-commit/config.json
      - Auto-select best: ollama-git-commit --auto-model -d /path/to/repo
      - Project-specific: create .ollama-git-commit.json in your repo
      ` as const,
} as const;
