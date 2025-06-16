import { readFileSync } from 'fs';
import { join } from 'path';
import { CONFIGURATIONS } from './configurations';
import { MODELS } from './models';

function getVersion(): string {
  // 1. Try npm_package_version (available when installed/run via npm)
  if (process.env.npm_package_version) {
    return process.env.npm_package_version;
  }

  // 2. Fallback: read from local package.json (development)
  try {
    const packagePath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return `${packageJson.version}-dev`; // Add -dev to indicate development
  } catch {
    // If package.json can't be read, use fallback
    return '1.0.0-unknown';
  }
}

export const VERSION = getVersion();
export const APP_NAME = 'ollama-git-commit';
export const DEFAULT_MODEL = MODELS.DEFAULT;
export const DEFAULT_HOST = CONFIGURATIONS.DEFAULT.host;
export const DEFAULT_TIMEOUTS = CONFIGURATIONS.DEFAULT.timeouts;
