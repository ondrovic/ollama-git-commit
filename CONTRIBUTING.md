# Contributing to Ollama Git Commit Message Generator

Thank you for your interest in contributing to the Ollama Git Commit Message Generator! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- **Node.js 18.12+** (we recommend using the latest LTS version)
- **Bun** (preferred) or npm/yarn/pnpm
- **Git**
- **Ollama** (for testing)
- Basic understanding of TypeScript and Node.js

### Development Setup

1. **Fork and Clone**
   ```bash
   # Fork the repository on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/ollama-git-commit.git
   cd ollama-git-commit
   ```

2. **Install Dependencies**
   ```bash
   # Using Bun (recommended)
   bun install
   
   # Or using npm
   npm install
   ```

3. **Set Up Development Environment**
   ```bash
   # Build the project
   bun run build
   
   # Link for local testing
   npm link
   
   # Run in development mode
   bun run dev
   ```

4. **Verify Setup**
   ```bash
   # Run tests
   bun test
   
   # Test the CLI
   ollama-git-commit --help
   
   # Test configuration
   ollama-git-commit --config-init
   ollama-git-commit --config-show
   ```

## 📁 Project Structure

```
ollama-git-commit/
├── src/
│   ├── cli.ts              # CLI entry point and argument parsing
│   ├── index.ts            # Library exports and type definitions
│   ├── commands/           # Command implementations
│   │   ├── commit.ts       # Main commit message generation
│   │   ├── models.ts       # Model management commands
│   │   └── test.ts         # Testing and diagnostics
│   ├── core/               # Core business logic
│   │   ├── config.ts       # Configuration management system
│   │   ├── git.ts          # Git operations and parsing
│   │   ├── ollama.ts       # Ollama API client
│   │   └── prompt.ts       # Prompt management and templates
│   └── utils/              # Utility functions
│       ├── clipboard.ts    # Cross-platform clipboard operations
│       ├── formatFileSize.ts # File size formatting
│       ├── interactive.ts  # Interactive prompt handling
│       ├── logger.ts       # Logging and output utilities
│       ├── spinner.ts      # Loading spinners and progress
│       └── validation.ts   # Input validation and environment checks
├── test/                   # Test files (structure mirrors src/)
├── examples/               # Configuration examples
├── docs/                   # Additional documentation
└── dist/                   # Compiled output (generated)
```

## 🛠️ Development Workflow

### 1. **Create a Feature Branch**
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
# or
git checkout -b docs/documentation-update
```

### 2. **Make Your Changes**
- Follow the existing code style and patterns
- Add tests for new functionality
- Update documentation as needed
- Ensure all existing tests pass

### 3. **Testing Your Changes**
```bash
# Run all tests
bun test

# Run linting
bun run lint

# Run type checking
bun run build:types

# Test the CLI manually
bun run dev -- --help
bun run dev -- --config-show
bun run dev -- -d . --test
```

### 4. **Commit Your Changes**
```bash
# Use conventional commit format
git add .
git commit -m "feat: add new configuration option for X"
# or
git commit -m "fix: resolve issue with git diff parsing"
# or
git commit -m "docs: update installation instructions"
```

### 5. **Push and Create Pull Request**
```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub with a clear description of your changes.

## 🎯 Types of Contributions

### 🐛 Bug Fixes
- Fix issues with git diff parsing
- Resolve cross-platform compatibility problems
- Address configuration loading issues
- Fix interactive prompt problems

### ✨ New Features
- Add new prompt templates
- Implement additional configuration options
- Add new CLI commands or options
- Improve error handling and recovery

### 📚 Documentation
- Improve README.md
- Add code comments and JSDoc
- Create or update examples
- Write troubleshooting guides

### 🧪 Testing
- Add unit tests
- Create integration tests
- Improve test coverage
- Add performance benchmarks

### 🔧 Infrastructure
- Improve build process
- Update dependencies
- Enhance CI/CD pipeline
- Optimize performance

## 📝 Coding Standards

### TypeScript Guidelines

1. **Use Strict TypeScript**
   ```typescript
   // Good: Explicit typing
   function processCommit(message: string): Promise<boolean> {
     return Promise.resolve(true);
   }
   
   // Avoid: Implicit any
   function processCommit(message) {
     return Promise.resolve(true);
   }
   ```

2. **Interface Definitions**
   ```typescript
   // Good: Clear interface definitions
   interface CommitOptions {
     model: string;
     host: string;
     verbose: boolean;
   }
   
   // Good: Optional properties
   interface PartialCommitOptions {
     model?: string;
     host?: string;
     verbose?: boolean;
   }
   ```

3. **Error Handling**
   ```typescript
   // Good: Specific error types
   export class GitNoChangesError extends Error {
     constructor(message: string) {
       super(message);
       this.name = 'GitNoChangesError';
     }
   }
   
   // Good: Proper error handling
   try {
     const result = await riskyOperation();
     return result;
   } catch (error: any) {
     Logger.error(`Operation failed: ${error.message}`);
     throw error;
   }
   ```

### Code Style

1. **Use ESLint and Prettier**
   ```bash
   # Check formatting
   bun run lint
   bun run format:check
   
   # Fix formatting
   bun run lint:fix
   bun run format
   ```

2. **Naming Conventions**
   ```typescript
   // Classes: PascalCase
   class GitService { }
   
   // Functions/Variables: camelCase
   const getUserConfig = () => { };
   
   // Constants: UPPER_SNAKE_CASE
   const DEFAULT_TIMEOUT = 10000;
   
   // Interfaces: PascalCase with descriptive names
   interface OllamaCommitConfig { }
   ```

