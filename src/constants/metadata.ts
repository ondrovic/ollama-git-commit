import { readFileSync } from 'fs-extra';
import { join } from 'path';
import { CONFIGURATIONS } from './configurations';
import { MODELS } from './models';

function getVersion(): string {
  try {
    // Import the package.json directly if it's available
    const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));
    const isLocalDev = process.versions.bun || process.env.NODE_ENV === 'development';
    return isLocalDev ? `${packageJson.version}-dev` : packageJson.version;
  } catch {
    return '1.0.6'; // Current version as fallback
  }
}

export const VERSION = getVersion();
export const APP_NAME = 'ollama-git-commit';
export const DEFAULT_MODEL = MODELS.DEFAULT;
export const DEFAULT_HOST = CONFIGURATIONS.DEFAULT.host;
export const DEFAULT_TIMEOUTS = CONFIGURATIONS.DEFAULT.timeouts;
