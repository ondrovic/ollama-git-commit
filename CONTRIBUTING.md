# Contributing to Ollama Git Commit

Thank you for your interest in contributing to Ollama Git Commit! This document provides guidelines and instructions for contributing to the project.

## Development Setup

### Prerequisites

- Node.js 18.12 or higher
- Bun 1.0 or higher
- Git
- Ollama running locally or remotely

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/ondrovic/ollama-git-commit.git
   cd ollama-git-commit
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Build the project:

   ```bash
   bun run build
   ```

4. Link the package for development:

   ```bash
   # Using npm (recommended for cross-platform reliability)
   npm link

   # Or using Bun (may have issues on Windows)
   bun link
   ```

### Pre-commit Checks and Automation

To help ensure code quality and consistency, the project provides a `precommit` script:

- **`precommit` script** (`bun run precommit`):

  - Runs linting with auto-fix, tests, and type build checks.
  - Use this script manually before committing to catch issues early and prevent errors that could break the release script.
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

- **`stage` script** (`bun stage`):
  - Formats, lints, tests, builds type declarations, and stages files

**Tip:** Using pre-commit checks helps ensure code quality, consistent formatting, and up-to-date versioning before you commit or push changes, and will catch errors that could break the release process.

**Summary of differences:**

- `precommit`: Manual script for lint, test, and type checks before commit (recommended to run or hook before every commit)
- `stage`: Main staging script for formatting, linting, and staging

### Recent Enhancements

The project has recently added several improvements to enhance user experience and code quality:

- **Configuration Validation**: The `config set` command now validates keys and provides smart suggestions for typos
- **Enhanced Git Analysis**: Improved handling of renamed and copied files with better error handling
- **Comprehensive Testing**: Added extensive test coverage for new features including git rename scenarios

## Release Workflow

We use an automated release process for publishing to NPM. Here's the complete workflow:

### 1. Feature Development

