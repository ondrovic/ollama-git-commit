#!/usr/bin/env bun

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ConfigManager } from '../src/core/config';
import { Logger } from '../src/utils/logger';

async function main() {
  let isQuiet = process.env.QUIET === 'true';
  
  if (!isQuiet) {
    try {
      const configManager = ConfigManager.getInstance();
      const config = await configManager.getConfig();
      isQuiet = config.quiet;
    } catch {
      // Fallback to false if config can't be read
      isQuiet = false;
    }
  }

  Logger.setVerbose(!isQuiet);

  // Create environment with QUIET propagation
  const env = { 
    ...process.env, 
    ...(isQuiet && { QUIET: 'true' }),
    GIT_SKIP_HOOKS: '1' // Prevent git hooks during staging
  };

  // Check if we're in the ollama-git-commit repository
  let isOllamaGitCommitRepo = false;
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    isOllamaGitCommitRepo = pkg.name === '@condrovic/ollama-git-commit';
  } catch {
    isOllamaGitCommitRepo = false;
  }

  // Read package.json to check for scripts
  let scripts: Record<string, string> = {};
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    scripts = pkg.scripts || {};
  } catch {
    scripts = {};
  }

  // Check for precommit script in package.json
  let hasPrecommitScript = false;
  try {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
    hasPrecommitScript = !!(pkg.scripts && pkg.scripts.precommit);
  } catch {
    hasPrecommitScript = false;
  }

  if (hasPrecommitScript) {
    if (!isQuiet) Logger.magnifier('Running precommit checks...');
    try {
      execSync('bun run precommit', { 
        stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
        env
      });
    } catch (error) {
      if (!isQuiet) Logger.error('Precommit failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  if (!isQuiet) {
    Logger.rocket('Running staging checks...');
  }

  // Helper to run a script if it exists
  function runScriptIfExists(name: string, label: string, loggerMethod: (msg: string) => void) {
    if (scripts[name]) {
      if (!isQuiet) loggerMethod(label);
      try {
        execSync(`bun run ${name}`, { 
          stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
          env
        });
      } catch (error) {
        if (!isQuiet) Logger.error(`${name} failed:`, error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    } else if (!isQuiet) {
      Logger.info(`Skipping ${name} (script not found in package.json)`);
    }
  }

  try {
    if (isOllamaGitCommitRepo) {
      // Full staging workflow for ollama-git-commit repository
      if (!isQuiet) {
        Logger.house('Running full staging workflow for ollama-git-commit...');
      }
      
      // Run tests if available
      runScriptIfExists('test', 'Running tests...', Logger.test);

      // Run formatting if available
      // runScriptIfExists('format', 'Running code formatting...', Logger.floppy);

      // Run linting with auto-fix if available
      runScriptIfExists('lint:fix', 'Running linting with auto-fix...', Logger.magnifier);
      // Fallback to regular lint if lint:fix doesn't exist
      if (!scripts['lint:fix'] && scripts['lint']) {
        runScriptIfExists('lint', 'Running linting...', Logger.magnifier);
      }

      // Run type building if available
      runScriptIfExists('build:types', 'Building type declarations...', Logger.hammer);
    } else {
      // Simplified staging for other repositories
      if (!isQuiet) {
        Logger.package('Running simplified staging for external repository...');
      }
      
      // Only run basic scripts that are likely to exist in most projects
      runScriptIfExists('test', 'Running tests...', Logger.test);
      // runScriptIfExists('format', 'Running code formatting...', Logger.floppy);
      runScriptIfExists('lint', 'Running linting...', Logger.magnifier);
    }

    if (!isQuiet) {
      Logger.memo('Staging all files...');
    }
    execSync('git add -A', {
      stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
      env,
    });

    if (!isQuiet) {
      Logger.success('Staging checks completed!');
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      Logger.error('Staging checks failed:', error.message);
    }
    process.exit(1);
  }
}

main().catch(error => {
  Logger.error('Script failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});