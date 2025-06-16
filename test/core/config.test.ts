import { beforeAll, describe, expect, test } from 'bun:test';
import { ENVIRONMENTAL_VARIABLES } from '../../src/constants/enviornmental';
import { Logger } from '../../src/utils/logger';
import { MockedConfigManager } from '../mocks/MockedConfigManager';

describe('ConfigManager', () => {
  let configManager: MockedConfigManager;
  let logger: Logger;

  beforeAll(() => {
    logger = new Logger();
    logger.setVerbose(true);
  });

  test('should handle OLLAMA_COMMIT_AUTO_COMMIT environment variable', async () => {
    process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_AUTO_COMMIT] = 'true';
    configManager = new MockedConfigManager();
    await configManager.initialize();
    const config = await configManager.getConfig();
    expect(config.autoCommit).toBe(true);

    process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_AUTO_COMMIT] = 'false';
    configManager = new MockedConfigManager();
    await configManager.initialize();
    const config2 = await configManager.getConfig();
    expect(config2.autoCommit).toBe(false);
  });

  test('should handle OLLAMA_COMMIT_PROMPT_TEMPLATE environment variable', async () => {
    process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_PROMPT_TEMPLATE] = 'simple';
    configManager = new MockedConfigManager();
    await configManager.initialize();
    const config = await configManager.getConfig();
    expect(config.promptTemplate).toBe('simple');

    process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_COMMIT_PROMPT_TEMPLATE] = 'conventional';
    configManager = new MockedConfigManager();
    await configManager.initialize();
    const config2 = await configManager.getConfig();
    expect(config2.promptTemplate).toBe('conventional');
  });
});
