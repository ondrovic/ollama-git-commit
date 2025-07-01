# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
