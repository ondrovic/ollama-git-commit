#!/usr/bin/env bun

import { spawn } from 'child_process';

console.log('🤖 Generating commit message and auto-committing...');

// Run the tool with auto-commit enabled
const child = spawn('bun', ['dev:run', 'commit', '-d', '.', '--auto-commit'], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('✅ Auto-commit completed successfully!');
  } else {
    console.error('❌ Auto-commit failed with code:', code);
    process.exit(code || 1);
  }
}); 