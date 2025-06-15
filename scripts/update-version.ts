#!/usr/bin/env bun

import * as fs from 'fs/promises';
import * as path from 'path';

async function updateVersion() {
  try {
    // Read package.json
    const packageJson = JSON.parse(
      await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8'),
    );
    const version = packageJson.version;

    // Read metadata.ts
    const metadataPath = path.join(process.cwd(), 'src', 'constants', 'metadata.ts');
    let metadataContent = await fs.readFile(metadataPath, 'utf-8');

    // Update version in metadata.ts
    metadataContent = metadataContent.replace(
      /export const VERSION = ['"]([^'"]+)['"]/,
      `export const VERSION = '${version}'`,
    );

    // Write back to metadata.ts
    await fs.writeFile(metadataPath, metadataContent);
    console.log(`Updated version to ${version} in metadata.ts`);
  } catch (error) {
    console.error('Failed to update version:', error);
    process.exit(1);
  }
}

updateVersion();
