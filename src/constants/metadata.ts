import { readFileSync } from 'fs-extra';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CONFIGURATIONS } from './configurations';
import { MODELS } from './models';

function getVersion(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const isLocalDev = process.versions.bun || process.env.NODE_ENV === 'development';

  try {
    // Try to read the generated version file first
    const possibleVersionPaths = [
      join(__dirname, '../generated/version.ts'), // Development
      join(__dirname, '../generated/version.js'), // Production build
    ];

    for (const versionPath of possibleVersionPaths) {
      try {
        const versionContent = readFileSync(versionPath, 'utf-8');
        // Extract version using regex since it's a simple export
        const versionMatch = versionContent.match(/export const VERSION = '([^']+)'/);
        if (versionMatch && versionMatch[1]) {
          const generatedVersion = versionMatch[1];
          return isLocalDev ? `${generatedVersion}-dev` : generatedVersion;
        }
      } catch {
        // Try next path
        continue;
      }
    }

    // Fallback: read directly from package.json (development mode)
    const packageJsonPath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return `${packageJson.version}-dev`;
  } catch (error) {
    throw new Error(
      `Unable to determine version: ${error instanceof Error ? error.message : 'Unknown error'}. Please run "bun run prebuild" to generate version file.`,
    );
  }
}

export const VERSION = getVersion();
export const APP_NAME = 'ollama-git-commit';
export const DEFAULT_MODEL = MODELS.DEFAULT;
export const DEFAULT_HOST = CONFIGURATIONS.DEFAULT.host;
export const DEFAULT_TIMEOUTS = CONFIGURATIONS.DEFAULT.timeouts;
