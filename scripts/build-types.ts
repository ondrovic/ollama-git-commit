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
      Logger.version('Building type declarations...');
    }
    
    execSync('tsc --emitDeclarationOnly --outDir dist', {
      stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
      env
    });
    
    if (!isQuiet) {
      Logger.success('Type declarations built successfully!');
    }
  } catch (error) {
    if (error instanceof Error) {
      Logger.error('Failed to build type declarations:', error.message);
    } else {
      Logger.error('Failed to build type declarations:', String(error));
    }
    process.exit(1);
  }
}

main().catch(error => {
  Logger.error('Script failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});