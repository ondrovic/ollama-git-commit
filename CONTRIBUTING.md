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

### Development Workflow

1. Create a new branch for your feature or bugfix:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bugfix-name
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

The staging script (`bun stage`) will:

- Update version numbers if needed
- Format your code
- Fix any linting issues
- Stage all files

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
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── test/              # Test files
│   ├── cli/          # CLI tests
│   ├── core/         # Core functionality tests
│   ├── mocks/        # Test mocks
│   └── setup.ts      # Test setup
├── scripts/          # Build and development scripts
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

## License

By contributing to Ollama Git Commit, you agree that your contributions will be licensed under the project's MIT License.
