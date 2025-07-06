# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **CI/CD Workflow Improvements**: Enhanced GitHub Actions workflows for better reliability
  - **Dependency Management**: Robust handling of package dependencies with fallback installation strategies
  - **Cross-Platform Testing**: Fixed test compatibility issues between Windows and Linux environments
  - **Dependency Verification**: Added comprehensive dependency checking and installation verification
  - **Fallback Strategies**: Implemented npm install fallback when bun install fails
  - **Debugging Capabilities**: Enhanced workflow debugging with detailed dependency verification steps

### Fixed

- **Type Safety Bug**: Fixed critical bug in `registerCommitCommand` function

  - **Parameter Type Mismatch**: Fixed contradiction between optional `deps` parameter type and required implementation
  - **Runtime Error Prevention**: Eliminated unexpected crashes when dependencies were missing
  - **API Consistency**: Made function signature match implementation for predictable behavior
  - **Test Reliability**: Updated tests to provide required dependencies instead of expecting optional behavior

- **Test Reliability**: Fixed failing tests in CI/CD environment
  - **Path Structure Tests**: Fixed cross-platform path validation to work on both Windows and Linux
  - **System Prompt Tests**: Added proper filesystem mocking to prevent real file creation during tests
  - **Dependency Resolution**: Fixed `string-width` package installation issues in CI environment
  - **Test Isolation**: Ensured all tests use mocks to avoid real external calls (API, filesystem, git commands)
  - **Package Version Compatibility**: Downgraded `string-width` to version 6.0.0 for better compatibility
  - **Global Prototype Modification**: Fixed dangerous global `String.prototype.split` modification in tests that could cause unpredictable test failures
    - Replaced global prototype modification with isolated mocking approach
    - Implemented safe test function that simulates edge cases without affecting global state
    - Maintained test coverage for error handling while eliminating side effects
    - Fixed linter errors related to object comparison in proxy tests

### Technical Details

- **Type Safety Fix**: Resolved critical API inconsistency in `registerCommitCommand` function

  - **Function Signature**: Changed `deps?: Partial<CommitCommandDeps>` to `deps: CommitCommandDeps` to match implementation
  - **Implementation Simplification**: Removed runtime error throwing logic in favor of direct dependency destructuring
  - **Test Updates**: Modified test that expected optional dependencies to provide required dependencies
  - **API Predictability**: Ensured function signature accurately reflects required behavior

