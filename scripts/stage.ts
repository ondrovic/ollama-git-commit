#!/usr/bin/env bun

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ConfigManager } from '../src/core/config';

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
    if (!isQuiet) console.log('🔍 Running precommit checks...');
    try {
      execSync('bun run precommit', { stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit' });
    } catch (error) {
      if (!isQuiet) console.error('❌ Precommit failed:', error);
      process.exit(1);
    }
  }

  if (!isQuiet) {
    console.log('🚀 Running staging checks...');
  }

  // Helper to run a script if it exists
  function runScriptIfExists(name: string, label: string) {
    if (scripts[name]) {
      if (!isQuiet) console.log(label);
      try {
        execSync(`bun run ${name}`, { stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit' });
      } catch (error) {
        if (!isQuiet) console.error(`❌ ${name} failed:`, error);
        process.exit(1);
      }
    } else if (!isQuiet) {
      console.log(`⏭️  Skipping ${name} (script not found in package.json)`);
    }
  }

  try {
    if (isOllamaGitCommitRepo) {
      // Full staging workflow for ollama-git-commit repository
      if (!isQuiet) {
        console.log('🏠 Running full staging workflow for ollama-git-commit...');
      }
      
      // Run tests if available
      runScriptIfExists('test', '🔍 Running tests...');

      // Run formatting if available
      runScriptIfExists('format', '💅 Running code formatting...');

      // Run linting with auto-fix if available
      runScriptIfExists('lint:fix', '🔍 Running linting with auto-fix...');
      // Fallback to regular lint if lint:fix doesn't exist
      if (!scripts['lint:fix'] && scripts['lint']) {
        runScriptIfExists('lint', '🔍 Running linting...');
      }

      // Run type building if available
      runScriptIfExists('build:types', '🔨 Building type declarations...');
    } else {
      // Simplified staging for other repositories
      if (!isQuiet) {
        console.log('📦 Running simplified staging for external repository...');
      }
      
      // Only run basic scripts that are likely to exist in most projects
      runScriptIfExists('test', '🔍 Running tests...');
      runScriptIfExists('lint', '🔍 Running linting...');
      runScriptIfExists('format', '💅 Running code formatting...');
    }

    if (!isQuiet) {
      console.log('📝 Staging all files...');
    }
    execSync('git add -A', {
      stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
      env: { ...process.env, GIT_SKIP_HOOKS: '1' },
    });

    if (!isQuiet) {
      console.log('✅ Staging checks completed!');
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('❌ Staging checks failed:', error.message);
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
