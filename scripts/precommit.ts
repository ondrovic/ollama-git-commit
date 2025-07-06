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
    ...(isQuiet && { QUIET: 'true' }) 
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

  if (isOllamaGitCommitRepo) {
    // Full precommit workflow for ollama-git-commit repository
    if (!isQuiet) {
      Logger.house('Running full precommit checks for ollama-git-commit...');
    }
    
    // runScriptIfExists('format', 'Running code formatting...', Logger.floppy);
    runScriptIfExists('lint', 'Running linting...', Logger.magnifier);
    runScriptIfExists('test', 'Running tests...', Logger.test);
    runScriptIfExists('build:types', 'Building type declarations...', Logger.hammer);
  } else {
    // Simplified precommit for other repositories
    if (!isQuiet) {
      Logger.package('Running simplified precommit checks for external repository...');
    }
    
    // Only run basic scripts that are likely to exist in most projects
    runScriptIfExists('lint', 'Running linting...', Logger.magnifier);
    runScriptIfExists('test', 'Running tests...', Logger.test);
    // runScriptIfExists('format', 'Running code formatting...', Logger.floppy);
  }

  if (!isQuiet) {
    Logger.success('Precommit checks completed!');
  }
}

main().catch(error => {
  Logger.error('Script failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});