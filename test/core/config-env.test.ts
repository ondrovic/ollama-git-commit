import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { ConfigManager } from '../../src/core/config';
import { Logger } from '../../src/utils/logger';

// Mock filesystem that doesn't have any config files
const mockFs = {
  readFile: async () => {
    const error = new Error('ENOENT: no such file or directory');
    (error as any).code = 'ENOENT';
    throw error;
  },
  pathExists: async () => false,
  ensureDir: async () => {},
  writeJson: async () => {},
  readJson: async () => {
    const error = new Error('ENOENT: no such file or directory');
    (error as any).code = 'ENOENT';
    throw error;
  },
  remove: async () => {},
};

describe('ConfigManager Environment Variable Processing', () => {
  let configManager: ConfigManager;
  let env: Record<string, string | undefined>;

  beforeEach(() => {
    env = {};
    ConfigManager.resetInstance();
    configManager = ConfigManager.getInstance(Logger.getDefault(), mockFs as any, env);
  });

  afterEach(() => {
    Object.keys(env).forEach(key => delete env[key]);
    ConfigManager.resetInstance();
  });

  it('should correctly convert SNAKE_CASE environment variables to camelCase', async () => {
    env.OLLAMA_COMMIT_AUTO_STAGE = 'true';
    env.OLLAMA_COMMIT_VERBOSE = 'false';
    env.OLLAMA_COMMIT_USE_EMOJIS = 'true';
    env.OLLAMA_COMMIT_QUIET = 'false';

    await configManager.initialize();
    const config = await configManager.getConfig();
    expect(config.autoStage).toBe(true);
    expect(config.verbose).toBe(false);
    expect(config.useEmojis).toBe(true);
    expect(config.quiet).toBe(false);
  });

  it('should correctly convert boolean environment variables', async () => {
    env.OLLAMA_COMMIT_AUTO_STAGE = 'true';
    env.OLLAMA_COMMIT_VERBOSE = '1';
    env.OLLAMA_COMMIT_USE_EMOJIS = 'false';
    env.OLLAMA_COMMIT_QUIET = '0';

    await configManager.initialize();
    const config = await configManager.getConfig();
    expect(config.autoStage).toBe(true);
    expect(config.verbose).toBe(true);
    expect(config.useEmojis).toBe(false);
    expect(config.quiet).toBe(false);
  });

  it('should correctly convert number environment variables', async () => {
    env.OLLAMA_COMMIT_TIME_OUTS_CONNECTION = '5000';
    env.OLLAMA_COMMIT_TIME_OUTS_GENERATION = '60000';

    await configManager.initialize();
    const config = await configManager.getConfig();
    expect(config.timeouts.connection).toBe(5000);
    expect(config.timeouts.generation).toBe(60000);
  });

  it('should handle string environment variables correctly', async () => {
    env.OLLAMA_COMMIT_MODEL = 'llama3';
    env.OLLAMA_COMMIT_HOST = 'http://localhost:11434';

    await configManager.initialize();
    const config = await configManager.getConfig();
    expect(config.model).toBe('llama3');
    expect(config.host).toBe('http://localhost:11434');
  });

  it('should handle OLLAMA_HOST environment variable', async () => {
    env.OLLAMA_HOST = 'http://custom-host:11434';

    await configManager.initialize();
    const config = await configManager.getConfig();
    expect(config.host).toBe('http://custom-host:11434');
  });

  it('should reload configuration on each getConfig() call', async () => {
    env.OLLAMA_COMMIT_VERBOSE = 'false';
    await configManager.initialize();
    let config = await configManager.getConfig();
    expect(config.verbose).toBe(false);
    env.OLLAMA_COMMIT_VERBOSE = 'true';
    config = await configManager.getConfig();
    expect(config.verbose).toBe(true);
  });

  it('should ignore invalid environment variable values gracefully', async () => {
    // Use a fresh env and fresh mockFs for this test
    const freshEnv: Record<string, string | undefined> = {};
    const freshMockFs = {
      readFile: async () => {
        const error = new Error('ENOENT: no such file or directory');
        (error as any).code = 'ENOENT';
        throw error;
      },
      pathExists: async () => false,
      ensureDir: async () => {},
      writeJson: async () => {},
      readJson: async () => {
        const error = new Error('ENOENT: no such file or directory');
        (error as any).code = 'ENOENT';
        throw error;
      },
      remove: async () => {},
    };
    freshEnv.OLLAMA_COMMIT_TIME_OUTS_CONNECTION = 'invalid';
    freshEnv.OLLAMA_COMMIT_VERBOSE = 'maybe';
    ConfigManager.resetInstance();
    const freshConfigManager = ConfigManager.getInstance(
      Logger.getDefault(),
      freshMockFs as any,
      freshEnv,
    );

    await freshConfigManager.initialize();
    const config = await freshConfigManager.getConfig();
    expect(config.timeouts.connection).toBe(10000); // default value
    expect(config.verbose).toBe(false); // default value
  });
});
