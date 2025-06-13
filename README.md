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
- ⚡ **Fast**: Optimized git diff parsing and API calls
- 🔧 **Robust**: Proper error handling and recovery mechanisms
- 🎭 **Template System**: Multiple prompt templates (conventional, simple, detailed)

## 🚀 Installation

### Prerequisites

- **Node.js 18.12+** (we recommend using the latest LTS version)
- **[Ollama](https://ollama.ai)** running locally or remotely
- **Git repository** (must be run within a git repository)
> **⚠️ Windows Users**: This tool has limited Windows support. For the best experience, please use WSL (Windows Subsystem for Linux) or Git Bash. Some Git operations may fail on native Windows Command Prompt/PowerShell.

### Using Bun (Recommended)
![Pending](https://img.shields.io/badge/⏳-Pending-yellow)
```bash
# Install globally with bun
bun install -g ollama-git-commit

# Or add to your project
bun add ollama-git-commit
```

### Using npm/yarn/pnpm
![Pending](https://img.shields.io/badge/⏳-Pending-yellow)

```bash
# Install globally
npm install -g ollama-git-commit
# or
yarn global add ollama-git-commit
# or
pnpm add -g ollama-git-commit

# Or add to your project
npm install ollama-git-commit
# or
yarn add ollama-git-commit
# or
pnpm add ollama-git-commit
```

### Development Installation
![Preferred](https://img.shields.io/badge/Method-Preferred-blue)
```bash
git clone https://github.com/ondrovic/ollama-git-commit.git
cd ollama-git-commit
bun install
bun run build
npm link
```

> **Windows Development Note**: Currently, development on Windows requires WSL (Windows Subsystem for Linux). Native Windows support is in progress but not fully implemented. Please use WSL for the best development experience.

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

3. **Stage your changes**:
   ```bash
   git add .
   ```

4. **Generate commit message**:
   ```bash
   ollama-git-commit
   ```

5. **Follow the interactive prompts** to review, regenerate, or copy your commit message!

## 📖 Usage

### Basic Commands

```bash
# Generate commit message for staged changes
ollama-git-commit

# Non-interactive mode (just display the message)
ollama-git-commit -n

# Verbose output with detailed information
ollama-git-commit -v

# Auto-stage all changes if nothing is staged
ollama-git-commit --auto-stage

# Debug mode with comprehensive logging
ollama-git-commit --debug
```

### Model Management

```bash
# Use specific model
ollama-git-commit -m codellama

# Auto-select best available model
ollama-git-commit --auto-model

# List all available models
ollama-git-commit --list-models

# Test connection to Ollama
ollama-git-commit --test

# Test with simple prompt (debug JSON issues)
ollama-git-commit --test-simple
```

### Advanced Usage

```bash
# Custom Ollama host
ollama-git-commit -H http://192.168.1.100:11434

# Custom prompt file
ollama-git-commit -p ~/.config/my-custom-prompt.txt

# Combine multiple options
ollama-git-commit -v -m llama3.2 --auto-stage --debug

# Non-interactive with custom model
ollama-git-commit -n -m codellama --auto-stage
```

## ⚙️ Configuration

### Environment Variables

```bash
# Set default Ollama host (overrides default)
export OLLAMA_HOST=http://192.168.1.100:11434

# Add to your shell profile (.bashrc, .zshrc, etc.)
echo 'export OLLAMA_HOST=http://192.168.1.100:11434' >> ~/.zshrc
```

### Custom Prompts

The tool automatically creates a default prompt file at `~/.config/prompts/ollama-git-commit-prompt.txt`. You can customize this file or create your own:

```bash
# Edit the default prompt
nano ~/.config/prompts/ollama-git-commit-prompt.txt

# Use a custom prompt file
ollama-git-commit -p /path/to/your/custom-prompt.txt
```

#### Example Custom Prompt (Conventional Commits)

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

#### Example Custom Prompt (Simple & Clean)

```text
Create simple, clear commit messages:

- Start with a verb (add, fix, update, remove, etc.)
- Mention what files or features were changed
- Keep it concise but informative
- Use normal capitalization
- No emojis or special formatting

Example: "Fix user authentication bug in login component"
```

## 🔧 CLI Options Reference

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--model` | `-m` | Specify Ollama model | `mistral:7b-instruct` |
| `--host` | `-H` | Ollama server URL | `$OLLAMA_HOST` or `http://192.168.0.3:11434` |
| `--verbose` | `-v` | Show detailed output | `false` |
| `--non-interactive` | `-n` | Skip confirmation prompts | `false` |
| `--prompt` | `-p` | Custom prompt file path | `~/.config/prompts/ollama-git-commit-prompt.txt` |
| `--auto-stage` | | Auto-stage changes if nothing staged | `false` |
| `--test` | | Test connection to Ollama server | - |
| `--test-simple` | | Test with simple prompt for debugging | - |
| `--list-models` | | Show all available models | - |
| `--auto-model` | | Auto-select best available model | `false` |
| `--debug` | | Enable debug mode with detailed logging | `false` |
| `--help` | `-h` | Show help message | - |

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. "Model not found" error
```bash
# Check available models
ollama-git-commit --list-models

# Install a model
ollama pull llama3.2

# Or let the tool auto-select
ollama-git-commit --auto-model
```

#### 2. "Connection refused" error
```bash
# Make sure Ollama is running
ollama serve

# Test the connection
ollama-git-commit --test

# Check if Ollama is on a different host/port
ollama-git-commit -H http://localhost:11434 --test
```

#### 3. "No changes detected"
```bash
# Check git status
git status

# Stage your changes
git add .

# Or auto-stage with the tool
ollama-git-commit --auto-stage
```

#### 4. Empty or invalid responses
```bash
# Test with simple prompt
ollama-git-commit --test-simple

# Try a different model
ollama-git-commit --auto-model

# Enable debug mode for detailed logs
ollama-git-commit --debug -v
```

#### 5. Git diff parsing issues
```bash
# Enable debug mode to see git parsing details
ollama-git-commit --debug

# Check if you're in a git repository
git status

# Verify file encodings if you have international characters
git config --global core.quotepath false
```

#### 6. Windows-specific issues
```bash
# If you encounter pathspec errors on Windows:
# Make sure you're using a recent version of Git
git --version

# Try using WSL instead of native Windows
# Or use Git Bash instead of Command Prompt/PowerShell

### Debug Mode

For comprehensive troubleshooting, enable debug mode:

```bash
ollama-git-commit --debug -v
```

This shows:
- Configuration details
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

## 🌟 Example Output

```bash
$ ollama-git-commit -v

🔍 Configuration:
   Model: llama3:latest
   Host: http://192.168.0.3:11434
   Interactive: true

📁 Using staged changes for commit message generation
📊 Change Statistics:
   Files changed: 3
   Insertions: 42
   Deletions: 8

📁 3 files changed:
📄 src/components/Button.tsx (modified) (+15 -3, 2 new functions/vars)
📄 src/styles/theme.css (modified) (+20 -5)
📄 README.md (modified) (+7 -0)

🤖 Generating commit message with llama3:latest...
✅ Response received

✨ Generated commit message:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 feat(ui): Add theme support and improve Button component

- Enhanced Button component with new variant props and accessibility features
- Added comprehensive theme system with dark/light mode support  
- Updated documentation with component usage examples
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Available actions:
   [y] Use this message and copy commit command
   [c] Copy message to clipboard (if available)
   [r] Regenerate message
   [n] Cancel

What would you like to do? [y/c/r/n]: y

📋 Copy and run this command:
git commit -m "🎨 feat(ui): Add theme support and improve Button component

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
9. **Comprehensive Testing**: Full test suite with proper mocking and fixtures
10. **Better Performance**: Optimized for speed and resource usage

### 🔧 **Technical Improvements**

- **Unicode Support**: Handles international characters correctly
- **Async Operations**: Non-blocking API calls and file operations  
- **Proper Escaping**: Safe handling of special characters in commit messages
- **Timeout Handling**: Proper request timeouts and cancellation
- **Progress Indicators**: Visual feedback during long operations
- **Clipboard Integration**: Cross-platform clipboard support
- **Configuration Management**: Flexible configuration with environment variables

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/ollama-git-commit.git
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
└── utils/             # Utility functions
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
- [Report Issues](https://github.com/yourusername/ollama-git-commit/issues)
- [Feature Requests](https://github.com/yourusername/ollama-git-commit/discussions)

---

**Made with ❤️ by developers, for developers**