- **CI/CD Enhancements**:

  - **Dependency Installation**: Removed conditional cache-based installation that was preventing proper dependency resolution
  - **Package Verification**: Added steps to verify package installation and detect missing dependencies
  - **Cross-Platform Paths**: Updated path validation regex to accept both Windows (`C:\`) and Unix (`/`) paths
  - **Filesystem Mocking**: Enhanced test mocks to prevent real filesystem operations during testing
  - **Error Recovery**: Implemented fallback strategies for dependency installation failures

- **Test Safety Improvements**: Eliminated dangerous global prototype modifications in test suite

  - **Isolated Mocking**: Created `testCreateConfigUpdateWithCustomSplit` function for safe edge case testing
  - **Global State Protection**: Removed `String.prototype.split` modifications that could affect other tests
  - **Error Handling Coverage**: Maintained comprehensive test coverage for configuration update error scenarios
  - **Linter Compliance**: Fixed object comparison issues in proxy-based tests

- **Comprehensive Logging Refactoring**: Complete logging system overhaul with consistent emoji handling
  - Extended Logger class with 15+ specialized methods for different use cases (version, increment, changelog, tag, rocket, package, memo, hammer, test, nail, magnifier, label, floppy, folder, house)
  - Added static proxy methods for backward compatibility
  - Implemented centralized emoji management - no hardcoded emojis in log messages
  - Enhanced ILogger interface with all new log methods for complete type safety
  - Standardized logging patterns across all CLI commands, core services, and utilities
- **Dependency Injection Architecture**: Modern service architecture with centralized factory
  - ServiceFactory provides centralized creation of all services with consistent configuration
  - Proper dependency injection ensures testability and maintainability
  - All commands use injected services instead of inline instantiation
  - Improved error handling and user feedback across all service layers
- **Enhanced CLI Commands**: Improved command structure and user experience
  - Short (`-x`) and long (`--xxx`) flags for all CLI commands and options, following best CLI practices
  - Usage examples in documentation for both short and long forms
  - **config list-prompt-templates**: New subcommand to list all available built-in prompt templates and view the contents of any template
  - Intelligent configuration key validation with typo suggestions and helpful error messages
- **Test Infrastructure Improvements**: Enhanced testing capabilities and reliability
  - Updated test mocks to implement complete IOllamaService interface
  - Fixed function naming consistency across test command modules
  - Enhanced test isolation through proper dependency injection
  - Improved error handling and user feedback in test scenarios
- **Code Quality Enhancements**: Improved maintainability and type safety
  - Fixed unused variable declarations across test command files
  - Removed unused logger instances in favor of static Logger class usage
  - Cleaned up unused factory variables and parameters
  - Improved code consistency and reduced linting warnings
- **Enhanced Commit Message Display**: Improved commit message presentation and user experience
  - Fixed commit message display to show properly regardless of verbose mode settings
  - Replaced table-based display with plain text formatting for better compatibility
  - Enhanced visual separation of commit messages with clear borders
  - Improved user interaction flow with better message visibility
- **Quiet Mode Improvements**: Enhanced quiet mode functionality across the application
  - Fixed debug mode test prompts to respect quiet mode settings
  - Improved verbose output control with `config.verbose && !config.quiet` logic
  - Enhanced quiet mode behavior for all service layers
  - Better user experience when running in quiet mode

### Changed

- **Comprehensive Logging Refactoring**: Standardized logging across the entire codebase
  - Replaced all `console.log` and `console.error` calls with appropriate Logger methods
  - Removed hardcoded emojis from all log messages - emojis are now handled exclusively by Logger methods
  - Updated all CLI commands, core services, utilities, and scripts to use Logger consistently
  - Fixed Logger.group usage to require function parameter for proper grouping
  - Enhanced test files to spy on Logger methods instead of console.log for proper testing
- **Service Architecture**: Refactored service instantiation to use dependency injection
  - All commands now require explicit service injection instead of fallback instantiation
  - CommitCommand, ModelsCommand, and TestCommand updated to use ServiceFactory
  - CLI commands updated to create services through factory with proper configuration
  - Removed inline service creation in favor of centralized factory pattern
- **CLI Command Structure**: Enhanced command organization and user experience
  - All CLI commands now support both short and long flags for options where appropriate
  - Improved consistency and discoverability of CLI options
  - Enhanced configuration validation with intelligent key suggestions
  - Standardized error handling and user feedback across all commands
- **Test Command Architecture**: Improved test command structure and naming
  - Fixed import/export mismatches in test command modules
  - Updated function names to follow consistent naming convention
  - Enhanced test commands to use ServiceFactory for service creation
  - Improved error handling and user feedback in test commands
- **Commit Command Architecture**: Enhanced commit command with dependency injection and improved logging
  - Added dependency injection support for file system, path, OS, and process operations
  - Improved error handling and logging consistency throughout the commit process
  - Enhanced quiet mode behavior with proper Logger method usage
  - Better separation of concerns with injected dependencies

### Fixed

- **Logger Consistency**: Fixed inconsistent logging patterns across the codebase
  - Eliminated double emojis in log output by removing hardcoded emojis from messages
  - Fixed Logger.group usage to properly require function parameter for grouped content
  - Updated test expectations to verify Logger method calls instead of console.log
  - Ensured all logging follows the same pattern: no emojis in messages, all emojis handled by Logger
- **Test Reliability**: Fixed test failures due to missing interface methods
  - Updated mock OllamaService objects to include all required interface methods
  - Fixed import/export mismatches in test command modules
  - Resolved TypeScript compilation errors in test files
  - Ensured all tests pass with proper mock implementations
- **Type Safety**: Improved type safety across the codebase
  - Fixed constructor signature mismatches in command classes
  - Updated TestCommand to use interface instead of concrete class
  - Resolved TypeScript errors in build process
  - Enhanced type checking for service dependencies
- **Configuration Validation**: Enhanced configuration key validation and error handling
  - Fixed template validation bug where "undefined" could be displayed due to VALID_TEMPLATES mismatch
  - Standardized logger usage to respect --verbose flag configuration
  - Removed unsafe `as any` type assertions and improved type safety
  - **config models list**: The `-t, --type` option now correctly lists models from the specified configuration type (`user` or `local`) instead of always showing the merged config
- **Linter and TypeScript Errors**: Resolved code quality issues
  - Fixed CLI option handling and documentation inconsistencies
  - Resolved unused variable declarations and import/export mismatches
  - Improved code consistency and reduced linting warnings
- **Commit Message Display**: Fixed commit message visibility and formatting issues
  - Fixed commit message not displaying properly when verbose mode was disabled
  - Resolved table-based display issues that prevented message visibility
  - Improved message formatting with consistent border styling
  - Enhanced user experience with better message presentation
- **Quiet Mode Behavior**: Fixed quiet mode inconsistencies across the application
  - Fixed debug mode test prompts showing verbose output even when quiet mode was enabled
  - Improved verbose output control logic to properly respect quiet mode settings
  - Enhanced quiet mode behavior for all service layers and commands
  - Better user experience when running with `--quiet` flag

### Technical Details

- **Comprehensive Logging Refactoring**:
  - **Logger Class Enhancement**: Extended Logger with 15+ specialized methods (version, increment, changelog, tag, rocket, package, memo, hammer, test, nail, magnifier, label, floppy, folder, house)
  - **Emoji Management**: Centralized emoji handling in Logger methods - no hardcoded emojis in log messages
  - **Static Proxies**: Added backward-compatible static methods for all Logger functionality
  - **Interface Updates**: Enhanced ILogger interface with all new log methods for complete type safety
  - **Test Infrastructure**: Updated all test files to spy on Logger methods instead of console.log
  - **Build Scripts**: Refactored all build, release, and development scripts to use Logger consistently
- **ServiceFactory Implementation**:
  - Singleton pattern for consistent service creation
  - Configurable service creation with options for verbose, quiet, and debug modes
  - Proper dependency injection for all service layers
  - Centralized configuration management
- **Test Infrastructure Improvements**:
  - Updated test mocks to implement complete IOllamaService interface
  - Fixed function naming consistency across test command modules
  - Enhanced test isolation through proper dependency injection
  - Improved error handling and user feedback in test scenarios
- **Build Process**:
  - Resolved TypeScript compilation errors
  - Fixed import/export mismatches
  - Ensured all type declarations build successfully
  - Maintained backward compatibility while improving architecture
- **Enhanced Configuration Validation**: Added intelligent key validation to the `config set` command
  - Validates configuration keys before setting values to prevent invalid configurations
  - Provides helpful suggestions for similar keys when an invalid key is provided
  - Shows common typos and suggests correct alternatives (e.g., "quite" → "quiet")
  - Limits suggestions to 5 options to avoid overwhelming users
  - Exports `getConfigKeys()` function for reuse across the codebase
- **Code Quality Improvements**: Enhanced code quality and maintainability
  - Fixed unused variable declarations across test command files
  - Removed unused logger instances in favor of static Logger class usage
  - Cleaned up unused factory variables and parameters
  - Improved code consistency and reduced linting warnings
- **CLI Command Auditing**: Ensured consistent and conventional CLI option structure
  - Audited all `.option()` calls in CLI command registration to ensure non-conflicting, conventional short flags
  - Updated tests and documentation to reflect new CLI option structure
  - Added `getConfigByType(type: 'user' | 'local')` to `ConfigManager` to fetch config from a specific file, used by the models list command
- **Commit Command Enhancements**:
  - **Dependency Injection**: Added `CommitCommandDeps` interface for file system, path, OS, and process operations
  - **Improved Logging**: Replaced all `console.log` calls with appropriate Logger methods throughout the commit process
  - **Quiet Mode Logic**: Enhanced verbose output control with `config.verbose && !config.quiet` pattern
  - **Message Display**: Replaced table-based display with plain text formatting for better compatibility
  - **Error Handling**: Improved error handling and user feedback with consistent logging patterns
- **Quiet Mode Architecture**:
  - **Verbose Control**: Implemented consistent `config.verbose && !config.quiet` logic across all service layers
  - **Debug Mode Respect**: Fixed debug mode test prompts to respect quiet mode settings
  - **Service Integration**: Enhanced quiet mode behavior for GitService, OllamaService, and PromptService
  - **User Experience**: Improved quiet mode behavior with proper progress indicators and minimal output

## [1.0.18] - 2025-07-05

## [1.0.17] - 2025-07-05

### Added

- **ServiceFactory**: New centralized service creation with dependency injection
  - Centralized creation of Logger, GitService, OllamaService, PromptService, ContextService, and ConfigManager
  - Consistent configuration across all services with proper quiet mode handling
  - Improved testability and maintainability through dependency injection
  - Factory pattern ensures all services are created with consistent settings

### Changed

- **Dependency Injection Architecture**: Refactored service instantiation to use dependency injection
  - All commands now require explicit service injection instead of fallback instantiation
  - CommitCommand, ModelsCommand, and TestCommand updated to use ServiceFactory
  - CLI commands updated to create services through factory with proper configuration
  - Removed inline service creation in favor of centralized factory pattern
- **Test Command Architecture**: Improved test command structure and naming
  - Fixed import/export mismatches in test command modules
  - Updated function names to follow consistent naming convention
  - Enhanced test commands to use ServiceFactory for service creation
  - Improved error handling and user feedback in test commands
- **Interface Compliance**: Enhanced mock services to fully implement IOllamaService interface
  - Added missing methods to test mocks: testConnection, getModels, isModelAvailable, generateEmbeddings, generateEmbeddingsBatch, setQuiet
  - Updated TestCommand to accept IOllamaService interface instead of concrete class
  - Improved test isolation and reliability through proper interface implementation

### Fixed

- **Test Reliability**: Fixed test failures due to missing interface methods
  - Updated mock OllamaService objects to include all required interface methods
  - Fixed import/export mismatches in test command modules
  - Resolved TypeScript compilation errors in test files
  - Ensured all tests pass with proper mock implementations
- **Type Safety**: Improved type safety across the codebase
  - Fixed constructor signature mismatches in command classes
  - Updated TestCommand to use interface instead of concrete class
  - Resolved TypeScript errors in build process
  - Enhanced type checking for service dependencies

### Technical Details

- **ServiceFactory Implementation**:
  - Singleton pattern for consistent service creation
  - Configurable service creation with options for verbose, quiet, and debug modes
  - Proper dependency injection for all service layers
  - Centralized configuration management
- **Test Infrastructure Improvements**:
  - Updated test mocks to implement complete IOllamaService interface
  - Fixed function naming consistency across test command modules
  - Enhanced test isolation through proper dependency injection
  - Improved error handling and user feedback in test scenarios
- **Build Process**:

  - Resolved TypeScript compilation errors
  - Fixed import/export mismatches
  - Ensured all type declarations build successfully
  - Maintained backward compatibility while improving architecture

- **Enhanced Configuration Validation**: Added intelligent key validation to the `config set` command
  - Validates configuration keys before setting values to prevent invalid configurations
  - Provides helpful suggestions for similar keys when an invalid key is provided
  - Shows common typos and suggests correct alternatives (e.g., "quite" → "quiet")
  - Limits suggestions to 5 options to avoid overwhelming users
  - Exports `getConfigKeys()` function for reuse across the codebase
- **Code Quality Improvements**: Enhanced code quality and maintainability
  - Fixed unused variable declarations across test command files
  - Removed unused logger instances in favor of static Logger class usage
  - Cleaned up unused factory variables and parameters
  - Improved code consistency and reduced linting warnings
- **Audited all `.option()` calls in CLI command registration to ensure non-conflicting, conventional short flags**:
- **Updated tests and documentation to reflect new CLI option structure**:

## [1.0.16] - 2025-07-05

### Added

- **Enhanced Quiet Mode Support**: Improved quiet mode configuration handling across all services
  - Added `setQuiet` method to Context Service and Prompt Service interfaces
  - Enhanced quiet mode propagation from configuration to all service layers
  - Improved quiet mode consistency across git operations and context gathering

### Changed

- **Git Service Output Handling**: Optimized stdio configuration for better git command output management
  - Modified non-quiet mode to use `['pipe', 'pipe', 'pipe']` for consistent output capture
  - Enhanced error handling for stdout/stderr capture in git operations
  - Improved output display logic to maintain git behavior while enabling programmatic access
- **Repository Compatibility**: Enhanced staging scripts to work with any repository, not just ollama-git-commit
  - Added repository detection to use different workflows for internal vs external repositories
  - Implemented script existence checks before execution to prevent failures
  - Added graceful fallbacks when target repositories lack expected scripts

### Fixed

- **Git Service stdio Configuration**: Fixed critical issue in non-quiet mode that was breaking git command behavior
  - **Loss of stderr**: Fixed issue where important warnings and error messages were captured but discarded
  - **Degraded user experience**: Fixed broken interactive commands, real-time output, and stripped formatting/colors
  - **Excessive noise**: Fixed internal git commands printing unwanted output
  - **Hidden errors**: Removed overly aggressive `.git` line filtering that could hide critical diagnostic messages
  - **Solution**: Non-quiet mode now uses `stdio: ['pipe', 'pipe', 'pipe']` to capture output for programmatic use while manually displaying it to the user, preserving natural git behavior
- **Repository Script Compatibility**: Fixed issues when running in repositories without expected scripts
  - **Staging Script Failures**: Fixed `scripts/stage.ts` and `scripts/precommit.ts` failing when target repositories lack `lint:fix`, `build:types`, or other scripts
  - **Context Service Errors**: Fixed `ContextService.detectProblems()` failing when target repositories don't have `lint` or `build` scripts
  - **Script Existence Checks**: Added robust checks to verify scripts exist before execution
  - **Graceful Degradation**: Implemented fallback behavior when scripts are missing

### Technical Details

- Added `setQuiet` method to IPromptService interface and PromptService implementation
- Enhanced ContextService with `setQuiet` method for dynamic quiet mode updates
- Updated commit command to properly propagate quiet settings to all service layers
- Optimized GitService.execCommand to use appropriate `stdio` configuration for each mode:
  - Quiet mode: `stdio: ['pipe', 'pipe', 'pipe']` (captures output without display)
  - Non-quiet mode: `stdio: ['pipe', 'pipe', 'pipe']` (captures output for programmatic use and manually displays to user)
- **Auto-commit Implementation**: Uses `spawn` with `stdio: 'inherit'` for user-facing git commands (commit, push) to preserve natural git behavior, colors, and interactive prompts
- **Repository Detection Logic**: Added package.json name checking to identify ollama-git-commit repository vs external repositories
- **Script Validation**: Implemented package.json parsing to check script availability before execution
- **Context Service Robustness**: Enhanced `detectProblems()` method to read available scripts from package.json before attempting execution
- Updated test cases to reflect new stdio configuration expectations
- Enhanced MockedConfigManager to include quiet property for test consistency

## Release Process

### Version Management

As of version 1.0.4, we've streamlined our version management:

- **Single source of truth**: `package.json` is the only place version is stored
- **Automatic version detection**: `metadata.ts` uses `npm_package_version` with smart fallbacks
- **Simplified release process**: One command handles everything

### Automated Publishing

The project uses GitHub Actions for automated NPM publishing:

- **Triggered by git tags**: When you run `bun run release`, a tag is created and pushed
- **Automatic validation**: Ensures version doesn't already exist on NPM
- **Build and test**: Runs full test suite before publishing
- **Zero manual intervention**: Everything happens automatically

## [1.0.15] - 2025-07-04

### Added

- Enhanced `--auto-stage` flag now runs the full staging script, generates an AI commit message, and shows an interactive prompt, but requires manual commit (user must copy and run the git commit command).
- Enhanced `--auto-commit` flag now runs the full staging script, generates an AI commit message, and if the user approves with 'y', automatically commits with the AI-generated message and pushes to the remote repository. Staging is only done once, before message generation.

### Fixed

- Improved version change detection logic for `package-lock.json`: now only reports a version change if the version actually changes and the new version is valid (not '..' or empty). Prevents false positives in commit messages.
- Auto-commit now works with 1Password SSH agent and other SSH agents: the tool runs `git commit` as a foreground process with inherited environment, allowing interactive authentication to work as expected.
- Auto-commit now works with 1Password SSH agent and other SSH agents: the tool runs `git commit` as a foreground process with inherited environment, allowing interactive authentication to work as expected.
- Updated the 'format' script to use 'npx prettier --write src/\*_/_.ts' to avoid Bun crash on Windows.
- Fixed a critical bug where commit messages containing double quotes were not properly escaped when passed to shell commands, causing git commit failures and introducing a potential command injection vulnerability. Now, all shell command invocations escape double quotes correctly, while argument arrays (spawn) use the raw message safely.
- Added automated tests to verify correct escaping for both shell and argument array usage.

### Technical Details

- The version extraction logic for `package-lock.json` and similar files now checks that both old and new versions are present, not equal, and the new version is not '..' or empty before reporting a change. This avoids reporting spurious or truncated version changes in commit messages.
- The auto-commit implementation now uses `spawn` with `stdio: 'inherit'` and inherits the environment, ensuring compatibility with SSH agents like 1Password CLI on all platforms.
- The 'format' script in package.json now uses 'npx prettier --write src/**/\*.ts' instead of 'prettier --write src/**/\*.ts' or 'bun format'. This change ensures formatting works reliably regardless of the Bun version or platform.
- All shell command invocations now use `message.replace(/"/g, '\\"')` to escape double quotes.
- All uses of Node.js `spawn` or argument arrays pass the raw message, which is safe and does not require escaping.
- Added a test in `test/commands/commit.test.ts` to verify escaping logic for both shell and argument array usage.
- Removed the temporary manual test file `test-spawn.js`.

## [1.0.13],[1.0.14] - 2025-07-02

### Added

- `config set <key> <value>` command to set configuration values with support for nested keys, boolean parsing, numeric parsing, and array parsing
- `config keys` command to list all available configuration keys with descriptions and default values
- Support for `--all` flag in config set to update all active configuration files

### Fixed

- Config set command tests are now fully mocked, isolated, and reliable. The test suite no longer touches real config files and is deterministic.
- Fixed duplicate "✅" in config set command output by removing redundant emoji from logger messages.
- Fixed TypeScript type errors in `config set` command related to `ConfigSources` and nested key assignment. The release process and type generation now succeed without errors.
- Fixed `createConfigUpdate` function to properly handle keys with empty parts (e.g., "a..b", "a."). Previously, such keys would silently fail due to empty string key filtering. Now they correctly create nested objects with empty string keys as intended.
- Fixed a bug where `config set <key> <value>` would overwrite the entire config file instead of merging/appending the new value. Now, only the specified key is updated and all other config values are preserved.
- Setting the `model` key via `config set` now automatically updates the `models` array to keep them in sync. This prevents mismatches between the primary model and the models array.
- Fixed a bug in the configuration auto-sync logic where updating the `model` field would:
  - Fail to add a chat model if none existed in the `models` array
  - Create invalid model entries with empty names if `model` was set to an empty string
  - Overwrite existing custom model configurations in the `models` array instead of preserving them and only updating the relevant chat model
  - Result in inconsistent configuration, potential API failures, and loss of user-defined models

### Changed

- Updated prompts tofurther try and filter out the <think /> processes

### Technical Details

- Updated `displayUpdatedKey` to accept `ConfigSources` as `Record<string, unknown>` via type assertion.
- Added type guards in `createConfigUpdate` to prevent 'undefined' index errors.
- Enhanced `createConfigUpdate` function to process all key parts including empty strings, removing the `if (key)` and `if (lastKey)` checks that were silently filtering out empty key parts.
- Added comprehensive test coverage for keys with empty parts to ensure proper handling of edge cases like "a..b", "a.", ".a", and "a..b..c".
- Improved error handling in nested key creation with proper error messages for invalid key structures.
- Updated config save logic to merge new values with existing config using defaults as a base, ensuring type safety and preventing accidental overwrites.
- Added/expanded tests to verify that config changes merge values and do not overwrite unrelated keys.
- Tests have been added/updated to verify that changing the model also updates the models array accordingly.
- The `saveConfig` method in `ConfigManager` now:
  - Validates the `model` value before updating the `models` array
  - Only updates or adds the chat model, preserving all other custom models
  - Never creates models with empty names
  - Ensures the embeddings model is present if missing
- The test suite (`test/core/config.test.ts`) now includes comprehensive tests for:
  - Auto-syncing the models array when the `model` field is updated
  - Adding a chat model if none exists
  - Skipping auto-sync for invalid model values
  - Preserving custom model configurations when updating the chat model

## [1.0.12] - 2025-07-01

### Changed

- Updated all example configuration files in `examples/configs/env/.env-example`, `examples/configs/project-local/.ollama-git-commit.json`, and `examples/configs/user-global/.ollama-git-commit.json` to match the current codebase configuration options, including multi-model, embeddings, and context providers.
- Updated README.md to ensure all environment variable and configuration examples are accurate and consistent with the latest codebase features and options.

### Technical Details

- Synchronized example configs with the latest configuration schema from `src/constants/configurations.ts` and `src/types/index.ts`.
- Updated environment variable names in README.md to use the correct `OLLAMA_COMMIT_*` format.
- Expanded configuration examples in README.md to include all supported fields and options, including multi-model and context provider settings.
- Ensured documentation and example configs reflect the current default model (`mistral:7b-instruct`) and provider roles.

## [1.0.11] - 2025-07-01

### Changed

- Updated README.md with current default model (mistral:7b-instruct) in all examples and configuration sections
- Enhanced CONTRIBUTING.md with current project structure and development guidelines
- Updated configuration examples to reflect current multi-model and context provider features
- Improved environment variable documentation with new configuration options
- Updated model management examples to use current default model throughout documentation
- Enhanced features section with centralized constants and auto-sync configuration descriptions

### Added

- Enhanced documentation synchronization with latest features and configurations
- Added bunx installation option to README.md as alternative to npx
- Updated context provider examples in CONTRIBUTING.md with current provider names
- Added comprehensive multi-model configuration documentation with environment variables
- Enhanced embeddings support documentation with current default model examples
- Added detailed technical details for documentation updates in changelog

### Fixed

- Documentation alignment with current default models and configuration options
- Updated model examples throughout documentation to use current defaults (mistral:7b-instruct)
- Fixed outdated model references (codellama, llama2) in configuration examples
- Corrected context provider examples to use current provider names (code, diff, docs)
- Aligned environment variable examples with current configuration system

### Technical Details

- Updated README.md installation section to include bunx as alternative installation method
- Enhanced README.md environment variables section with multi-model configuration options
- Updated README.md configuration examples to use mistral:7b-instruct as default model
- Enhanced README.md features section with centralized constants and auto-sync features
- Updated CONTRIBUTING.md constants examples to use current default model and context format
- Enhanced CONTRIBUTING.md debug mode section with current test commands and context providers
- Updated CONTRIBUTING.md recent improvements section with accurate feature descriptions
- Added comprehensive documentation updates to CHANGELOG.md following established format

## [1.0.10] - 2025-07-01

### Changed

- Enhanced commit message grouping by file and category in prompt templates
- Improved emoji removal using comprehensive Unicode emoji regex with property escapes
- Updated DEFAULT configuration to enable all context providers by default
- Centralized all model and context names using constants from `src/constants/models.ts`
- Enhanced verbose logging throughout context providers and core functionality
- Updated prompt templates to encourage logical grouping of changes by categories
- Improved message cleaning to remove `<think></think>` tags from AI responses
- Updated configuration system to use centralized constants instead of hardcoded values
- Enhanced test coverage with proper mocks and comprehensive test utilities
- Updated README.md with comprehensive documentation of new features and improvements
- Updated CONTRIBUTING.md with current project structure and development guidelines

### Added

- Context providers system for enhanced commit context (git status, diff, log)
- Embeddings support with `nomic-embed-text` model for better context understanding
- Comprehensive message cleaning system for emojis and AI artifacts
- Centralized constants system for models and contexts in `src/constants/models.ts`
- Enhanced verbose logging throughout the application with detailed context information
- Improved configuration management with enabled context providers by default
- New test commands for context providers and enhanced model testing
- Comprehensive test suite with proper mocks and utilities
- Enhanced error handling and validation throughout the codebase
- Interactive CLI improvements with better user experience
- Support for multiple model types (default, embeddings, contexts)
- Enhanced documentation with troubleshooting guides and examples

### Fixed

- Emoji removal not working when `useEmojis` was set to false
- Unwanted `<think></think>` tags appearing in generated commit messages
- Context providers being disabled by default in user configuration
- Hardcoded model and context names throughout the codebase
- Unused parameters causing lint warnings (`verbose`, `directory`)
- Test failures due to missing imports and uninitialized mocks
- Configuration inconsistencies between DEFAULT and user configs
- Missing enabled flags for context providers in configuration
- Line ending issues (LF vs CRLF) in generated content
- Commit message grouping and organization issues

### Technical Details

- Added `MODELS` and `CONTEXTS` constants in `src/constants/models.ts` for centralized model management
- Implemented comprehensive Unicode emoji regex with property escapes for better emoji detection
- Enhanced `cleanMessage` method in `src/core/ollama.ts` to remove AI artifacts
- Updated all context methods to use `verbose` parameter for detailed logging
- Added proper directory parameter usage in context providers
- Implemented comprehensive test mocks and utilities in `test/mocks/`
- Updated configuration system to use spread syntax for readonly arrays
- Enhanced prompt templates in `src/constants/prompts.ts` for better commit organization
- Added detailed logging throughout context providers for debugging
- Implemented proper error handling and validation in all core modules
- Updated all test files to use centralized constants and proper mocks
- Enhanced documentation with current project structure and development guidelines

## [1.0.9] - 2025-06-17

### Changed

- src\cli.ts - fixed version issue
- metadata.ts - tweaked getVersion

## [1.0.8] - 2025-06-17

### Added

- Build-time version generation system to eliminate hardcoded version fallbacks
- Version file auto-generation script (scripts/generate-version.ts)
- Enhanced CI/CD workflows with version file generation and verification steps
- Comprehensive version validation in both test and publish workflows
- Local build testing in release script to ensure version consistency

### Changed

- Refactored version detection in metadata.ts to use generated version file with development fallback
- Updated package.json to include prebuild script for automatic version generation
- Enhanced GitHub Actions workflows to generate and verify version files before building
- Improved error handling in version detection with clearer error messages
- Updated npm package files to include generated version files (src/generated/\*_/_)
- Enhanced release script with version file regeneration and build testing

### Fixed

- Version mismatch between development (bun dev:run -V), npx execution, and global installation
- Eliminated hardcoded version fallbacks that could become outdated
- Resolved version detection failures in production environments

### Technical Details

- Added src/generated/version.ts build artifact (excluded from git, included in npm package)
- Updated .gitignore to exclude generated files from version control
- Enhanced build process to ensure version consistency across all deployment methods

## [1.0.7] - 2025-06-17

### Changed

- metadata.ts - simplified getVersion
- test.yml - added tags to ignore since the publish wokdlow runs tests
- cli - made node compatiable

### Removed

- cli.ts - removed #!/usr/bin/env bun
- src\cli\index.ts - remvoed #!/usr/bin/env bun

## [1.0.6] - 2025-06-16

### Changed

- Removed prepublish, publish scripts from package.json as it was causing the workflow to plublish twice

## [1.0.5] - 2025-06-16

### Changed

- Updated pacakge.json to remove extra prepublish steps
- Updated package.json to add pacakge.json to files
- Updated metadata for better error handling
- Updated publsh.yml for single publish

### Removed

- Duplicate and invalid badge in README.md

## [1.0.4] - 2025-06-16

### Added

- New automated release process with GitHub Actions
- Single source of truth for version management using npm_package_version
- Streamlined release workflow with `bun run release` command

### Changed

- Updated version management to use npm_package_version with fallback
- Simplified staging script (no longer handles version updates)
- Updated documentation for new release workflow

### Removed

- Manual version syncing between package.json and metadata.ts
- update-version.ts script (no longer needed)
- Manual version management from staging process
- Conflicting npm lifecycle scripts (preversion/postversion)

### Fixed

- Version conflicts during NPM publishing
- Automated publishing workflow in GitHub Actions

## [1.0.3] - 2025-06-16

## [1.0.2] - 2025-06-16

### Added

- New CLI command structure with modular design
- Configuration management system with multiple sources (env, project-local, user-global)
- New test commands for benchmarking, connection testing, and model testing
- Interactive CLI interface with improved user experience
- Comprehensive test suite with mocks and setup utilities
- Documentation improvements with new sections for configuration, installation, and troubleshooting
- GitHub Actions workflow for automated testing
- Git hooks integration with pre-stage checks
- New utility functions for validation, logging, and interactive prompts
- Support for custom prompts with example templates
- Environment variable configuration support
- Project and user-level configuration files

### Changed

- Refactored core modules for better maintainability
- Improved error handling and validation
- Enhanced logging system with better formatting
- Updated ESLint configuration to TypeScript
- Restructured project layout for better organization
- Improved commit message generation with better prompt handling
- Enhanced Ollama integration with better model management
- Updated package dependencies and build process

### Removed

- Old ESLint configuration in favor of TypeScript-based config
- Simplified core functionality by moving to modular structure

## [1.0.1] - 2025-06-16

### Added

- Initial release of the Ollama Git Commit Message Generator
- CLI tool for generating meaningful commit messages using Ollama AI
- Support for various commit message formats
- Integration with Git hooks
- Configuration options for Ollama model and parameters

## [1.0.0] - 2025-06-16

### Changed

- The stage script now runs formatting, linting, testing, builds type declarations (bun run build:types), and staging as part of the workflow.

### Fixed

- Fixed duplicate execution of staging script: removed redundant `bun run stage` calls from `src/core/git.ts` that were causing tests, formatting, and linting to run multiple times during `--auto-stage` and `--auto-commit` operations.
- Removed legacy `.git-hooks/pre-stage` file that was causing additional duplication in the staging workflow.
- Fixed duplicate git push execution in `--auto-commit` non-interactive mode: removed redundant `git push` call that was causing the push operation to run twice.
- Fixed portability issue: `--auto-stage` and `--auto-commit` now gracefully fall back to simple `git add -A` if the staging script is not available in the target repository.

### Technical Details

- The git service (`src/core/git.ts`) was calling `bun run stage` twice in different scenarios, in addition to the commit command calling it once, resulting in the staging script running 3 times total.
- Now only the commit command calls `bun run stage` once, and the git service only analyzes git changes without running staging scripts.
- Added `GIT_SKIP_HOOKS=1` environment variable to prevent git hooks from triggering during staging operations.
- The non-interactive fallback in `--auto-commit` mode had duplicate `git push` calls, which would cause the push operation to execute twice. This has been fixed to ensure push only happens once.
- Added graceful fallback for staging script: if `bun run stage` fails (e.g., script doesn't exist in target repository), the tool now falls back to simple `git add -A` and continues with the commit process.
