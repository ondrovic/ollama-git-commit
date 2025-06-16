# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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