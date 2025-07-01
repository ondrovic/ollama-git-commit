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

3. Run the staging script to format, lint, and stage your changes:

   ```bash
   bun stage
   ```

4. Commit your changes:

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

The staging script (`bun stage`) will:

- Format your code
- Fix any linting issues
- Stage all files
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

### New Features and Improvements

Recent major improvements include:

- **Context Providers**: Enhanced commit context with code analysis, documentation, diff analysis, terminal info, problem detection, folder structure, and codebase statistics
- **Embeddings Support**: Added support for embedding models for better context understanding
- **Message Cleaning**: Improved emoji removal and think tag cleaning with comprehensive Unicode regex
- **Centralized Constants**: All models and contexts now use centralized constants from `src/constants/models.ts`
- **Verbose Logging**: Enhanced logging throughout the application with detailed context information
- **Improved Configuration**: Better default configurations with enabled context providers by default
- **Enhanced Testing**: Comprehensive test coverage with proper mocks and utilities
- **Multi-Model Support**: Support for multiple model types with role-based configuration
- **Interactive CLI**: Improved user experience with better prompts and feedback

## Release Notes

### Version Management Changes

As of version 1.0.4, we've streamlined our version management:

- **Removed manual version syncing** - No more `update-version.ts` script
- **Single source of truth** - `package.json` is the only place version is stored
- **Automatic version detection** - `metadata.ts` uses `npm_package_version` with smart fallbacks
- **Simplified release process** - One command handles everything

### Automated Publishing

The project uses GitHub Actions for automated NPM publishing:

- **Triggered by git tags** - When you run `bun run release`, a tag is created and pushed
- **Automatic validation** - Ensures version doesn't already exist on NPM
- **Build and test** - Runs full test suite before publishing
- **Zero manual intervention** - Everything happens automatically

## License

By contributing to Ollama Git Commit, you agree that your contributions will be licensed under the project's MIT License.
