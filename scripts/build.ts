#!/usr/bin/env bun

import { execSync } from 'child_process';
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

  try {
    if (!isQuiet) {
      Logger.version('Building project...');
    }
    
    // Run bun build
    execSync('bun build src/cli.ts --outdir dist --target node --format esm', {
      stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
      env
    });
    
    // Run build:types (which handles its own quiet mode)
    execSync('bun run build:types', {
      stdio: 'inherit', // build:types script handles quiet mode internally
      env
    });
    
    if (!isQuiet) {
      Logger.success('Build completed successfully!');
    }
  } catch (error) {
    if (error instanceof Error) {
      Logger.error('Build failed:', error.message);
    } else {
      Logger.error('Build failed:', String(error));
    }
    process.exit(1);
  }
}

main().catch(error => {
  Logger.error('Script failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});