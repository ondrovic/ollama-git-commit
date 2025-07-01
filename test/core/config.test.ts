import { beforeAll, describe, expect, test } from 'bun:test';
import { CONFIGURATIONS } from '../../src/constants/configurations';
import { Logger } from '../../src/utils/logger';
import { MockedConfigManager } from '../mocks/MockedConfigManager';

describe('ConfigManager', () => {
  let configManager: MockedConfigManager;
  let logger: Logger;

  beforeAll(() => {
    logger = new Logger();
    logger.setVerbose(true);
  });

  test('should initialize with mock configuration', async () => {
    configManager = new MockedConfigManager(logger);
    await configManager.initialize();
    const config = await configManager.getConfig();
    expect(config.model).toBe(CONFIGURATIONS.MOCK.model);
    expect(config.host).toBe(CONFIGURATIONS.MOCK.host);
    expect(config.autoCommit).toBe(CONFIGURATIONS.MOCK.autoCommit);
    expect(config.promptTemplate).toBe(CONFIGURATIONS.MOCK.promptTemplate);
  });

  test('should support multi-model configuration', async () => {
    configManager = new MockedConfigManager(logger);
    await configManager.initialize();
    
    const chatModel = await configManager.getChatModel();
    expect(chatModel).toBeDefined();
    expect(chatModel?.name).toBe('mock-chat-model');
    expect(chatModel?.roles).toContain('chat');

    const embeddingsModel = await configManager.getEmbeddingsModel();
    expect(embeddingsModel).toBeDefined();
    expect(embeddingsModel?.name).toBe('mock-embeddings');
    expect(embeddingsModel?.roles).toContain('embed');

    const contextProviders = await configManager.getContextProviders();
    expect(contextProviders).toHaveLength(2);
    expect(contextProviders[0].provider).toBe('code');
    expect(contextProviders[0].enabled).toBe(true);
  });

  test('should get primary model', async () => {
    configManager = new MockedConfigManager(logger);
    await configManager.initialize();
    
    const primaryModel = await configManager.getPrimaryModel();
    expect(primaryModel).toBe('mock-chat');
  });
});
