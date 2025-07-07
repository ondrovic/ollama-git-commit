# 🤖 Ollama Git Commit Message Generator

A powerful CLI tool that generates meaningful, contextual commit messages using Ollama AI. This modern Node.js/TypeScript implementation provides intelligent context analysis, multi-model support, embeddings, and advanced configuration options.

[![npm version](https://img.shields.io/npm/v/@condrovic/ollama-git-commit.svg)](https://www.npmjs.com/package/@condrovic/ollama-git-commit)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Run Bun Tests](https://github.com/ondrovic/ollama-git-commit/actions/workflows/test.yml/badge.svg)](https://github.com/ondrovic/ollama-git-commit/actions/workflows/test.yml)

## 🚦 Continuous Integration & Automated Publishing

This project uses **GitHub Actions** for automated testing and NPM publishing with robust dependency management and cross-platform compatibility:

### Automated Testing

- The test workflow is defined in `.github/workflows/test.yml`
- All branches are tested automatically on push and pull requests
- Tests are run using [Bun](https://bun.sh/) for fast execution
- **Cross-platform compatibility**: Tests work on Windows, macOS, and Linux
- **Dependency management**: Robust handling of package dependencies with fallback strategies
- **Comprehensive test coverage** for all features including context providers and embeddings
- **Isolated testing**: All tests use mocks to avoid real external calls (API, filesystem, git commands)
- **Test safety**: Eliminated dangerous global prototype modifications that could cause unpredictable test failures

### Automated NPM Publishing

- The publish workflow is defined in `.github/workflows/publish.yml`
- **Triggered automatically** when a git tag is pushed (e.g., `v1.0.4`)
- **Validates** that the version doesn't already exist on NPM
- **Builds and tests** the package before publishing
- **Publishes to NPM** with zero manual intervention
- **Dependency verification**: Ensures all required packages are properly installed

**How it works:**

- **For Testing**: On every push or PR, GitHub Actions will:

  1. Check out the code
  2. Set up Bun and Node.js
  3. Install dependencies (`bun install`)
  4. Run the full test suite (`bun test`)
  5. Run linting and type checking

- **For Publishing**: When you run `bun run release`:
  1. Version is incremented in `package.json`
  2. Git tag is created and pushed
  3. GitHub Actions automatically triggers
  4. Package is built, tested, and published to NPM

You can view the status of all workflows in the "Actions" tab of the GitHub repository.

## ✨ Features

- 🧠 **AI-Powered**: Uses Ollama models to generate intelligent commit messages
- 📊 **Context-Aware**: Analyzes file changes, additions, deletions, and code patterns
- 🔍 **Advanced Context Providers**: Multiple context sources including code analysis, documentation, diff analysis, terminal info, problem detection, folder structure, and codebase statistics
- 🎯 **Smart Staging**: Automatically detects staged vs unstaged changes
- 🔄 **Interactive Mode**: Review and regenerate messages before committing
- 📋 **Clipboard Support**: Copy messages to clipboard across platforms (macOS, Linux, Windows)
- 🐛 **Debug Mode**: Comprehensive troubleshooting and verbose output
- 🎨 **Emoji-Rich**: Fun, expressive commit messages with emojis
- 🎨 **Emoji Control**: Choose whether commit messages include emojis using the `useEmojis` config option
- 🔇 **Quiet Mode**: Suppress git command output using the `--quiet` flag or `quiet` config option
- 📝 **Consistent Logging**: Standardized logging system with centralized emoji handling and 15+ specialized log methods
- ⚡ **Fast**: Optimized git diff parsing and API calls
- 🔧 **Robust**: Enhanced error handling and validation mechanisms
- 🎭 **Template System**: Multiple prompt templates (conventional, simple, detailed)
- ⚙️ **Flexible Configuration**: Hierarchical config system with environment variables, project-local, and user-global settings
- 🔒 **Security**: Input sanitization and path validation for enhanced security
- 🛡️ **Environment Validation**: Comprehensive checks for Node.js, Git, and Ollama setup
- 🧪 **Testing Suite**: Comprehensive test coverage with mocks and utilities
- 🔍 **Debug Tools**: Advanced debugging commands for configuration and connection issues
- 📝 **Documentation**: Detailed guides for installation, configuration, and troubleshooting
- 🚀 **Automated Publishing**: Streamlined release process with automatic NPM publishing
- 🤖 **Multi-Model Support**: Configure multiple models for different purposes with role-based configuration. The `models` array is now auto-synced with the `model` field: updating `model` will update or add the chat model in `models`, preserving all other custom models and never creating invalid entries.
- 🔗 **Embeddings Support**: Use embeddings models for enhanced context analysis
- 📈 **Verbose Logging**: Detailed logging for debugging and monitoring context gathering
- 🧹 **Message Cleaning**: Advanced message processing to remove unwanted content like `<think>` tags and format output consistently
- 🎯 **Centralized Constants**: All models and contexts use centralized constants for consistency
- 🔄 **Auto-Sync Configuration**: Automatic synchronization between core model and multi-model configuration. The auto-sync logic now ensures that only the chat model is updated or added, and custom models are preserved. Invalid or empty model values are ignored for auto-sync.
- 🛡️ **Type-Safe Configuration**: Configuration commands now feature improved type safety and robust error handling, especially for nested key assignment and config source tracking. TypeScript errors related to config updates are now prevented by design.
- 📦 **Version Change Detection**: Detects and reports version changes in both `package.json` and `package-lock.json` for full transparency. This helps catch accidental mismatches or manual edits that could cause inconsistencies between the two files.
- ⚡ **Auto-Commit with SSH Agent Support**: Auto-commit works seamlessly with 1Password SSH agent and other SSH agents, as long as the agent is running and the environment is inherited. If you use 1Password, ensure the 1Password CLI is running and SSH_AUTH_SOCK is set.
- 🔄 **Smart Auto-Staging**: The `--auto-stage` flag runs the full staging script (`bun run stage`) which formats, lints, tests, builds type declarations, and stages files, then generates an AI commit message. If the staging script is not available, it falls back to simple `git add -A`. No commit is made - user must copy and run the git commit command manually.
- 🤖 **Intelligent Auto-Commit**: The `--auto-commit` flag runs the full staging script, generates a commit message, and if approved, automatically commits and pushes to the remote repository. If the staging script is not available, it falls back to simple `git add -A`. Staging is only done once, before message generation.
- 🏠 **Repository Compatibility**: Works seamlessly with any repository, automatically adapting to available scripts and workflows. The tool detects whether it's running in the ollama-git-commit repository or external repositories and adjusts its behavior accordingly. Scripts are only executed if they exist in the target repository's package.json.
- 🔍 **Enhanced Git Analysis**: Improved handling of complex git operations including renamed and copied files
  - Proper parsing of git status output for renamed files (R100 status) with clear old → new path display
  - Support for copied files (C100 status) with appropriate action labeling
  - Enhanced error handling and debug logging for failed git operations
  - Robust parsing that handles malformed git output gracefully
- ✅ **Configuration Validation**: Intelligent validation for configuration commands
  - Validates configuration keys before setting values to prevent invalid configurations
  - Provides smart suggestions for similar keys when invalid keys are provided
  - Detects common typos and suggests corrections (e.g., "quite" → "quiet")
  - Limits suggestions to 5 options to avoid overwhelming users
- 🏭 **Dependency Injection Architecture**: Modern service architecture with centralized factory
  - ServiceFactory provides centralized creation of all services with consistent configuration
  - Proper dependency injection ensures testability and maintainability
  - All commands use injected services instead of inline instantiation
  - Improved error handling and user feedback across all service layers
- 📊 **Enhanced Logging System**: Comprehensive logging refactoring with consistent emoji handling
  - Extended Logger class with 15+ specialized methods for different use cases
  - Centralized emoji management - no hardcoded emojis in log messages
  - Consistent logging patterns across all CLI commands, core services, and utilities
  - Enhanced test infrastructure with proper Logger method spying
- 🎯 **CLI Command Enhancements**: Improved command structure and user experience
  - Short (`-x`) and long (`--xxx`) flags for all CLI commands and options, following best CLI practices
  - Usage examples in documentation for both short and long forms
  - **config prompts list**: Refactored subcommand to list all available built-in prompt templates and view the contents of any template
  - Intelligent configuration key validation with typo suggestions and helpful error messages
- 🎨 **Enhanced Commit Message Display**: Improved commit message presentation and user experience
  - Fixed commit message display to show properly regardless of verbose mode settings
  - Enhanced visual separation of commit messages with clear borders
  - Improved user interaction flow with better message visibility
  - Consistent formatting across all output modes
- 🔇 **Improved Quiet Mode**: Enhanced quiet mode functionality across the application
  - Fixed debug mode test prompts to respect quiet mode settings
  - Improved verbose output control with consistent logic across all services
  - Better user experience when running in quiet mode with proper progress indicators

## 🚀 Installation

### From NPM (Recommended for Users)

```bash
# Install globally from NPM
npm install -g @condrovic/ollama-git-commit

# Or use with npx (no installation required)
npx @condrovic/ollama-git-commit -d .

# Or use with bun (alternative)
bunx @condrovic/ollama-git-commit -d .
```

### Global Installation for Development

For local development and testing, `bun link` can be used to symlink the package globally. However, due to known issues with `bun link` on some Windows environments, `npm link` is often a more reliable alternative.

First, make sure you have built the project:

```bash
bun run build
```

Then, from the root of this project, choose one of the following:

**Using npm (recommended for cross-platform reliability):**

```bash
npm link
```

**Using Bun (may have issues on Windows):**

```bash
bun link
```

After linking, the `ollama-git-commit` command should be available in your terminal globally. You might need to open a **new terminal window** for the changes to take effect.

### Development Workflow

When contributing to the project, use the following workflow:

1. **Create a feature branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

3. **Run pre-commit checks** (recommended):

   - Run the `precommit` script manually to lint, test, and check types before committing:
     ```bash
     bun run precommit
     ```
   - Optionally, set up a git pre-commit hook to run this script automatically:
     - Create a file `.git/hooks/pre-commit` with the following content:
       ```sh
       #!/bin/sh
       bun run precommit || exit 1
       ```
     - Make it executable:
       ```bash
       chmod +x .git/hooks/pre-commit
       ```
     - This will ensure pre-commit checks always run before each commit.

   **Available development scripts:**

   - `precommit` (script): Run before committing. Lints, tests, and checks types to catch errors that could break the release script.
   - `stage` (script): The main project workflow script for formatting, linting, building type declarations, and staging as part of the release/development workflow.
   - `check:types` (script): Type-check the main TypeScript files without emitting output.
   - `check:tests` (script): Type-check the test TypeScript files without emitting output.

4. **Commit your changes:**

   ```bash
   # Stage files only (format, lint, build types, stage), then commit manually
   bun run stage
   git commit -m "your message"

   # Or use the tool directly for auto-commit
   ollama-git-commit -d . --auto-commit
   ```

5. **Create a pull request**

> **Tip:** Running pre-commit checks helps ensure code quality, consistent formatting, and up-to-date versioning before you commit or push changes, and will catch errors that could break the release process.

### Release Workflow (For Maintainers)

After changes are merged into `main`:

1. **Pull the latest changes:**

   ```bash
   git checkout main
   git pull origin main
   ```

2. **Run the release command:**

   ```bash
   # For patch release (1.0.3 → 1.0.4)
   bun run release

   # For minor release (1.0.3 → 1.1.0)
   bun run release minor

   # For major release (1.0.3 → 2.0.0)
   bun run release major
   ```

3. **Automated publishing happens:**
   - Version is incremented in `package.json`
   - `CHANGELOG.md` is updated
   - Git tag is created and pushed
   - GitHub Actions automatically publishes to NPM

The staging script will:

- Format your code with Prettier
- Fix linting issues with ESLint
- Build type declarations with `bun run build:types`
- Stages all files with `git add -A`
- Generates an intelligent commit message using Ollama
- Shows interactive prompt for user actions
- User must copy and run the git commit command manually

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
npm uninstall -g @condrovic/ollama-git-commit
```

**If you used `bun link` or `bun install -g .`:**

```bash
bun unlink # If run from the project directory
# OR (for full uninstallation)
bun uninstall -g @condrovic/ollama-git-commit
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

1. **Install the package:**

   ```bash
   npm install -g @condrovic/ollama-git-commit
   ```

2. **Make sure Ollama is running:**

   ```bash
   ollama serve
   ```

3. **Install a model** (if you haven't already):

   ```bash
   ollama pull llama3.2
   # or
   ollama pull codellama
   ```

4. **Initialize configuration** (recommended):

   ```bash
   ollama-git-commit config create user
   # or for local configuration
   ollama-git-commit config create local
   ```

5. **Stage your changes:**

   ```bash
   git add .
   ```

6. **Generate commit message:**

   ```bash
   ollama-git-commit -d .
   ```

7. **Follow the interactive prompts** to review, regenerate, or copy your commit message!

## 📖 Usage

### Basic Usage

All CLI commands support both short (`-x`) and long (`--xxx`) flags for better user experience:

```bash
# Generate a commit message for staged changes
ollama-git-commit -d /path/to/repo
# or
ollama-git-commit --directory /path/to/repo

# Generate a commit message for unstaged changes
ollama-git-commit -d /path/to/repo --auto-stage

# Auto-stage and auto-commit with AI-generated message
ollama-git-commit -d /path/to/repo --auto-commit

# Suppress git command output
ollama-git-commit -d /path/to/repo -q
# or
ollama-git-commit -d /path/to/repo --quiet

# Combine quiet mode with auto-commit
ollama-git-commit -d /path/to/repo --auto-commit -q

# Use specific model with verbose output
ollama-git-commit -d /path/to/repo -m mistral:7b-instruct -v
# or
ollama-git-commit -d /path/to/repo --model mistral:7b-instruct --verbose
```

### Auto-Staging and Auto-Commit

The tool provides intelligent staging and committing workflows:

**`--auto-stage`**: Runs the full staging script and generates a commit message, but does not commit or push. The user must copy and run the git commit command themselves.

**`--auto-commit`**: Runs the full staging script, generates an AI commit message, and always commits and pushes to the remote repository if approved, regardless of interactive mode. Staging is only done once, before message generation. Works with SSH agents like 1Password CLI.

### Development Workflow

For development, you can use these commands:

```bash
# Stage files, generate AI message, and show interactive prompt (manual commit)
bun dev:run commit -d . --auto-stage

# Stage files, generate AI message, auto-commit if approved, and push to remote
bun dev:run commit -d . --auto-commit

# Alternative: Use the tool directly (same as --auto-commit)
ollama-git-commit -d . --auto-commit
```

### Model Management

```bash
# Use specific model
ollama-git-commit -d . -m mistral:7b-instruct
# or
ollama-git-commit -d . --model mistral:7b-instruct

# Auto-select best available model
ollama-git-commit -d . --auto-model

# List all available models
ollama-git-commit config models list

# Test connection to Ollama
ollama-git-commit test connection

# Test with simple prompt (debug JSON issues)
ollama-git-commit test simple-prompt

# Test custom prompt generation
ollama-git-commit test prompt -p "Your custom prompt here"

# Run full workflow test (connection, model, and prompt generation)
ollama-git-commit test full-workflow

# Run all tests
ollama-git-commit test all

# Benchmark model performance
ollama-git-commit test benchmark
```

### Configuration Commands

The `config` command provides advanced configuration management for the tool. You can manage models, set options, and now list and view prompt templates.

#### List Available Prompt Templates

You can list all available built-in prompt templates:

```bash
ollama-git-commit config prompts list
```

Example output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Available prompt templates:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Usage: ollama-git-commit config prompts list -n default
Usage: ollama-git-commit config prompts list -n conventional
Usage: ollama-git-commit config prompts list -n simple
Usage: ollama-git-commit config prompts list -n detailed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 4 templates available
```

#### View the Contents of a Prompt Template

To view the full contents of a specific template:

```bash
ollama-git-commit config prompts list -n detailed
```

This will print the full text of the selected prompt template, so you can see exactly what the AI will use.

#### Verbose Template Information

For detailed information about templates including character count, validation status, and descriptions:

```bash
ollama-git-commit config prompts list -v
```

Example verbose output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Available prompt templates:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  default
    Usage: ollama-git-commit config prompts list -n default
    Characters: 1234
    Status: ✅ Valid
    Description: Balanced template with good detail and structure

  conventional
    Usage: ollama-git-commit config prompts list -n conventional
    Characters: 987
    Status: ✅ Valid
    Description: Follows conventional commit format (type: description)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 4 templates available
```

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

# `config set <key> <value>`: Set a configuration value with validation. Example:
ollama-git-commit config set model llama3
ollama-git-commit config set timeouts.connection 5000
ollama-git-commit config set context code,diff,terminal

# `config keys`: List all available configuration keys with descriptions and defaults
ollama-git-commit config keys

# Model management commands
ollama-git-commit config models add <name> ollama <model> --roles chat,edit,embed
ollama-git-commit config models remove <name>
ollama-git-commit config models list
ollama-git-commit config models set-embeddings <name>
```

### Configuration Validation

The `config set` command now includes intelligent validation to help you configure the tool correctly:

- **Key Validation**: Validates configuration keys before setting values to prevent invalid configurations
- **Smart Suggestions**: Provides helpful suggestions for similar keys when an invalid key is provided
- **Common Typo Detection**: Automatically detects and suggests corrections for common typos (e.g., "quite" → "quiet")
- **Limited Suggestions**: Shows up to 5 suggestions to avoid overwhelming users

**Example usage with validation:**

```bash
# Valid key - works as expected
ollama-git-commit config set model llama3

# Invalid key - shows helpful suggestions
ollama-git-commit config set quite true
# Output:
# ❌ Invalid configuration key: "quite"
# 💡 Did you mean one of these?
#    quiet
#    useEmojis
#    autoCommit
#    autoStage
#    autoModel
#
# 💡 Run 'ollama-git-commit config keys' to see all available keys.

# List all available configuration keys
ollama-git-commit config keys
# Shows all available keys with descriptions and default values
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
export OLLAMA_COMMIT_MODEL=mistral:7b-instruct

# Disable emojis
export OLLAMA_COMMIT_USE_EMOJIS=false

# Suppress git command output
export OLLAMA_COMMIT_QUIET=true

# Multi-model configuration (JSON string)
export OLLAMA_COMMIT_MODELS='[{"name":"mistral-7b-instruct","provider":"ollama","model":"mistral:7b-instruct","roles":["chat","edit","autocomplete","apply","summarize"]},{"name":"embeddingsProvider","provider":"ollama","model":"nomic-embed-text","roles":["embed"]}]'

# Set embeddings provider
export OLLAMA_COMMIT_EMBEDDINGS_PROVIDER=embeddingsProvider

# Set context providers (JSON string)
export OLLAMA_COMMIT_CONTEXT='[{"provider":"code","enabled":true},{"provider":"docs","enabled":true},{"provider":"diff","enabled":true},{"provider":"terminal","enabled":true},{"provider":"problems","enabled":true},{"provider":"folder","enabled":true},{"provider":"codebase","enabled":true}]'
```

### Project-Local Configuration

Create a `.ollama-git-commit.json` file in your project root:

```json
{
  "model": "mistral:7b-instruct",
  "host": "http://localhost:11434",
  "verbose": false,
  "interactive": true,
  "debug": false,
  "autoStage": false,
  "autoCommit": false,
  "autoModel": false,
  "useEmojis": false,
  "quiet": false,
  "promptTemplate": "default",
  "promptFile": "~/.config/ollama-git-commit/prompt.txt",
  "timeouts": {
    "connection": 10000,
    "generation": 120000,
    "modelPull": 300000
  }
}
```

### User-Global Configuration

Create a `~/.ollama-git-commit.json` file:

```json
{
  "model": "mistral:7b-instruct",
  "host": "http://localhost:11434",
  "verbose": false,
  "interactive": true,
  "debug": false,
  "autoStage": false,
  "autoCommit": false,
  "autoModel": false,
  "useEmojis": false,
  "quiet": false,
  "promptTemplate": "default",
  "promptFile": "~/.config/ollama-git-commit/prompt.txt",
  "configFile": "~/.config/ollama-git-commit/config.json",
  "timeouts": {
    "connection": 10000,
    "generation": 120000,
    "modelPull": 300000
  }
}
```

## 🔧 Version Management

This project uses a **streamlined version management system**:

### Single Source of Truth

- **`package.json`** contains the authoritative version number
- **`src/constants/metadata.ts`** automatically reads the version using `npm_package_version`
- **No manual syncing** required between files

### How It Works

- **When installed from NPM**: The tool uses `process.env.npm_package_version` (always accurate)
- **During development**: Falls back to reading from local `package.json`
- **Version detection is automatic** and requires no manual intervention

### For Contributors

- **No version management required** in your PRs
- **Release process is automated** via `bun run release`
- **Focus on features** instead of version bookkeeping

## 🔍 Advanced Features

### Context Providers

The tool now includes intelligent context providers that gather additional information to improve commit message quality:

- **Code Context**: Analyzes changed files and their patterns
- **Documentation Context**: Finds and includes relevant documentation files
- **Diff Context**: Provides detailed analysis of the git diff
- **Terminal Context**: Captures current shell information and working directory
- **Problems Context**: Detects common issues like lint errors or build problems
- **Folder Context**: Analyzes project structure and organization
- **Codebase Context**: Provides overall codebase statistics and patterns

Context providers are enabled by default and can be configured in your settings.

### Embeddings Support

For enhanced context analysis, you can configure an embeddings model:

```json
{
  "models": [
    {
      "name": "mistral-7b-instruct",
      "provider": "ollama",
      "model": "mistral:7b-instruct",
      "roles": ["chat", "edit", "autocomplete", "apply", "summarize"]
    },
    {
      "name": "embeddingsProvider",
      "provider": "ollama",
      "model": "nomic-embed-text",
      "roles": ["embed"]
    }
  ],
  "embeddingsProvider": "embeddingsProvider",
  "embeddingsModel": "nomic-embed-text",
  "context": [
    { "provider": "code", "enabled": true },
    { "provider": "docs", "enabled": true },
    { "provider": "diff", "enabled": true },
    { "provider": "terminal", "enabled": true },
    { "provider": "problems", "enabled": true },
    { "provider": "folder", "enabled": true },
    { "provider": "codebase", "enabled": true }
  ]
}
```

### Verbose Logging

Enable verbose logging to see detailed information about context gathering and processing:

```bash
# Enable verbose mode
ollama-git-commit -d . -v

# Or set in configuration
{
  "verbose": true
}
```

Verbose mode will show:

- Context provider activation and results
- Model selection process
- Prompt construction details
- API call information
- Message processing steps

### Message Cleaning

The tool includes advanced message cleaning capabilities:

- **Emoji Removal**: Configurable emoji filtering using Unicode property escapes
- **Think Tag Removal**: Automatically removes `<think></think>` content from model responses
- **Formatting**: Consistent message formatting with proper spacing and punctuation
- **Content Filtering**: Removes unwanted artifacts and improves readability

### Quiet Mode

The tool supports quiet mode to suppress git command output and verbose logging:

- **CLI Flag**: Use `--quiet` to suppress git command output for the current run
- **Configuration**: Set `quiet: true` in your config file to enable quiet mode by default
- **Environment Variable**: Set `OLLAMA_COMMIT_QUIET=true` to enable quiet mode
- **Auto-Commit Integration**: Quiet mode works seamlessly with `--auto-commit` and `--auto-stage` flags
- **Debug Mode Respect**: Debug mode test prompts now respect quiet mode settings
- **Verbose Control**: Quiet mode properly controls verbose output across all service layers

Quiet mode is useful when you want to reduce noise in your terminal output, especially in automated workflows or when running the tool frequently. Progress messages are still shown to keep you informed of the current operation.

**Note**: Non-quiet mode preserves the natural git experience by capturing output for programmatic use and then displaying it to the user. The tool intelligently switches between output modes to provide the best user experience.

```bash
# Suppress git output for this run
ollama-git-commit -d . --quiet

# Enable quiet mode in config
ollama-git-commit config set quiet true

# Use with auto-commit for clean output
ollama-git-commit -d . --auto-commit --quiet

# Debug mode with quiet (test prompts will be silent)
ollama-git-commit -d . --debug --quiet
```

**Example output with quiet mode:**

```
🚀 Starting commit process...
📦 Staging changes...
✅ Staging completed!
🔍 Analyzing changes...
🤖 Generating commit message...
✅ Generated commit message:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
feat: add new user authentication system

- Implement JWT token-based authentication
- Add user registration and login endpoints
- Include password hashing and validation
- Add middleware for protected routes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Pushing to remote...
✅ Changes pushed successfully!
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Development setup and workflow
- Our automated release process
- Code standards and testing requirements
- Pull request guidelines

### Quick Contributing Steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run `bun stage` to format and lint
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai) for providing the AI model infrastructure
- Original shell script inspiration from the community
- Contributors and testers who helped improve this tool

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/@condrovic/ollama-git-commit)
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

# Test custom prompt generation
ollama-git-commit test prompt -p "Your custom prompt here"

# Run full workflow test (connection, model, and prompt generation)
ollama-git-commit test full-workflow

# Run all tests
ollama-git-commit test all

# Benchmark model performance
ollama-git-commit test benchmark -m mistral:7b-instruct
```

## 🛠️ Multi-Model & Embeddings Configuration

You can configure multiple models and specify an embeddings provider for advanced context and search features. This tool is **Ollama-only** and the configuration is minimal and DRY.

### Example Configuration

```json
{
  "models": [
    {
      "name": "mistral-7b-instruct",
      "provider": "ollama",
      "model": "mistral:7b-instruct",
      "roles": ["chat", "edit", "autocomplete", "apply", "summarize"]
    },
    {
      "name": "embeddingsProvider",
      "provider": "ollama",
      "model": "nomic-embed-text",
      "roles": ["embed"]
    }
  ],
  "embeddingsProvider": "embeddingsProvider",
  "embeddingsModel": "nomic-embed-text",
  "context": [
    { "provider": "code", "enabled": true },
    { "provider": "docs", "enabled": true },
    { "provider": "diff", "enabled": true },
    { "provider": "terminal", "enabled": true },
    { "provider": "problems", "enabled": true },
    { "provider": "folder", "enabled": true },
    { "provider": "codebase", "enabled": true }
  ]
}
```

- **models**: List of model configs, each with a name, model, and roles. Provider is always `ollama`.
- **embeddingsProvider**: Name of the model to use for embeddings (must have the `embed` role).
- **context**: List of enabled context providers.

### Minimal Config Show Output

```
Core Settings:
        Model: mistral:7b-instruct (from config)
        Host: 0.0.0.0:11434 (from config)
        ...

Models:
        embeddingsProvider - Roles: embed
        mistral-7b-instruct - Roles: chat, edit, autocomplete, apply, summarize
        Embeddings Provider: embeddingsProvider (from config)
```

- The active model is shown in Core Settings.
- The Models section lists all configured models and their roles—no provider, no model string, no active indicator.
- The config is DRY: you only need to set your model in one place.

## 🔧 Configuration Commands

```bash
# Add a new model
ollama-git-commit config models add <name> ollama <model> --roles chat,edit,embed

# Remove a model
ollama-git-commit config models remove <name>

# List all configured models
ollama-git-commit config models list

# Set the embeddings provider
ollama-git-commit config models set-embeddings <name>

# Set configuration values
ollama-git-commit config set <key> <value>

# List all available configuration keys
ollama-git-commit config keys

# Show current configuration
ollama-git-commit config show

# Show debug information
ollama-git-commit config debug
```

## 🌱 Environment Variables

You can configure the tool using environment variables:

```bash
# Set Ollama host
export OLLAMA_HOST=http://localhost:11434

# Set default model
export OLLAMA_COMMIT_MODEL=mistral:7b-instruct

# Disable emojis
export OLLAMA_COMMIT_USE_EMOJIS=false

# Suppress git command output
export OLLAMA_COMMIT_QUIET=true

# Multi-model configuration (JSON string)
export OLLAMA_COMMIT_MODELS='[{"name":"mistral-7b-instruct","provider":"ollama","model":"mistral:7b-instruct","roles":["chat","edit","autocomplete","apply","summarize"]},{"name":"embeddingsProvider","provider":"ollama","model":"nomic-embed-text","roles":["embed"]}]'

# Set embeddings provider
export OLLAMA_COMMIT_EMBEDDINGS_PROVIDER=embeddingsProvider

# Set context providers (JSON string)
export OLLAMA_COMMIT_CONTEXT='[{"provider":"code","enabled":true},{"provider":"docs","enabled":true},{"provider":"diff","enabled":true},{"provider":"terminal","enabled":true},{"provider":"problems","enabled":true},{"provider":"folder","enabled":true},{"provider":"codebase","enabled":true}]'
```

## Testing & Development

- All configuration command tests (including `config set`) are fully mocked and isolated. Tests do not touch your real user config files and are safe to run repeatedly.
- To run tests:
  ```sh
  bun test
  ```

## ⚙️ Configuration System (Updated)

- Configuration files are now **merged** when using `config set <key> <value>`. Setting a value will only update the specified key, preserving all other existing configuration values. This prevents accidental overwrites and ensures safe incremental configuration changes.
- The config file structure supports nested keys, arrays, and all fields shown in the example below.

### Example: Setting a Value

```bash
ollama-git-commit config set model mistral:7b-instruct
```

This will update only the `model` key in your config file, leaving all other settings unchanged.

### Example Configuration File

```json
{
  "model": "mistral:7b-instruct",
  "host": "http://localhost:11434",
  "verbose": false,
  "interactive": true,
  "debug": false,
  "autoStage": false,
  "autoCommit": false,
  "autoModel": false,
  "useEmojis": false,
  "promptTemplate": "default",
  "promptFile": "~/.config/ollama-git-commit/prompt.txt",
  "timeouts": {
    "connection": 10000,
    "generation": 120000,
    "modelPull": 300000
  },
  "models": [
    {
      "name": "mistral-7b-instruct",
      "provider": "ollama",
      "model": "mistral:7b-instruct",
      "roles": ["chat", "edit", "autocomplete", "apply", "summarize"]
    },
    {
      "name": "embeddingsProvider",
      "provider": "ollama",
      "model": "nomic-embed-text",
      "roles": ["embed"]
    }
  ],
  "embeddingsProvider": "embeddingsProvider",
  "embeddingsModel": "nomic-embed-text",
  "context": [
    { "provider": "code", "enabled": true },
    { "provider": "docs", "enabled": true },
    { "provider": "diff", "enabled": true },
    { "provider": "terminal", "enabled": true },
    { "provider": "problems", "enabled": true },
    { "provider": "folder", "enabled": true },
    { "provider": "codebase", "enabled": true }
  ]
}
```

> **Note:** The configuration system supports both user-global and project-local config files. All config changes are merged with existing values, never overwriting the entire file.

> **Note:** When you set the `model` key using `config set model <value>`, the tool will automatically update the `models` array to keep it in sync with the new model. This ensures that both the `model` field and the `models` array always reflect the current primary model.

## Configuration

> **Note:** The `models` array is automatically kept in sync with the `model` field. When you update the `model` field (via config file, environment variable, or CLI), the tool will:
>
> - Update the chat model in the `models` array if it exists
> - Add a chat model if none exists
> - Never overwrite or remove your custom models (e.g., embeddings, summarize, etc.)
> - Never create a model with an empty name (invalid/empty model values are ignored for auto-sync)

## Troubleshooting

### Model auto-sync issues

If you set the `model` field to an empty or invalid value, the auto-sync logic will skip updating the `models` array to prevent invalid configuration. Make sure to provide a valid model name when updating the `model` field.

### 1Password SSH Agent

If you encounter issues with auto-commit and 1Password SSH agent, make sure the 1Password CLI is running and SSH_AUTH_SOCK is set in your environment. The tool runs `git commit` as a foreground process with inherited environment, so interactive authentication should work as expected.

### Verbose Output and Logging

The tool provides comprehensive logging for debugging and troubleshooting:

- **Verbose Mode**: Use `-v` flag or set `"verbose": true` in config to see detailed information about context gathering, model selection, and API calls
- **Debug Mode**: Set `"debug": true` in config for additional debug information
- **Logger Consistency**: All services use consistent logger instances with proper verbosity settings
- **Spinner Timing**: Logger messages are properly timed to avoid interference with progress spinners
- **Quiet Mode**: Use `--quiet` flag or set `"quiet": true` to suppress git command output while preserving essential status messages

For troubleshooting configuration or connection issues, use the debug commands:

```bash
# Show detailed configuration information
ollama-git-commit config debug

# Test connection to Ollama server
ollama-git-commit test connection

# Test specific model
ollama-git-commit test model -m your-model-name
```

## Technical Details

- **Dependency Injection Pattern**: The `ModelsCommand` and related commands now use a constructor signature of `(ollamaService?: IOllamaService, logger?: ILogger)`. This allows you to inject a pre-configured or mock service for testing, or let the command create its own default instance for convenience.
- **OllamaService Instantiation**: All usages of `OllamaService` now explicitly pass logger and configuration parameters. Allowing an undefined service is a common and viable pattern for CLI tools and libraries, as it enables both flexibility and testability. For larger projects, consider centralizing service instantiation for consistency.

- **Version Change Reporting**: The tool analyzes git diffs for both `package.json` and `package-lock.json`. It only reports a version change if the version actually changes and the new version is valid (not '..' or empty). This ensures commit messages are accurate and avoids false positives when the version is unchanged or truncated. Both files are checked to help catch accidental mismatches or manual edits that could cause inconsistencies between them.

- To format code, run:

```sh
bun run format
```

- This will use Prettier via npx to format all TypeScript files in src/. This avoids known issues with Bun on Windows.

## 🛡️ Security and Robustness

- The tool safely handles commit messages containing quotes and special characters.
- All shell command invocations escape double quotes to prevent syntax errors and command injection.
- When using auto-commit or any workflow that passes the commit message as an argument array, no escaping is needed and the message is passed safely.
- You can use commit messages with quotes (e.g., `fix: handle "edge cases" in parser`) without any issues.

## CLI Usage

### Commit Command

```
ollama-git-commit commit -d <dir> [-m <model>] [-H <host>] [-v] [-i] [-p <file>] [-t <template>] [--debug] [--auto-stage] [--auto-commit] [--auto-model] [-q]
```

| Short | Long              | Description                                     |
| ----- | ----------------- | ----------------------------------------------- |
| -d    | --directory       | Git repository directory (required)             |
| -m    | --model           | Ollama model to use                             |
| -H    | --host            | Ollama server URL                               |
| -v    | --verbose         | Show detailed output                            |
| -i    | --interactive     | Interactive mode                                |
| -p    | --prompt-file     | Custom prompt file                              |
| -t    | --prompt-template | Prompt template to use                          |
|       | --debug           | Enable debug mode                               |
|       | --auto-stage      | Automatically stage changes                     |
|       | --auto-commit     | Automatically commit changes and push to remote |
|       | --auto-model      | Automatically select model                      |
| -q    | --quiet           | Suppress git command output                     |

#### Example

```
ollama-git-commit commit -d . -m llama3 -v -q
ollama-git-commit commit --directory . --model llama3 --verbose --quiet
```

### Config Commands

- `ollama-git-commit config set <key> <value> [-t <type>] [-a]`
- `ollama-git-commit config prompts list [-n <template>] [-v]`
- `ollama-git-commit config models list [-t <type>]`
- `ollama-git-commit config models set-primary <name> [-t <type>]`

#### List Models by Config Type

You can list models from either the user or local configuration file:

```sh
ollama-git-commit config models list -t user   # List models from the user config (~/.config/ollama-git-commit/config.json)
ollama-git-commit config models list -t local  # List models from the local config (.ollama-git-commit.json in project)
```

The `-t, --type` option is respected for all model-related config commands that support it.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for details.
