#!/usr/bin/env bun
import { readFileSync, writeFileSync, ensureDirSync } from 'fs-extra';
import { join } from 'path';

try {
  // Read version from package.json
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  const version = packageJson.version;

  if (!version) {
    throw new Error('No version found in package.json');
  }

  // Ensure the generated directory exists
  const generatedDir = join('src', 'generated');
  console.log(`📁 Creating directory: ${generatedDir}`);
  ensureDirSync(generatedDir);

  // Generate version file
  const versionFileContent = `// Auto-generated file - do not edit manually
// This file is generated during the build process from package.json
export const VERSION = '${version}';
`;

  // Write to src/generated directory
  const outputPath = join('src', 'generated', 'version.ts');
  console.log(`📝 Writing version file: ${outputPath}`);
  writeFileSync(outputPath, versionFileContent);

  console.log(`✅ Generated version file: ${outputPath} (v${version})`);
} catch (error) {
  console.error('❌ Failed to generate version file:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
