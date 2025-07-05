#!/usr/bin/env bun

import { execSync } from 'child_process';
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

  // Create environment with QUIET propagation
  const env = { 
    ...process.env, 
    ...(isQuiet && { QUIET: 'true' }) 
  };

  try {
    if (!isQuiet) {
      console.log('🔨 Building type declarations...');
    }
    
    execSync('tsc --emitDeclarationOnly --outDir dist', {
      stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
      env
    });
    
    if (!isQuiet) {
      console.log('✅ Type declarations built successfully!');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Failed to build type declarations:', error.message);
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});