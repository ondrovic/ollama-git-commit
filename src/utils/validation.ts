import { execSync } from 'child_process';
import { Logger } from './logger';

export function validateNodeVersion(): void {
  const requiredVersion = '18.12.0';
  const currentVersion = process.version.slice(1); // Remove 'v' prefix

  if (!isVersionCompatible(currentVersion, requiredVersion)) {
    Logger.error(`Node.js version ${requiredVersion} or higher is required. Current version: ${currentVersion}`);
    Logger.error('Please upgrade Node.js: https://nodejs.org/');
    process.exit(1);
  }

  Logger.debug(`Node.js version: ${currentVersion} ✓`);
}

export function validateGitRepository(directory: string = process.cwd()): void {
   console.log(directory)
  try {
    execSync('git rev-parse --git-dir', { stdio: 'pipe', cwd: directory });
    Logger.debug('Git repository detected ✓');
  } catch {
    Logger.error('Not a git repository');
    Logger.error('Please run this command from within a git repository');
    process.exit(1);
  }
}

export function validateGitConfig(directory: string = process.cwd()): { name?: string | undefined; email?: string | undefined; warnings: string[] } {
  const warnings: string[] = [];
  let name: string | undefined;
  let email: string | undefined;

  try {
    name = execSync('git config user.name', { encoding: 'utf8', cwd: directory }).trim();
  } catch {
    warnings.push('Git user.name is not configured. Run: git config --global user.name "Your Name"');
  }

  try {
    email = execSync('git config user.email', { encoding: 'utf8', cwd: directory }).trim();
  } catch {
    warnings.push('Git user.email is not configured. Run: git config --global user.email "your.email@example.com"');
  }

  return { name, email, warnings };
}

export function validateOllamaHost(host: string): boolean {
  try {
    const url = new URL(host);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export function validateModelName(model: string): boolean {
  // Basic validation for Ollama model names
  const modelPattern = /^[a-zA-Z0-9._-]+(?::[a-zA-Z0-9._-]+)?$/;
  return modelPattern.test(model);
}

export function validatePromptFile(filePath: string): { valid: boolean; error?: string } {
  if (!filePath || filePath.trim().length === 0) {
    return { valid: false, error: 'Prompt file path cannot be empty' };
  }

  // Check for potentially dangerous paths
  if (filePath.includes('..') || filePath.includes('~')) {
    return { valid: false, error: 'Prompt file path contains potentially unsafe characters' };
  }

  return { valid: true };
}

export function isVersionCompatible(current: string, required: string): boolean {
  const currentParts = current.split('.').map(Number);
  const requiredParts = required.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const requiredPart = requiredParts[i] || 0;

    if (currentPart > requiredPart) {
      return true;
    }
    if (currentPart < requiredPart) {
      return false;
    }
  }

  return true; // Equal versions
}

export function validateEnvironment(directory: string = process.cwd()): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check Node.js version
  try {
    validateNodeVersion();
  } catch (error: any) {
    errors.push(error.message);
  }

  // Check Git availability
  try {
    execSync('git --version', { stdio: 'pipe', cwd: directory });
  } catch {
    errors.push('Git is not installed or not available in PATH');
  }

  // Check if in git repository
  try {
    validateGitRepository(directory);
  } catch (error: any) {
    errors.push(error.message);
  }

  // Check Git configuration
  const gitConfig = validateGitConfig(directory);
  warnings.push(...gitConfig.warnings);

  // Check for curl/fetch availability (for Ollama API calls)
  try {
    // Test if fetch is available (Node 18+)
    if (typeof fetch === 'undefined') {
      warnings.push('Native fetch not available - using polyfill');
    }
  } catch {
    warnings.push('HTTP client not available');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function sanitizeInput(input: string, maxLength: number = 1000): string {
  // Remove null bytes and control characters except newlines and tabs
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }

  return sanitized;
}

export function isValidPath(path: string): boolean {
  // Basic path validation
  if (!path || path.trim().length === 0) {
    return false;
  }

  // Check for null bytes
  if (path.includes('\0')) {
    return false;
  }

  // Check for excessively long paths
  if (path.length > 4096) {
    return false;
  }

  return true;
}