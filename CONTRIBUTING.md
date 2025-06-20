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
- *(No longer manages version numbers - this is handled by the release script)*

## Project Structure

```
ollama-git-commit/
├── src/
│   ├── cli/           # CLI command implementations
│   │   ├── commands/  # Individual command modules
│   │   ├── utils/     # CLI-specific utilities
│   │   └── index.ts   # CLI entry point
│   ├── core/          # Core functionality
│   │   ├── config.ts  # Configuration management
│   │   ├── git.ts     # Git operations
│   │   ├── ollama.ts  # Ollama API client
│   │   └── prompt.ts  # Prompt management
│   ├── constants/     # Constants and enums
│   │   └── metadata.ts # Version and app metadata (auto-synced)
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── test/              # Test files
│   ├── cli/          # CLI tests
│   ├── core/         # Core functionality tests
│   ├── mocks/        # Test mocks
│   └── setup.ts      # Test setup
├── scripts/          # Build and development scripts
│   ├── release.ts    # Automated release management
│   └── stage.ts      # Development staging script
├── docs/            # Documentation
└── examples/        # Example configurations and usage
```

## Coding Standards

### TypeScript Guidelines

- Use TypeScript for all new code
- Follow strict type checking
- Use interfaces for object shapes
- Use enums for constant values
- Document complex types with JSDoc comments

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Use camelCase for variables and functions
- Use PascalCase for classes and interfaces
- Use UPPER_CASE for constants

### Testing

- Write tests for all new features
- Maintain existing test coverage
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Place tests in the corresponding test directory structure

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

1. Add the variable to `src/constants/enviornmental.ts`
2. Update the configuration system in `src/core/config.ts`
3. Add documentation in `README.md`
4. Add tests in `test/core/config.test.ts`

Example:

```typescript
// src/constants/enviornmental.ts
export const ENVIRONMENTAL_VARIABLES = {
  OLLAMA_COMMIT_NEW_VAR: 'OLLAMA_COMMIT_NEW_VAR',
} as const;
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

# Run all tests
ollama-git-commit test all
```

## Pull Request Process

1. Update the README.md with details of changes if needed
2. Update the CONTRIBUTING.md if you've changed the development process
3. Add or update tests as needed
4. Ensure all tests pass
5. Update documentation for any new features or changes
6. Follow the PR template and checklist

## Development Tips

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test test/core/config.test.ts

# Run tests with coverage
bun test --coverage
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

### Common Issues

1. **Windows Path Issues**: Use `path.join()` instead of string concatenation
2. **Environment Variables**: Always use the `ENVIRONMENTAL_VARIABLES` constant
3. **Git Operations**: Use the Git utility functions in `src/core/git.ts`
4. **Configuration**: Use the `ConfigManager` for all config operations
5. **Testing**: Use the provided test utilities and mocks in `test/mocks/`

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