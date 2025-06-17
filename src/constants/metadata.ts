#!/usr/bin/env bun
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

try {
  // Get version from package.json
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  const version = packageJson.version;

  if (!version) {
    throw new Error('No version found in package.json');
  }

  console.log(`🚀 Building with version: ${version}`);

  // Build with version injection using Bun's define feature
  const result = await Bun.build({
    entrypoints: ['./src/cli.ts'],
    outdir: './dist',
    target: 'node',
    format: 'esm',
    define: {
      __VERSION__: JSON.stringify(version),
    },
  });

  if (!result.success) {
    console.error('❌ Build failed:');
    for (const message of result.logs) {
      console.error(message);
    }
    process.exit(1);
  }
  if (result.outputs[0]) {
    console.log('✅ Build completed successfully');
    console.log(`📦 Generated: dist/cli.js (${Math.round(result.outputs[0].size / 1024)}KB)`);
  } else {
    console.log('✅ Build completed successfully');
    console.log('📦 Generated: dist/cli.js (0KB)');
  }

  // Generate TypeScript declarations
  console.log('🔧 Generating TypeScript declarations...');
  execSync('tsc --emitDeclarationOnly --outDir dist', { stdio: 'inherit' });

  console.log('🎉 Build process completed');
} catch (error: unknown) {
  console.error('❌ Build failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}
