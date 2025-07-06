#!/usr/bin/env bun

import { mkdir, writeFile } from 'fs/promises';
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

  try {
    // Read package.json to get version
    const packageJson = JSON.parse(await Bun.file('package.json').text());
    const version = packageJson.version;

    // Create generated directory
    const generatedDir = join(process.cwd(), 'src', 'generated');
    
    if (!isQuiet) {
      Logger.version(`Creating directory: ${generatedDir}`);
    }
    
    await mkdir(generatedDir, { recursive: true });

    // Generate version file content
    const versionContent = `// Auto-generated file - do not edit manually
export const VERSION = '${version}';
export const BUILD_DATE = '${new Date().toISOString()}';
`;

    // Write version file
    const versionFilePath = join(generatedDir, 'version.ts');
    
    if (!isQuiet) {
      Logger.version(`Writing version file: ${versionFilePath}`);
    }
    
    await writeFile(versionFilePath, versionContent);

    if (!isQuiet) {
      Logger.success(`Generated version file: ${versionFilePath} (v${version})`);
    }
  } catch (error) {
    if (error instanceof Error) {
      Logger.error('Failed to generate version file:', error.message);
    } else {
      Logger.error('Failed to generate version file:', String(error));
    }
    process.exit(1);
  }
}

main().catch(error => {
  Logger.error('Script failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});