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

  try {
    if (!isQuiet) {
      console.log('🔨 Building project...');
    }
    
    // Run bun build
    execSync('bun build src/cli.ts --outdir dist --target node --format esm', {
      stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit'
    });
    
    // Run build:types (which handles its own quiet mode)
    execSync('bun run build:types', {
      stdio: 'inherit' // build:types script handles quiet mode internally
    });
    
    if (!isQuiet) {
      console.log('✅ Build completed successfully!');
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Build failed:', error.message);
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 