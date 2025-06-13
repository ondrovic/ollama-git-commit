#!/usr/bin/env bun

import * as fs from 'fs/promises';
import * as path from 'path';

async function updateVersion() {
  try {
    // Read package.json
    const packageJson = JSON.parse(
      await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8')
    );
    const version = packageJson.version;

    // Read cli.ts
    const cliPath = path.join(process.cwd(), 'src', 'cli.ts');
    let cliContent = await fs.readFile(cliPath, 'utf-8');

    // Update version in cli.ts
    cliContent = cliContent.replace(
      /\.version\(['"]([^'"]+)['"]\)/,
      `.version('${version}')`
    );

    // Write back to cli.ts
    await fs.writeFile(cliPath, cliContent);
    console.log(`Updated version to ${version} in cli.ts`);
  } catch (error) {
    console.error('Failed to update version:', error);
    process.exit(1);
  }
}

updateVersion(); 