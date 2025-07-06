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

The project provides scripts to ensure code quality and consistency:

- **`precommit` script** (`bun run precommit`): Runs linting with auto-fix, tests, and type build checks
- **`stage` script** (`bun run stage`): Formats, lints, tests, builds type declarations, and stages files

For detailed information about these scripts and development workflow, see the [Development Workflow](#development-workflow) section in README.md.

### CI/CD and Testing

The project uses GitHub Actions for automated testing and publishing:

- **Automated Testing**: All branches are tested on push and pull requests
- **Cross-Platform Compatibility**: Tests run on Windows, macOS, and Linux
- **Dependency Management**: Robust handling of package dependencies with fallback strategies
- **Test Isolation**: All tests use mocks to avoid real external calls
- **Test Safety**: Eliminated dangerous global prototype modifications that could cause unpredictable test failures
- **Automated Publishing**: Releases are automatically published to NPM when tags are pushed

The CI/CD workflows are defined in `.github/workflows/` and include comprehensive dependency verification and error recovery strategies.

## Project Structure

```
ollama-git-commit/
├── src/
│   ├── cli/           # CLI command implementations
│   │   ├── commands/  # Individual command modules
│   │   │   ├── commit.ts      # Main commit command
│   │   │   ├── config/        # Configuration management commands
│   │   │   ├── models.ts # Model management commands
│   │   │   └── test/          # Testing commands
│   │   ├── utils/     # CLI-specific utilities
│   │   └── index.ts   # CLI entry point
│   ├── core/          # Core functionality
│   │   ├── config.ts  # Configuration management
│   │   ├── context.ts # Context providers (git status, diff, etc.)
│   │   ├── factory.ts # ServiceFactory for centralized service creation
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

### Logging Standards

- **Use Logger Methods**: Always use Logger methods instead of `console.log` or `console.error`
- **No Hardcoded Emojis**: Never include emojis directly in log messages - they are handled by Logger methods
- **Specialized Methods**: Use appropriate Logger methods for different contexts:
  - `Logger.info()` for general information
  - `Logger.success()` for successful operations
  - `Logger.error()` for errors
  - `Logger.warn()` for warnings
  - `Logger.debug()` for debug information
  - `Logger.version()`, `Logger.rocket()`, `Logger.package()`, etc. for specific contexts
- **Logger.group Usage**: When using `Logger.group()`, always provide a function parameter:

  ```typescript
  // ✅ Correct
  Logger.group('Label', () => {
    Logger.info('Content');
  });

  // ❌ Incorrect
  Logger.group('Label');
  Logger.info('Content');
  ```

- **Test Logging**: In tests, spy on Logger methods instead of console.log:
  ```typescript
  const loggerSpy = spyOn(Logger.prototype, 'info').mockImplementation(() => {});
  // Test logic
  expect(loggerSpy).toHaveBeenCalledWith('expected message');
  ```

### Testing

- Write tests for all new features
- Maintain existing test coverage
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)
- **Mock external dependencies**: All tests must use mocks to avoid real external calls (API, filesystem, git commands)
- Place tests in the corresponding test directory structure
- Use the provided test utilities and mocks in `test/mocks/`
- **Cross-platform compatibility**: Ensure tests work on Windows, macOS, and Linux
- **Ensure tests cover edge cases for model auto-sync, including invalid/empty model values and preservation of custom models.**
- **Use proper interface implementations**: All mock services should implement the complete interface (e.g., `IOllamaService` with all required methods)
- **Dependency Injection**: Use the ServiceFactory for creating services in tests to ensure consistency with production code
- **Filesystem Mocking**: Always mock filesystem operations to prevent real file creation during tests
- **Path Validation**: Use cross-platform path validation that works on both Windows and Unix systems
- **Global State Protection**: Never modify global prototypes (like `String.prototype`) in tests
  - Use isolated mocking approaches instead of global modifications
  - Create test-specific functions that simulate edge cases without affecting global state
  - Ensure tests don't interfere with each other by maintaining clean global state

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

### Service Architecture and Dependency Injection

The project uses a modern dependency injection pattern with a centralized ServiceFactory:

1. **ServiceFactory**: All services are created through `src/core/factory.ts`

   - Provides consistent configuration across all services
   - Ensures proper quiet mode and verbose settings
   - Uses singleton pattern for consistent service creation
   - Supports dependency injection for better testability

2. **Service Creation**: Use the factory instead of direct instantiation

   ```typescript
   // ✅ Good: Use factory
   const factory = ServiceFactory.getInstance();
   const services = await factory.createCommitServices({
     directory: options.directory,
     quiet: options.quiet,
     verbose: options.verbose,
     debug: options.debug,
   });

   // ❌ Avoid: Direct instantiation
   const ollamaService = new OllamaService(logger, undefined, false);
   ```

3. **Command Dependencies**: All commands now require explicit service injection
   - CommitCommand, ModelsCommand, and TestCommand use injected services
   - No more fallback instantiation - services must be provided
   - Improved testability and consistency

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

### Environment Variables

When adding new environment variables:

1. Add the variable to `src/constants/environmental.ts`
2. Update the configuration system in `src/core/config.ts`
3. Add documentation in `README.md`
4. Add tests in `test/core/config.test.ts`

Example:

```typescript
// src/constants/environmental.ts
export const ENVIRONMENTAL_VARIABLES = {
  OLLAMA_COMMIT_NEW_VAR: 'OLLAMA_COMMIT_NEW_VAR',
} as const;
```

## Development Workflow

For detailed information about the development workflow, including feature development, release process, and automated publishing, see the [Development Workflow](#development-workflow) and [Release Workflow](#release-workflow-for-maintainers) sections in README.md.

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

### Code Formatting

Code formatting is handled by running:

```sh
bun run format
```

This invokes Prettier via npx, ensuring compatibility and avoiding Bun-specific issues.

### Commit Message Escaping

- When passing commit messages to shell commands as strings, always escape double quotes using `message.replace(/"/g, '\\"')`.
- When passing commit messages as argument arrays (e.g., with Node.js spawn), do not escape quotes; pass the raw message.
- Automated tests verify that both patterns are handled safely.

## Pull Request Process

1. Update the README.md with details of changes if needed
2. Update the CONTRIBUTING.md if you've changed the development process
3. Add or update tests as needed
4. Ensure all tests pass
5. Update documentation for any new features or changes
6. Follow the PR template and checklist
7. Ensure all constants are centralized and no hardcoded values remain

## License

By contributing to Ollama Git Commit, you agree that your contributions will be licensed under the project's MIT License.

- When adding new config subcommands (e.g., under `src/cli/commands/config/`), update the README.md with usage and examples, and add an entry to CHANGELOG.md under [Unreleased].

## CLI Option Guidelines

- All new CLI options should provide both a short (single dash) and long (double dash) flag, unless a short flag would conflict or is not conventional.
- When adding or changing CLI options, update the README and CHANGELOG with usage examples and details.
- Ensure all new/changed options are covered by tests.
