import { describe, expect, test, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { ConfigManager } from '../../src/core/config';
import { Logger } from '../../src/utils/logger';
import { mockFs } from '../setup';
import { mockConfig } from '../setup';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let logger: Logger;
  let originalLoadConfigFile: any;

  beforeAll(() => {
    logger = new Logger();
    logger.setVerbose(true);
  });

  beforeEach(() => {
    // Mock loadConfigFile to always return an empty object
    originalLoadConfigFile = ConfigManager.prototype['loadConfigFile'];
    ConfigManager.prototype['loadConfigFile'] = async () => ({});
  });

  afterEach(() => {
    // Restore the original loadConfigFile
    ConfigManager.prototype['loadConfigFile'] = originalLoadConfigFile;
    // Reset the singleton instance
    // @ts-expect-error: allow test-only access
    ConfigManager.instance = undefined;
    // Clean up environment variables
    delete process.env.OLLAMA_COMMIT_AUTO_COMMIT;
    delete process.env.OLLAMA_COMMIT_PROMPT_TEMPLATE;
  });

  test('should handle OLLAMA_COMMIT_AUTO_COMMIT environment variable', async () => {
    // Reset the singleton instance and environment variable
    // @ts-expect-error: allow test-only access
    ConfigManager.instance = undefined;
    delete process.env.OLLAMA_COMMIT_AUTO_COMMIT;

    // Set the environment variable
    process.env.OLLAMA_COMMIT_AUTO_COMMIT = 'true';

    // Initialize the ConfigManager
    configManager = ConfigManager.getInstance(logger);
    await configManager.initialize();

    // Get the config and verify autoCommit is true
    const config = await configManager.getConfig();
    expect(config.autoCommit).toBe(true);

    // Reset and test false
    // @ts-expect-error: allow test-only access
    ConfigManager.instance = undefined;
    process.env.OLLAMA_COMMIT_AUTO_COMMIT = 'false';
    configManager = ConfigManager.getInstance(logger);
    await configManager.initialize();
    const config2 = await configManager.getConfig();
    expect(config2.autoCommit).toBe(false);
  });

  test('should handle OLLAMA_COMMIT_PROMPT_TEMPLATE environment variable', async () => {
    process.env.OLLAMA_COMMIT_PROMPT_TEMPLATE = 'simple';
    configManager = ConfigManager.getInstance(logger);
    await configManager.initialize();
    const config = await configManager.getConfig();
    expect(config.promptTemplate).toBe('simple');

    // Reset and test another value
    // @ts-expect-error: allow test-only access
    ConfigManager.instance = undefined;
    process.env.OLLAMA_COMMIT_PROMPT_TEMPLATE = 'conventional';
    configManager = ConfigManager.getInstance(logger);
    await configManager.initialize();
    const config2 = await configManager.getConfig();
    expect(config2.promptTemplate).toBe('conventional');
  });

  test('should validate prompt template from environment variable', async () => {
    process.env.OLLAMA_COMMIT_PROMPT_TEMPLATE = 'invalid';
    configManager = ConfigManager.getInstance(logger);
    await configManager.initialize();
    const config = await configManager.getConfig();
    expect(config.promptTemplate).toBe('default');
  });

  test('should include new options in debug info', async () => {
    process.env.OLLAMA_COMMIT_AUTO_COMMIT = 'true';
    process.env.OLLAMA_COMMIT_PROMPT_TEMPLATE = 'simple';
    configManager = ConfigManager.getInstance(logger);
    await configManager.initialize();
    const debugInfo = await configManager.getDebugInfo();
    const envVars = debugInfo.environment.env;
    expect(envVars).toHaveProperty('OLLAMA_COMMIT_AUTO_COMMIT');
    expect(envVars).toHaveProperty('OLLAMA_COMMIT_PROMPT_TEMPLATE');
    expect(envVars.OLLAMA_COMMIT_AUTO_COMMIT).toBe('true');
    expect(envVars.OLLAMA_COMMIT_PROMPT_TEMPLATE).toBe('simple');
  });
});
