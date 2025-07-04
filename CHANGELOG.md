# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- New `stage-and-commit` script that is a shortcut for running the tool with `--auto-commit` (runs the full staging script, generates a commit message, and commits the currently staged files).
- Enhanced `--auto-stage` flag now runs the full staging script, generates an AI commit message, and shows an interactive prompt, but requires manual commit (user must copy and run the git commit command).
- Enhanced `--auto-commit` flag now runs the full staging script, generates an AI commit message, and if the user approves with 'y', automatically commits with the AI-generated message. Staging is only done once, before message generation.

### Fixed

- Improved version change detection logic for `package-lock.json`: now only reports a version change if the version actually changes and the new version is valid (not '..' or empty). Prevents false positives in commit messages.
- Auto-commit now works with 1Password SSH agent and other SSH agents: the tool runs `git commit` as a foreground process with inherited environment, allowing interactive authentication to work as expected.
- Auto-commit now works with 1Password SSH agent and other SSH agents: the tool runs `git commit` as a foreground process with inherited environment, allowing interactive authentication to work as expected.

### Technical Details

- The version extraction logic for `package-lock.json` and similar files now checks that both old and new versions are present, not equal, and the new version is not '..' or empty before reporting a change. This avoids reporting spurious or truncated version changes in commit messages.
- The auto-commit implementation now uses `spawn` with `stdio: 'inherit'` and inherits the environment, ensuring compatibility with SSH agents like 1Password CLI on all platforms.

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
