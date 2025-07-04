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

  if (isOllamaGitCommitRepo) {
    // Full precommit workflow for ollama-git-commit repository
    if (!isQuiet) {
      console.log('🏠 Running full precommit checks for ollama-git-commit...');
    }
    
    runScriptIfExists('format', '💅 Running code formatting...');
    runScriptIfExists('lint', '🔍 Running linting...');
    runScriptIfExists('test', '🧪 Running tests...');
    runScriptIfExists('build:types', '🔨 Building type declarations...');
  } else {
    // Simplified precommit for other repositories
    if (!isQuiet) {
      console.log('📦 Running simplified precommit checks for external repository...');
    }
    
    // Only run basic scripts that are likely to exist in most projects
    runScriptIfExists('lint', '🔍 Running linting...');
    runScriptIfExists('test', '🧪 Running tests...');
    runScriptIfExists('format', '💅 Running code formatting...');
  }

  if (!isQuiet) {
    console.log('✅ Precommit checks completed!');
  }
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 