3. **File Organization**
   ```typescript
   // 1. Imports (external first, then internal)
   import { readFileSync } from 'fs';
   import { join } from 'path';
   
   import { Logger } from '../utils/logger';
   import type { CommitConfig } from '../index';
   
   // 2. Type definitions
   interface LocalConfig extends CommitConfig {
     // ...
   }
   
   // 3. Constants
   const DEFAULT_CONFIG_FILE = 'config.json';
   
   // 4. Class/function implementations
   export class ConfigManager {
     // ...
   }
   ```

### Configuration System Guidelines

When working with the configuration system:

1. **Always use the config system**
   ```typescript
   // Good: Use config system
   const config = getConfig();
   const timeout = config.timeouts.connection;
   
   // Bad: Hardcoded values
   const timeout = 10000;
   ```

2. **Support configuration hierarchy**
   ```typescript
   // Good: Respect CLI overrides
   const finalConfig = {
     ...baseConfig,
     ...cliOverrides
   };
   
   // Good: Environment variable support
   const host = process.env.OLLAMA_COMMIT_HOST || config.host;
   ```

3. **Validate configuration**
   ```typescript
   // Good: Validate config values
   private validateConfig(config: Partial<Config>): Config {
     if (config.host) {
       try {
         new URL(config.host);
       } catch {
         throw new Error(`Invalid host URL: ${config.host}`);
       }
     }
     return config as Config;
   }
   ```

## 🧪 Testing Guidelines

### Unit Tests

1. **Test Structure**
   ```typescript
   // test/core/config.test.ts
   import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
   import { ConfigManager } from '../../src/core/config';
   
   describe('ConfigManager', () => {
     let configManager: ConfigManager;
     
     beforeEach(() => {
       configManager = ConfigManager.getInstance();
     });
     
     it('should load default configuration', () => {
       const config = configManager.getConfig();
       expect(config.model).toBeDefined();
       expect(config.host).toBeDefined();
     });
   });
   ```

2. **Test Coverage**
   - Test happy paths and edge cases
   - Test error conditions
   - Test configuration scenarios
   - Test cross-platform compatibility

3. **Mocking External Dependencies**
   ```typescript
   // Mock file system operations
   import { mock } from 'bun:test';
   
   const mockReadFileSync = mock(() => '{"model": "test"}');
   ```

### Integration Tests

1. **CLI Testing**
   ```bash
   # Test CLI commands
   bun run dev -- --config-show
   bun run dev -- --test
   bun run dev -- -d ./test-repo --debug
   ```

2. **Configuration Testing**
   ```bash
   # Test different config scenarios
   OLLAMA_COMMIT_MODEL=test bun run dev -- --config-debug
   ```

## 📋 Pull Request Guidelines

### Before Submitting

1. **Code Quality Checklist**
   - [ ] Code follows TypeScript best practices
   - [ ] All tests pass (`bun test`)
   - [ ] Linting passes (`bun run lint`)
   - [ ] Type checking passes (`bun run build:types`)
   - [ ] Manual testing completed
   - [ ] Documentation updated

2. **Testing Checklist**
   - [ ] New functionality has tests
   - [ ] Edge cases are covered
   - [ ] Error handling is tested
   - [ ] Cross-platform compatibility considered

3. **Documentation Checklist**
   - [ ] Code has appropriate comments
   - [ ] README.md updated if needed
   - [ ] Examples added/updated
   - [ ] Breaking changes documented

### Pull Request Template

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] Cross-platform testing

## Configuration Changes
- [ ] No configuration changes
- [ ] New configuration options added
- [ ] Configuration file format changed
- [ ] Environment variables added/changed

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Notes
Any additional information or context about the changes.
```

## 🐛 Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Environment Information**
   ```bash
   # Run this command and include output
   ollama-git-commit --config-debug
   ```

2. **Reproduction Steps**
   - Clear steps to reproduce the issue
   - Expected vs actual behavior
   - Error messages and stack traces

3. **Configuration**
   - Configuration files used
   - Environment variables set
   - CLI arguments used

### Feature Requests

When requesting features:

1. **Use Case Description**
   - Problem you're trying to solve
   - How the feature would help
   - Alternative solutions considered

2. **Proposed Implementation**
   - How you envision it working
   - Configuration options needed
   - Backward compatibility considerations

## 🎯 Areas for Contribution

### High Priority
- [ ] Windows native support improvements
- [ ] Additional prompt templates
- [ ] Performance optimizations
- [ ] Test coverage improvements
- [ ] Cross-platform clipboard enhancements

### Medium Priority
- [ ] Plugin system for custom processors
- [ ] Git hooks integration
- [ ] Configuration validation improvements
- [ ] Internationalization support
- [ ] Advanced diff analysis

### Documentation
- [ ] Video tutorials
- [ ] More configuration examples
- [ ] Troubleshooting guides
- [ ] API documentation
- [ ] Migration guides

## 💬 Getting Help

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Pull Request Comments**: Code review and implementation discussion

### Development Questions
- Check existing issues and discussions first
- Include relevant code snippets and error messages
- Provide context about what you're trying to achieve
- Be specific about your environment and setup

## 📜 Code of Conduct

### Our Pledge
We are committed to making participation in this project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Expected Behavior
- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement
Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project maintainers. All complaints will be reviewed and investigated promptly and fairly.

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributor graphs and statistics

Thank you for contributing to the Ollama Git Commit Message Generator! Your efforts help make this tool better for everyone. 🚀