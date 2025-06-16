#!/usr/bin/env bun

import { execSync } from 'child_process';

console.log('🚀 Running staging checks...');

try {
  console.log('🔍 Running tests...');
  execSync('bun test', { stdio: 'inherit' });

  console.log('💅 Running code formatting...');
  execSync('bun format', { stdio: 'inherit' });
  
  console.log('🔍 Running linting with auto-fix...');
  execSync('bun lint:fix', { stdio: 'inherit' });
  
  console.log('📝 Staging all files...');
  execSync('git add -A', { stdio: 'inherit' });

  console.log('✅ Staging checks completed!');
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error('❌ Staging checks failed:', error.message);
  } else {
    console.error('❌ Staging checks failed:', error);
  }
  process.exit(1);
} 