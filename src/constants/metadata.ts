// src/constants/metadata.ts
import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { CONFIGURATIONS } from './configurations';
import { MODELS } from './models';

function getVersion(): string {
  // 1. Try npm_package_version (available when run via npm)
  if (process.env.npm_package_version) {
    return process.env.npm_package_version;
  }

  // 2. Try reading from package.json (development or if included in build)
  try {
    // Try relative to current working directory first
    const packagePath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return `${packageJson.version}-dev`; // Add -dev to indicate development
  } catch {
    // Ignore and try next option
  }

  // 3. Try reading from package.json relative to the script location
  try {
    // This works when package.json is included in the published package
    const packagePath = join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return packageJson.version;
  } catch {
    // Ignore and try next option
  }

  // 4. Try reading from a bundled version file (if you create one)
  try {
    const versionPath = join(__dirname, 'version.txt');
    return readFileSync(versionPath, 'utf-8').trim();
  } catch {
    // Final fallback
  }

  // 5. Fallback version
  return '1.0.4'; // Current version as fallback
}

export const VERSION = getVersion();
export const APP_NAME = 'ollama-git-commit';
export const DEFAULT_MODEL = MODELS.DEFAULT;
export const DEFAULT_HOST = CONFIGURATIONS.DEFAULT.host;
export const DEFAULT_TIMEOUTS = CONFIGURATIONS.DEFAULT.timeouts;