1. Create a new branch for your feature or bugfix:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bugfix-name
   # or
   git checkout -b hotfix/your-hotfix-name
   ```

2. Make your changes

3. Run the staging script to format, lint, build type declarations, and stage your changes:

   ```bash
   # Option 1: Stage files only
   bun run stage

   # Option 2: Use the tool's auto-stage functionality
   bun dev:run commit -d . --auto-stage

   # Option 3: Stage files and auto-commit with AI-generated message
   bun dev:run commit -d . --auto-commit

   # Option 4: Use the tool directly (same as --auto-commit)
   ollama-git-commit -d . --auto-commit
   ```

4. Commit your changes (if using option 1 or 2):

   ```bash
   git commit -m "feat: your feature description"
   ```

5. Run tests to ensure everything works:

   ```bash
   bun test
   ```

6. Push your changes and create a pull request:
   ```bash
   git push origin feature/your-feature-name
   ```

### 2. Release Process

After your PR is merged into `main`:

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

3. **Automated publishing:**
   - The release script automatically increments the version in `package.json`
   - Updates the `CHANGELOG.md`
   - Creates a git tag (e.g., `v1.0.4`)
   - Pushes the tag and commits to GitHub
   - GitHub Actions automatically publishes to NPM

### Version Management

Our project uses a **single source of truth** for version management:

- **`package.json`** contains the authoritative version number
- **`metadata.ts`** automatically reads the version using `npm_package_version`
- **No manual version syncing** required between files
- **Automatic fallback** to package.json during development
- **Note:** The commit message generator also checks for version changes in `package-lock.json` and reports them if the version actually changes and is valid. This helps catch accidental mismatches or manual edits that could cause inconsistencies between the two files, even though `package.json` is the canonical source.

The staging script (`bun stage`) will:

- Run tests to ensure code quality
- Format your code with Prettier
- Fix any linting issues with ESLint
- Build type declarations with `bun run build:types`
- Stage all files for commit
- _(No longer manages version numbers - this is handled by the release script)_

## Project Structure

```
ollama-git-commit/
├── src/
│   ├── cli/           # CLI command implementations
│   │   ├── commands/  # Individual command modules
│   │   │   ├── commit.ts      # Main commit command
│   │   │   ├── config/        # Configuration management commands
│   │   │   ├── list-models.ts # Model listing command
│   │   │   └── test/          # Testing commands
│   │   ├── utils/     # CLI-specific utilities
│   │   └── index.ts   # CLI entry point
│   ├── core/          # Core functionality
│   │   ├── config.ts  # Configuration management
│   │   ├── context.ts # Context providers (git status, diff, etc.)
│   │   ├── git.ts     # Git operations
│   │   ├── interfaces.ts # Core interfaces and types
│   │   ├── ollama.ts  # Ollama API client with message cleaning
│   │   └── prompt.ts  # Prompt management and templates
│   ├── constants/     # Constants and enums
│   │   ├── configurations.ts # Default configurations
│   │   ├── environmental.ts  # Environment variables
│   │   ├── metadata.ts       # Version and app metadata (auto-synced)
│   │   ├── models.ts         # Model constants and definitions
│   │   ├── prompts.ts        # Prompt templates
│   │   ├── troubleshooting.ts # Troubleshooting guides
│   │   └── ui.ts             # UI constants and styling
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
│       ├── clipboard.ts      # Clipboard operations
│       ├── formatFileSize.ts # File size formatting
│       ├── interactive.ts    # Interactive prompts
│       ├── logger.ts         # Logging utilities
│       ├── spinner.ts        # Loading spinners
│       ├── url.ts            # URL utilities
│       └── validation.ts     # Validation helpers
├── test/              # Test files
│   ├── cli/          # CLI tests
│   ├── commands/     # Command-specific tests
│   ├── core/         # Core functionality tests
│   ├── mocks/        # Test mocks and utilities
│   └── setup.ts      # Test setup
├── scripts/          # Build and development scripts
│   ├── generate-version.ts # Version generation utilities
│   ├── release.ts    # Automated release management
│   └── stage.ts      # Development staging script
├── examples/         # Example configurations and usage
│   └── configs/      # Configuration examples
└── generated/        # Auto-generated files
```

## Coding Standards

### TypeScript Guidelines

- Use TypeScript for all new code
- Follow strict type checking
- Use interfaces for object shapes
- Use enums for constant values
- Document complex types with JSDoc comments
- Use centralized constants from `src/constants/` instead of hardcoded values

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces
- Use UPPER_CASE for constants
- Prefix unused parameters with underscore (`_verbose`, `_directory`)

### Testing

- Write tests for all new features
- Maintain existing test coverage
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Place tests in the corresponding test directory structure
- Use the provided test utilities and mocks in `test/mocks/`
- **Ensure tests cover edge cases for model auto-sync, including invalid/empty model values and preservation of custom models.**

### Git Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes

### Environment Variables

When adding new environment variables:

1. Add the variable to `src/constants/environmental.ts`
2. Update the configuration system in `src/core/config.ts`
3. Add documentation in `README.md`
4. Add tests in `test/core/config.test.ts`

> **Note:** The `models` array is now auto-synced with the `model` field. When you update the `model` field (via config file, environment variable, or CLI), only the chat model in `models` will be updated or added, and all other custom models will be preserved. Invalid or empty model values are ignored for auto-sync.

Example:

```typescript
// src/constants/environmental.ts
export const ENVIRONMENTAL_VARIABLES = {
  OLLAMA_COMMIT_NEW_VAR: 'OLLAMA_COMMIT_NEW_VAR',
} as const;
```

### Constants and Configuration

When adding new models, contexts, or configuration options:

1. **Models**: Add to `src/constants/models.ts` using the `MODELS` constant
2. **Context Providers**: Add to `src/constants/models.ts` using the `CONTEXTS` constant
3. **Default Config**: Update `src/constants/configurations.ts` to use constants
4. **Avoid Hardcoding**: Use centralized constants throughout the codebase

Example:

```typescript
// src/constants/models.ts
export const MODELS = {
  DEFAULT: 'mistral:7b-instruct',
  EMBEDDINGS: 'nomic-embed-text',
  // ... other models
} as const;

export const CONTEXTS = [
  { provider: 'code', enabled: true },
  { provider: 'docs', enabled: true },
  { provider: 'diff', enabled: true },
  // ... other contexts
] as const;
```

### Debug Mode

When debugging issues, you can use the following commands:

```bash
# Show detailed configuration
ollama-git-commit config show

# Show debug information
ollama-git-commit config debug

# Test connection to Ollama server
ollama-git-commit test connection

