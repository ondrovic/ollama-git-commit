#!/usr/bin/env bun

import { execSync, spawn } from 'child_process';

console.log('🚀 Running staging and auto-commit...');

try {
  // Step 1: Run the staging script (format, lint, test, stage)
  console.log('📝 Running staging script...');
  execSync('bun run stage', { stdio: 'inherit' });

  // Step 2: Use the tool to generate and auto-commit
  console.log('🤖 Generating commit message and auto-committing...');
  
  // Run the tool with auto-commit enabled
  const child = spawn('bun', ['run', 'src/cli.ts', 'commit', '-d', '.', '--auto-commit'], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    if (code === 0) {
      console.log('✅ Staging and auto-commit completed successfully!');
    } else {
      console.error('❌ Auto-commit failed with code:', code);
      process.exit(code || 1);
    }
  });

} catch (error: unknown) {
  if (error instanceof Error) {
    console.error('❌ Staging and auto-commit failed:', error.message);
  } else {
    console.error('❌ Staging and auto-commit failed:', error);
  }
  process.exit(1);
} 