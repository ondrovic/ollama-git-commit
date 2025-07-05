#!/usr/bin/env bun

import { mkdir, writeFile } from 'fs/promises';
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

  try {
    // Read package.json to get version
    const packageJson = JSON.parse(await Bun.file('package.json').text());
    const version = packageJson.version;

    // Create generated directory
    const generatedDir = join(process.cwd(), 'src', 'generated');
    
    if (!isQuiet) {
      console.log(`📁 Creating directory: ${generatedDir}`);
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
      console.log(`📝 Writing version file: ${versionFilePath}`);
    }
    
    await writeFile(versionFilePath, versionContent);

    if (!isQuiet) {
      console.log(`✅ Generated version file: ${versionFilePath} (v${version})`);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Failed to generate version file:', error.message);
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});