# Test model availability
ollama-git-commit test model -m mistral:7b-instruct

# Test all models
ollama-git-commit test all

# Test with verbose output
ollama-git-commit test all -v

# Test context providers
ollama-git-commit test context code
ollama-git-commit test context diff

# Use quiet mode to reduce git command output
ollama-git-commit -d . --quiet

# Test quiet mode with auto-commit
ollama-git-commit -d . --auto-commit --quiet

# Test quiet mode with verbose for debugging
ollama-git-commit -d . --quiet --verbose
```

## Pull Request Process

1. Update the README.md with details of changes if needed
2. Update the CONTRIBUTING.md if you've changed the development process
3. Add or update tests as needed
4. Ensure all tests pass
5. Update documentation for any new features or changes
6. Follow the PR template and checklist
7. Ensure all constants are centralized and no hardcoded values remain

## Development Tips

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test test/core/config.test.ts

# Run tests with coverage
bun test --coverage

# Run tests with verbose output
bun test --verbose
```

### Debugging

1. Use the `--debug` flag for detailed logging:

   ```bash
   ollama-git-commit -d . --debug
   ```

2. Use the config debug command for configuration debugging:

   ```bash
   ollama-git-commit config debug
   ```

3. Enable verbose output with `-v`:

   ```bash
   ollama-git-commit -d . -v
   ```

4. Test context providers individually:
   ```bash
   ollama-git-commit test context code
   ollama-git-commit test context diff
   ollama-git-commit test context docs
   ```

### Common Issues

1. **Windows Path Issues**: Use `path.join()` instead of string concatenation
2. **Environment Variables**: Always use the `ENVIRONMENTAL_VARIABLES` constant
3. **Git Operations**: Use the Git utility functions in `src/core/git.ts`
4. **Configuration**: Use the `ConfigManager` for all config operations
5. **Testing**: Use the provided test utilities and mocks in `test/mocks/`
6. **Constants**: Use centralized constants from `src/constants/` instead of hardcoded values
7. **Context Providers**: Ensure all context providers are properly enabled in configuration
8. **Message Cleaning**: Test emoji removal and think tag cleaning in `src/core/ollama.ts`

## License

By contributing to Ollama Git Commit, you agree that your contributions will be licensed under the project's MIT License.

## Development Workflow

- All configuration command tests are fully mocked and do not affect real user config files.
- When adding new configuration features, include isolated, mock-based tests to ensure reliability and safety.
- When using `config set <key> <value>`, the configuration system now merges the new value with the existing config file, preserving all other keys. Tests should verify that config changes do not overwrite unrelated values.
- When setting the `model` key via `config set`, the tool will automatically update the `models` array to keep it in sync. Contributors should test that both the `model` field and the `models` array are updated together.

### Troubleshooting SSH Agent (1Password, etc.)

- If you use auto-commit and rely on an SSH agent (such as 1Password CLI), ensure the agent is running and SSH_AUTH_SOCK is set in your environment. The tool runs `git commit` as a foreground process with inherited environment, so interactive authentication (such as 1Password approval) should work as expected.

### Auto-Staging and Auto-Commit

The tool provides intelligent staging and committing workflows:

**`--auto-stage`**: Runs the full staging script, generates an AI commit message, and shows an interactive prompt, but does not commit or push. The user must copy and run the git commit command themselves.

**`--auto-commit`**: Runs the full staging script, generates an AI commit message, and always commits and pushes to the remote repository if approved, regardless of interactive mode. Staging is only done once, before message generation.

For development, you can use:

- `bun dev:run commit -d . --auto-stage` - Stage files, generate AI message, show interactive prompt (manual commit)
- `bun dev:run commit -d . --auto-commit` - Stage files, generate AI message, auto-commit if approved, and push to remote
- `ollama-git-commit -d . --auto-commit` - Direct tool usage (same as --auto-commit)

- Code formatting is handled by running:

```sh
bun run format
```

- This invokes Prettier via npx, ensuring compatibility and avoiding Bun-specific issues.

### Commit Message Escaping

- When passing commit messages to shell commands as strings, always escape double quotes using `message.replace(/"/g, '\\"')`.
- When passing commit messages as argument arrays (e.g., with Node.js spawn), do not escape quotes; pass the raw message.
- Automated tests verify that both patterns are handled safely.
