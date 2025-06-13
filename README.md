# 🤖 Ollama Git Commit Message Generator

A powerful CLI tool that generates meaningful, contextual commit messages using Ollama AI. This modern Node.js/TypeScript implementation fixes git diff parsing issues and provides better error handling, cross-platform compatibility, and a maintainable codebase.

[![npm version](https://badge.fury.io/js/ollama-git-commit.svg)](https://badge.fury.io/js/ollama-git-commit)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.12.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 🧠 **AI-Powered**: Uses Ollama models to generate intelligent commit messages
- 📊 **Context-Aware**: Analyzes file changes, additions, deletions, and code patterns
- 🎯 **Smart Staging**: Automatically detects staged vs unstaged changes
- 🔄 **Interactive Mode**: Review and regenerate messages before committing
- 📋 **Clipboard Support**: Copy messages to clipboard across platforms (macOS, Linux, Windows)
- 🐛 **Debug Mode**: Comprehensive troubleshooting and verbose output
- 🎨 **Emoji-Rich**: Fun, expressive commit messages with emojis
- 🎨 **Emoji Control**: Choose whether commit messages include emojis using the `useEmojis` config option
- ⚡ **Fast**: Optimized git diff parsing and API calls
- 🔧 **Robust**: Proper error handling and recovery mechanisms
- 🎭 **Template System**: Multiple prompt templates (conventional, simple, detailed)
- ⚙️ **Flexible Configuration**: Hierarchical config system with environment variables

## 🚀 Installation

### Prerequisites

- **Node.js 18.12+** (we recommend using the latest LTS version)
- **[Ollama](https://ollama.ai)** running locally or remotely
- **Git repository** (must be run within a git repository)

## 🎯 Quick Start

1. **Make sure Ollama is running**:

   ```bash
   ollama serve
   ```

2. **Install a model** (if you haven't already):

   ```bash
   ollama pull llama3.2
   # or
   ollama pull codellama
   ```

3. **Initialize configuration** (recommended):

   ```bash
   ollama-git-commit --config-init
   ```

4. **Stage your changes**:

   ```bash
   git add .
   ```

5. **Generate commit message**:

   ```bash
   ollama-git-commit -d .
   ```

6. **Follow the interactive prompts** to review, regenerate, or copy your commit message!

## 📖 Usage

### Basic Commands

```bash
# Generate commit message for staged changes
ollama-git-commit -d .

# Non-interactive mode (just display the message)
ollama-git-commit -d . -n

# Verbose output with detailed information
ollama-git-commit -d . -v

# Auto-stage all changes if nothing is staged
ollama-git-commit -d . --auto-stage

# Debug mode with comprehensive logging
ollama-git-commit -d . --debug
```

### Model Management

```bash
# Use specific model
ollama-git-commit -d . -m codellama

# Auto-select best available model
ollama-git-commit -d . --auto-model

# List all available models
ollama-git-commit --list-models

# Test connection to Ollama
ollama-git-commit --test

# Test with simple prompt (debug JSON issues)
ollama-git-commit --test-simple
```

### Configuration Commands

```bash
# Initialize default configuration
ollama-git-commit --config-init

# Show current configuration
ollama-git-commit --config-show

# Show detailed configuration debug information
ollama-git-commit --config-debug

# Test clipboard functionality
ollama-git-commit --debug-clipboard

# Test interactive prompts
ollama-git-commit --test-interactive
```

### Advanced Usage

```bash
# Custom Ollama host
ollama-git-commit -d . -H http://192.168.1.100:11434

# Custom prompt file
ollama-git-commit -d . -p ~/.config/my-custom-prompt.txt

# Combine multiple options
ollama-git-commit -d . -v -m llama3.2 --auto-stage --debug

# Non-interactive with custom model
ollama-git-commit -d . -n -m codellama --auto-stage
```

## ⚙️ Configuration

### Configuration System

The tool uses a hierarchical configuration system with the following priority order (highest to lowest):

1. **CLI Arguments** (highest priority)
2. **Environment Variables**
3. **Local Config File** (`./.ollama-git-commit.json`)
4. **Global Config File** (`~/.ollama-git-commit.json`)
5. **Default Config File** (`~/.config/ollama-git-commit/config.json`)
6. **Built-in Defaults** (lowest priority)

### Quick Configuration Setup

```bash
# Create default configuration file
ollama-git-commit --config-init

# View current configuration
ollama-git-commit --config-show

# Debug configuration issues
ollama-git-commit --config-debug
```

### Configuration Files

#### Default Configuration (`~/.config/ollama-git-commit/config.json`)

```json
{
  "model": "llama3.2:latest",
  "host": "http://localhost:11434",
  "verbose": false,
  "interactive": true,
  "debug": false,
  "autoStage": false,
  "autoModel": false,
  "useEmojis": true,
  "promptTemplate": "default",
  "timeouts": {
    "connection": 10000,
    "generation": 120000,
    "modelPull": 300000
  }
}
```

#### Project-Specific Configuration (`./.ollama-git-commit.json`)

```json
{
  "model": "deepseek-coder:6.7b",
  "autoStage": true,
  "promptTemplate": "detailed",
  "timeouts": {
    "generation": 180000
  }
}
```

#### User Global Configuration (`~/.ollama-git-commit.json`)

```json
{
  "model": "codellama:13b",
  "host": "http://192.168.1.100:11434",
  "verbose": true,
  "useEmojis": false,
  "promptTemplate": "conventional"
}
```

### Environment Variables

```bash
# Core settings
export OLLAMA_HOST=http://localhost:11434
export OLLAMA_COMMIT_MODEL=llama3.2:latest
export OLLAMA_COMMIT_HOST=http://192.168.1.100:11434  # Overrides OLLAMA_HOST

# Behavior settings
export OLLAMA_COMMIT_VERBOSE=true
export OLLAMA_COMMIT_DEBUG=true
export OLLAMA_COMMIT_AUTO_STAGE=true
export OLLAMA_COMMIT_AUTO_MODEL=true

# File paths
export OLLAMA_COMMIT_PROMPT_FILE=/path/to/custom/prompt.txt

# Timeouts (in milliseconds)
export OLLAMA_COMMIT_TIMEOUT_CONNECTION=15000
export OLLAMA_COMMIT_TIMEOUT_GENERATION=180000

# Add to your shell profile (.bashrc, .zshrc, etc.)
echo 'export OLLAMA_HOST=http://192.168.1.100:11434' >> ~/.zshrc
```

### Emoji Handling

You can control whether generated commit messages include emojis by setting the `useEmojis` option in your configuration file. By default, emojis are included. To disable emojis:

**Project-specific config (`.ollama-git-commit.json` in your repo root):**

```json
{
  "useEmojis": false
}
```

**Global config (`~/.config/ollama-git-commit/config.json`):**

```json
{
  "useEmojis": false
}
```

When `useEmojis` is set to `false`, all emojis will be stripped from generated commit messages.

### Host Configuration

You can set the Ollama host in your config file as well:

```json
{
  "host": "http://localhost:11434"
}
```

### Cleaner Output

The CLI now outputs only the commit message text (not the full JSON response from Ollama).

## 📖 Usage

### Basic Commands

```bash
# Generate commit message for staged changes
ollama-git-commit -d .

# Non-interactive mode (just display the message)
ollama-git-commit -d . -n

# Verbose output with detailed information
ollama-git-commit -d . -v

# Auto-stage all changes if nothing is staged
ollama-git-commit -d . --auto-stage

# Debug mode with comprehensive logging
ollama-git-commit -d . --debug
```

### Model Management

```bash
# Use specific model
ollama-git-commit -d . -m codellama

# Auto-select best available model
ollama-git-commit -d . --auto-model

# List all available models
ollama-git-commit --list-models

# Test connection to Ollama
ollama-git-commit --test

# Test with simple prompt (debug JSON issues)
ollama-git-commit --test-simple
```

### Configuration Commands

```bash
# Initialize default configuration
ollama-git-commit --config-init

# Show current configuration
ollama-git-commit --config-show

# Show detailed configuration debug information
ollama-git-commit --config-debug

# Test clipboard functionality
ollama-git-commit --debug-clipboard

# Test interactive prompts
ollama-git-commit --test-interactive
```

### Advanced Usage

```bash
# Custom Ollama host
ollama-git-commit -d . -H http://192.168.1.100:11434

# Custom prompt file
ollama-git-commit -d . -p ~/.config/my-custom-prompt.txt

# Combine multiple options
ollama-git-commit -d . -v -m llama3.2 --auto-stage --debug

# Non-interactive with custom model
ollama-git-commit -d . -n -m codellama --auto-stage
```

## 🔧 CLI Options Reference

| Option               | Short | Description                             | Default      |
| -------------------- | ----- | --------------------------------------- | ------------ |
| `--directory`        | `-d`  | Directory to use                        | **Required** |
| `--model`            | `-m`  | Specify Ollama model                    | From config  |
| `--host`             | `-H`  | Ollama server URL                       | From config  |
| `--verbose`          | `-v`  | Show detailed output                    | `false`      |
| `--non-interactive`  | `-n`  | Skip confirmation prompts               | `false`      |
| `--prompt`           | `-p`  | Custom prompt file path                 | From config  |
| `--auto-stage`       |       | Auto-stage changes if nothing staged    | `false`      |
| `--test`             |       | Test connection to Ollama server        | -            |
| `--test-simple`      |       | Test with simple prompt for debugging   | -            |
| `--list-models`      |       | Show all available models               | -            |
| `--auto-model`       |       | Auto-select best available model        | `false`      |
| `--debug`            |       | Enable debug mode with detailed logging | `false`      |
| `--config-init`      |       | Create default configuration file       | -            |
| `--config-show`      |       | Show current configuration              | -            |
| `--config-debug`     |       | Show detailed config debug info         | -            |
| `--debug-clipboard`  |       | Test clipboard functionality            | -            |
| `--test-interactive` |       | Test interactive prompts                | -            |
| `--help`             | `-h`  | Show help message                       | -            |

## 🎨 Custom Prompts

### Default Prompt Templates

The tool includes several built-in prompt templates:

- **`default`**: Emoji-rich, expressive style
- **`conventional`**: Conventional Commits format
- **`simple`**: Clean, minimal style
- **`detailed`**: Comprehensive with full context

### Creating Custom Prompts

```bash
# Edit the default prompt
nano ~/.config/ollama-git-commit/prompt.txt

# Use a custom prompt file
ollama-git-commit -d . -p /path/to/your/custom-prompt.txt
```

#### Example: Conventional Commits Prompt

```text
Generate conventional commit messages following the format: type(scope): description

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert

Rules:
- Use lowercase for type and description
- Keep description under 72 characters
- Add body with bullet points for multiple changes
- Be specific about what changed and why
- Use present tense

Format:
type(scope): short description

- detailed change 1
- detailed change 2
```

#### Example: Simple & Clean Prompt

```text
Create simple, clear commit messages:

- Start with a verb (add, fix, update, remove, etc.)
- Mention what files or features were changed
- Keep it concise but informative
- Use normal capitalization
- No emojis or special formatting

Example: "Fix user authentication bug in login component"
```

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. "Model not found" error

```bash
# Check available models
ollama-git-commit --list-models

# Install a model
ollama pull llama3.2

# Or let the tool auto-select
ollama-git-commit -d . --auto-model
```

#### 2. "Connection refused" error

```bash
# Make sure Ollama is running
ollama serve

# Test the connection
ollama-git-commit --test

# Check configuration
ollama-git-commit --config-show
```

#### 3. "No changes detected"

```bash
# Check git status
git status

# Stage your changes
git add .

# Or auto-stage with the tool
ollama-git-commit -d . --auto-stage
```

#### 4. Empty or invalid responses

```bash
# Test with simple prompt
ollama-git-commit --test-simple

# Try a different model
ollama-git-commit -d . --auto-model

# Enable debug mode for detailed logs
ollama-git-commit -d . --debug -v
```

#### 5. Configuration issues

```bash
# Show current configuration
ollama-git-commit --config-show

# Debug configuration problems
ollama-git-commit --config-debug

# Reset to defaults
ollama-git-commit --config-init
```

#### 6. Interactive prompts not working

```bash
# Test interactive functionality
ollama-git-commit --test-interactive

# Check runtime compatibility
# The tool supports both Node.js and Bun
```

### Debug Mode

For comprehensive troubleshooting, enable debug mode:

```bash
ollama-git-commit -d . --debug -v
```

This shows:

- Configuration details and hierarchy
- Git repository status
- Available models
- API request/response details
- JSON parsing information
- File change analysis
- Error stack traces

### Performance Tips

1. **Large repositories**: The tool automatically truncates large diffs
2. **Slow responses**: Try smaller models like `llama3.2:1b`
3. **Network issues**: Use `--test` to verify connectivity
4. **Memory usage**: Use `--verbose` to monitor processing
5. **Timeout issues**: Adjust timeouts in configuration files

## 🌟 Example Output

```bash
$ ollama-git-commit -d . -v

🔍 Configuration:
   Model: llama3.2:latest
   Host: http://localhost:11434
   Interactive: true
   Config files: ~/.config/ollama-git-commit/config.json

📁 Using staged changes for commit message generation
📊 Change Statistics:
   Files changed: 3
   Insertions: 42
   Deletions: 8

📁 3 files changed:
📄 src/components/Button.tsx (modified) (+15 -3, 2 new functions/vars)
📄 src/styles/theme.css (modified) (+20 -5)
📄 README.md (modified) (+7 -0)

🤖 Generating commit message with llama3.2:latest...
✅ Response received

✨ Generated commit message:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
feat(ui): Add theme support and improve Button component

- Enhanced Button component with new variant props and accessibility features
- Added comprehensive theme system with dark/light mode support
- Updated documentation with component usage examples
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Available actions:
   [y] Use this message and copy commit command
   [c] Copy message to clipboard (if available)
   [r] Regenerate message
   [n] Cancel

What would you like to do? [y]: y

📋 Copy and run this command:
git commit -m "feat(ui): Add theme support and improve Button component

- Enhanced Button component with new variant props and accessibility features
- Added comprehensive theme system with dark/light mode support
- Updated documentation with component usage examples"
```

## 🔄 Differences from Shell Script

This Node.js version significantly improves upon the original shell script:

### ✅ **Improvements**

1. **Better Git Diff Parsing**: Proper handling of binary files, unicode characters, and large diffs
2. **Cross-Platform Compatibility**: Native Windows, macOS, and Linux support
3. **Enhanced Error Handling**: More descriptive error messages and recovery options
4. **Robust JSON Processing**: Proper JSON parsing with escaping and validation
5. **Memory Efficiency**: Streams large diffs instead of loading everything into memory
6. **Type Safety**: Full TypeScript implementation with strict typing
7. **Modular Architecture**: Clean separation of concerns and testable components
8. **Modern JavaScript**: ES modules, async/await, and modern Node.js features
9. **Comprehensive Configuration**: Hierarchical config system with environment variables
10. **Better Performance**: Optimized for speed and resource usage

### 🔧 **Technical Improvements**

- **Unicode Support**: Handles international characters correctly
- **Async Operations**: Non-blocking API calls and file operations
- **Proper Escaping**: Safe handling of special characters in commit messages
- **Timeout Handling**: Configurable request timeouts and cancellation
- **Progress Indicators**: Visual feedback during long operations
- **Clipboard Integration**: Cross-platform clipboard support
- **Configuration Management**: Flexible configuration with multiple sources

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/ondrovic/ollama-git-commit.git
cd ollama-git-commit

# Install dependencies
bun install

# Run in development mode
bun run dev

# Run tests
bun test

# Build for production
bun run build

# Lint and format
bun run lint
bun run format
```

### Project Structure

```
src/
├── cli.ts              # CLI entry point
├── index.ts            # Library exports
├── commands/           # Command implementations
├── core/              # Core business logic
│   ├── config.ts      # Configuration management
│   ├── git.ts         # Git operations
│   ├── ollama.ts      # Ollama API client
│   └── prompt.ts      # Prompt management
└── utils/             # Utility functions
    ├── clipboard.ts   # Clipboard operations
    ├── interactive.ts # Interactive prompts
    ├── logger.ts      # Logging utilities
    └── validation.ts  # Input validation
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai) for providing the AI model infrastructure
- Original shell script inspiration from the community
- Contributors and testers who helped improve this tool

## 🔗 Links

- [Ollama Documentation](https://ollama.ai/docs)
- [Node.js Downloads](https://nodejs.org/)
- [Bun Installation](https://bun.sh/docs/installation)
- [Report Issues](https://github.com/ondrovic/ollama-git-commit/issues)
- [Feature Requests](https://github.com/ondrovic/ollama-git-commit/discussions)

---

**Made with ❤️ by developers, for developers**
