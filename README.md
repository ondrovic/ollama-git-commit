# 🤖 Ollama Git Commit Message Generator

[![npm version](https://badge.fury.io/js/%40condrovic%2Follama-git-commit.svg)](https://badge.fury.io/js/@condrovic/ollama-git-commit)

A powerful CLI tool that generates meaningful, contextual commit messages using Ollama AI. This modern Node.js/TypeScript implementation fixes git diff parsing issues and provides better error handling, cross-platform compatibility, and a maintainable codebase.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.12.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Run Bun Tests](https://github.com/ondrovic/ollama-git-commit/actions/workflows/test.yml/badge.svg)](https://github.com/ondrovic/ollama-git-commit/actions/workflows/test.yml)

## 🚦 Continuous Integration (CI)

This project uses **GitHub Actions** to automatically run the test suite on every push and pull request to any branch.

- The workflow is defined in `.github/workflows/test.yml`
- All branches are tested automatically
- Tests are run using [Bun](https://bun.sh/) for fast and modern JavaScript/TypeScript execution
- Comprehensive test coverage for all new features and changes

**How it works:**

- On every push or PR, GitHub Actions will:
  1. Check out the code
  2. Set up Bun
  3. Install dependencies (`bun install`)
  4. Run the test suite (`bun test`)
  5. Run linting and type checking

You can view the status of your tests in the "Actions" tab of your GitHub repository.

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
- 🔧 **Robust**: Enhanced error handling and validation mechanisms
- 🎭 **Template System**: Multiple prompt templates (conventional, simple, detailed)
- ⚙️ **Flexible Configuration**: Hierarchical config system with environment variables, project-local, and user-global settings
- 🔒 **Security**: Input sanitization and path validation for enhanced security
- 🛡️ **Environment Validation**: Comprehensive checks for Node.js, Git, and Ollama setup
- 🧪 **Testing Suite**: Comprehensive test coverage with mocks and utilities
- 🔍 **Debug Tools**: Advanced debugging commands for configuration and connection issues
- 📝 **Documentation**: Detailed guides for installation, configuration, and troubleshooting

## 🚀 Installation

### Global Installation for Development

For local development and testing, `bun link` can be used to symlink the package globally. However, due to known issues with `bun link` on some Windows environments, `npm link` is often a more reliable alternative.

First, make sure you have built the project:

```bash
bun run build
```

Then, from the root of this project, choose one of the following:

**Using Bun (may have issues on Windows):**

```bash
bun link
```

**Using npm (recommended for cross-platform reliability):**

```bash
npm link
```

After linking, the `ollama-git-commit` command should be available in your terminal globally. You might need to open a **new terminal window** for the changes to take effect.

### Development Workflow

When making changes to the codebase, use the following workflow:

1. Make your changes
2. Run the staging script to format, lint, and stage your changes:
   ```bash
   bun stage
   ```
3. Commit your changes:
   ```bash
   git commit -m "your commit message"
   ```

The staging script will:

- Update version numbers if needed
- Format your code
- Fix any linting issues
- Stage all files

### Permanent Global Installation

If you want to install the package globally in a more permanent fashion (e.g., for general system use), using `npm` is currently recommended due to known issues with `bun install -g` on Windows.

```bash
npm install -g .
```

### Uninstallation

To remove the global installation of `ollama-git-commit`, use the command corresponding to how you installed it. You should run these commands from the root of the `ollama-git-commit` project directory if you used `npm link` or `bun link`.

**If you used `npm link` or `npm install -g .`:**

```bash
npm unlink # If run from the project directory
# OR (for full uninstallation)
npm uninstall -g @ondrovic/ollama-git-commit
```

**If you used `bun link` or `bun install -g .`:**

```bash
bun unlink # If run from the project directory
# OR (for full uninstallation)
bun uninstall -g @ondrovic/ollama-git-commit
```

**Troubleshooting Uninstallation (especially on Windows):**

If the above commands report success but `ollama-git-commit` is still available, it's likely due to lingering executable files or issues with how your environment manages global packages. You can find where the command is being executed from using:

```bash
where.exe ollama-git-commit
```

If this command returns a path (e.g., `C:\path\to\ollama-git-commit.cmd`), you may need to manually delete the associated files (`.cmd`, `.ps1`, or the executable itself) from that directory. Restarting your terminal after deletion is often required for changes to take effect.

### Prerequisites

- **Node.js 18.12+** (we recommend using the latest LTS version)
- **[Ollama](https://ollama.ai)** running locally or remotely
- **Git repository** (must be run within a git repository)
- **Git user configuration** (name and email) for proper commit attribution

### Environment Validation

The tool performs comprehensive environment validation to ensure all prerequisites are met:

- Node.js version compatibility check
- Git installation and repository validation
- Git user configuration verification
- Ollama host accessibility
- HTTP client availability
- Input sanitization and path validation

Any validation issues will be reported with helpful error messages and suggestions for resolution.

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
   ollama-git-commit config create user
   # or for local configuration
   ollama-git-commit config create local
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
ollama-git-commit list-models

# Test connection to Ollama
ollama-git-commit test connection

# Test with simple prompt (debug JSON issues)
ollama-git-commit test simple-prompt

# Run all tests
ollama-git-commit test all

# Benchmark model performance
ollama-git-commit test benchmark
```

### Configuration Commands

```bash
# Initialize default configuration
ollama-git-commit config create user
# or for local configuration
ollama-git-commit config create local

# Show current configuration
ollama-git-commit config show

# Show detailed configuration debug information
ollama-git-commit config debug

# Remove configuration
ollama-git-commit config remove user
# or
ollama-git-commit config remove local
```

### Configuration Sources

The tool supports multiple configuration sources in the following order of precedence:

1. Command-line arguments
2. Environment variables
3. Project-local configuration (`.ollama-git-commit.json`)
4. User-global configuration (`~/.ollama-git-commit.json`)
5. Default values

### Environment Variables

You can configure the tool using environment variables:

```bash
# Set Ollama host
export OLLAMA_HOST=http://localhost:11434

# Set default model
export OLLAMA_MODEL=codellama

# Disable emojis
export OLLAMA_USE_EMOJIS=false
```

### Project-Local Configuration

Create a `.ollama-git-commit.json` file in your project root:

```json
{
  "model": "codellama",
  "useEmojis": true,
  "promptTemplate": "conventional"
}
```

### User-Global Configuration

Create a `~/.ollama-git-commit.json` file:

```json
{
  "model": "llama2",
  "useEmojis": true,
  "promptTemplate": "detailed"
}
```

## 📚 Documentation

For more detailed information, check out our documentation:

- [Installation Guide](docs/installation.md)
- [Configuration Guide](docs/configuration.md)
- [Troubleshooting Guide](docs/troubleshooting.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📝 License

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

### 🧪 Testing & Mocks

All tests are designed to be fast, reliable, and isolated from your real environment:

- **MockedConfigManager**: Used in config-related tests to simulate configuration loading and environment variable overrides without touching real files.
- **mockFs**: Simulates file system operations (read, write, mkdir, etc.) for Git and prompt-related tests.
- **mockGit**: Simulates Git commands and responses for integration tests.
- **Mocked network (fetch)**: API calls to Ollama are intercepted and mocked for predictable results.
- **No real network or file system access**: All tests run in-memory and do not require a real Ollama server, Git repo, or config files.

To run all tests:

```bash
bun test
```

If you add new features, please use mocks for any external dependencies to keep tests fast and deterministic.

### Test Commands

```bash
# Test connection to Ollama server
ollama-git-commit test connection

# Test specific model
ollama-git-commit test model -m mistral:7b-instruct

# Test simple prompt generation
ollama-git-commit test simple-prompt

# Run all tests
ollama-git-commit test all

# Benchmark model performance
ollama-git-commit test benchmark -m mistral:7b-instruct
```
