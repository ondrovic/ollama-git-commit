import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { ConfigManager } from '../../src/core/config';
import { Logger } from '../../src/utils/logger';

describe('ConfigManager Environment Variable Processing', () => {
  let configManager: ConfigManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };

    // Create a fresh ConfigManager instance
    configManager = ConfigManager.getInstance(Logger.getDefault());
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should correctly convert SNAKE_CASE environment variables to camelCase', async () => {
    // Set environment variables in SNAKE_CASE
    process.env.OLLAMA_COMMIT_AUTO_STAGE = 'true';
    process.env.OLLAMA_COMMIT_VERBOSE = 'false';
    process.env.OLLAMA_COMMIT_USE_EMOJIS = 'true';
    process.env.OLLAMA_COMMIT_QUIET = 'false';

    await configManager.initialize();
    const config = await configManager.getConfig();

    // Verify that SNAKE_CASE was converted to camelCase
    expect(config.autoStage).toBe(true);
    expect(config.verbose).toBe(false);
    expect(config.useEmojis).toBe(true);
    expect(config.quiet).toBe(false);
  });

  it('should correctly convert boolean environment variables', async () => {
    // Test various boolean representations
    process.env.OLLAMA_COMMIT_AUTO_STAGE = 'true';
    process.env.OLLAMA_COMMIT_VERBOSE = '1';
    process.env.OLLAMA_COMMIT_USE_EMOJIS = 'false';
    process.env.OLLAMA_COMMIT_QUIET = '0';

    await configManager.initialize();
    const config = await configManager.getConfig();

    expect(config.autoStage).toBe(true);
    expect(config.verbose).toBe(true);
    expect(config.useEmojis).toBe(false);
    expect(config.quiet).toBe(false);
  });

  it('should correctly convert number environment variables', async () => {
    // Test timeout values
    process.env.OLLAMA_COMMIT_TIME_OUTS_CONNECTION = '5000';
    process.env.OLLAMA_COMMIT_TIME_OUTS_GENERATION = '60000';

    await configManager.initialize();
    const config = await configManager.getConfig();

    expect(config.timeouts.connection).toBe(5000);
    expect(config.timeouts.generation).toBe(60000);
  });

  it('should handle string environment variables correctly', async () => {
    process.env.OLLAMA_COMMIT_MODEL = 'llama3';
    process.env.OLLAMA_COMMIT_HOST = 'http://localhost:11434';

    await configManager.initialize();
    const config = await configManager.getConfig();

    expect(config.model).toBe('llama3');
    expect(config.host).toBe('http://localhost:11434');
  });

  it('should handle OLLAMA_HOST environment variable', async () => {
    process.env.OLLAMA_HOST = 'http://custom-host:11434';

    await configManager.initialize();
    const config = await configManager.getConfig();

    expect(config.host).toBe('http://custom-host:11434');
  });

  it('should reload configuration on each getConfig() call', async () => {
    // Initial configuration
    process.env.OLLAMA_COMMIT_VERBOSE = 'false';
    await configManager.initialize();

    let config = await configManager.getConfig();
    expect(config.verbose).toBe(false);

    // Change environment variable
    process.env.OLLAMA_COMMIT_VERBOSE = 'true';

    // Get config again - should pick up the change
    config = await configManager.getConfig();
    expect(config.verbose).toBe(true);
  });

  it('should ignore invalid environment variable values gracefully', async () => {
    // Set invalid values
    process.env.OLLAMA_COMMIT_TIME_OUTS_CONNECTION = 'invalid';
    process.env.OLLAMA_COMMIT_VERBOSE = 'maybe';

    await configManager.initialize();
    const config = await configManager.getConfig();

    // Should fall back to default values
    expect(config.timeouts.connection).toBe(10000); // default value
    expect(config.verbose).toBe(false); // default value
  });
});
