#!/usr/bin/env bun

import * as fs from 'fs/promises';
import * as path from 'path';

async function updateVersion() {
  try {
    // Read package.json
    const packageJson = JSON.parse(
      await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8'),
    );
    const newVersion = packageJson.version;

    // Read metadata.ts
    const metadataPath = path.join(process.cwd(), 'src', 'constants', 'metadata.ts');
    let metadataContent = await fs.readFile(metadataPath, 'utf-8');

    // Extract current version from metadata.ts
    const versionMatch = metadataContent.match(/export const VERSION = ['"]([^'"]+)['"]/);
    const currentVersion = versionMatch ? versionMatch[1] : null;

    // Only update if versions are different
    if (currentVersion !== newVersion) {
      // Update version in metadata.ts
      metadataContent = metadataContent.replace(
        /export const VERSION = ['"]([^'"]+)['"]/,
        `export const VERSION = '${newVersion}'`,
      );

      // Write back to metadata.ts
      await fs.writeFile(metadataPath, metadataContent);
      console.log(`Updated version from ${currentVersion} to ${newVersion} in metadata.ts`);
    } else {
      console.log(`Version ${newVersion} is already up to date in metadata.ts`);
    }
  } catch (error) {
    console.error('Failed to update version:', error);
    process.exit(1);
  }
}

updateVersion();
