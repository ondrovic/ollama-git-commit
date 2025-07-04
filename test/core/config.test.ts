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

  test('should merge new config values instead of overwriting', async () => {
    configManager = new MockedConfigManager(logger);
    await configManager.initialize();
    // Save a new value
    await configManager.saveConfig({ model: 'new-model', debug: true }, 'user');
    const config = await configManager.getConfig();
    // Old values should remain
    expect(config.host).toBe(CONFIGURATIONS.MOCK.host);
    expect(config.model).toBe('new-model');
    expect(config.debug).toBe(true);
    // Other values should remain unchanged
    expect(config.promptFile).toBe(CONFIGURATIONS.MOCK.promptFile);
  });

  test('should auto-sync models array when model field is updated', async () => {
    configManager = new MockedConfigManager(logger);
    await configManager.initialize();

    // Initial state
    const initialConfig = await configManager.getConfig();
    expect(initialConfig.models).toBeDefined();
    expect(initialConfig.models?.length).toBeGreaterThan(0);

    // Update model field
    await configManager.saveConfig({ model: 'llama3:8b' }, 'user');
    const updatedConfig = await configManager.getConfig();

    // Check that model field is updated
    expect(updatedConfig.model).toBe('llama3:8b');

    // Check that models array is updated
    expect(updatedConfig.models).toBeDefined();
    const chatModel = updatedConfig.models?.find(m => m.roles.includes('chat'));
    expect(chatModel).toBeDefined();
    expect(chatModel?.model).toBe('llama3:8b');
    expect(chatModel?.name).toBe('llama3:8b');

    // Check that other models are preserved
    const embeddingsModel = updatedConfig.models?.find(m => m.roles.includes('embed'));
    expect(embeddingsModel).toBeDefined();
    expect(embeddingsModel?.roles).toContain('embed');
  });

  test('should add chat model if none exists when model field is set', async () => {
    configManager = new MockedConfigManager(logger);
    await configManager.initialize();

    // Create a config with no chat model
    const configWithoutChat = {
      ...CONFIGURATIONS.MOCK,
      models: [
        {
          name: 'embeddings-only',
          provider: 'ollama' as const,
          model: 'nomic-embed-text',
          roles: ['embed'],
        },
      ],
    };

    // Override the mock config
    configManager.override(configWithoutChat);

    // Set model field
    await configManager.saveConfig({ model: 'mistral:7b' }, 'user');
    const updatedConfig = await configManager.getConfig();

    // Check that chat model was added
    expect(updatedConfig.model).toBe('mistral:7b');
    expect(updatedConfig.models).toBeDefined();
    expect(updatedConfig.models?.length).toBe(2); // chat + embeddings

    const chatModel = updatedConfig.models?.find(m => m.roles.includes('chat'));
    expect(chatModel).toBeDefined();
    expect(chatModel?.model).toBe('mistral:7b');
    expect(chatModel?.roles).toContain('chat');

    // Check that embeddings model is preserved
    const embeddingsModel = updatedConfig.models?.find(m => m.roles.includes('embed'));
    expect(embeddingsModel).toBeDefined();
    expect(embeddingsModel?.name).toBe('embeddings-only');
  });

  test('should skip auto-sync for invalid model values', async () => {
    configManager = new MockedConfigManager(logger);
    await configManager.initialize();

    const initialConfig = await configManager.getConfig();
    const initialModels = [...(initialConfig.models || [])];

    // Try to set invalid model values
    await configManager.saveConfig({ model: '' }, 'user');
    let updatedConfig = await configManager.getConfig();
    expect(updatedConfig.models).toEqual(initialModels);

    await configManager.saveConfig({ model: '   ' }, 'user');
    updatedConfig = await configManager.getConfig();
    expect(updatedConfig.models).toEqual(initialModels);
  });

  test('should preserve custom model configurations when updating chat model', async () => {
    configManager = new MockedConfigManager(logger);
    await configManager.initialize();

    // Create a config with custom models
    const customConfig = {
      ...CONFIGURATIONS.MOCK,
      models: [
        {
          name: 'custom-chat',
          provider: 'ollama' as const,
          model: 'llama2:7b',
          roles: ['chat', 'edit'],
        },
        {
          name: 'custom-embeddings',
          provider: 'ollama' as const,
          model: 'custom-embed-model',
          roles: ['embed'],
        },
        {
          name: 'custom-summarize',
          provider: 'ollama' as const,
          model: 'summarize-model',
          roles: ['summarize'],
        },
      ],
    };

    // Override the mock config
    configManager.override(customConfig);

    // Update model field
    await configManager.saveConfig({ model: 'new-chat-model' }, 'user');
    const updatedConfig = await configManager.getConfig();

    // Check that chat model was updated
    expect(updatedConfig.model).toBe('new-chat-model');
    const chatModel = updatedConfig.models?.find(m => m.roles.includes('chat'));
    expect(chatModel?.model).toBe('new-chat-model');
    expect(chatModel?.name).toBe('new-chat-model');

    // Check that other custom models are preserved
    const summarizeModel = updatedConfig.models?.find(m => m.roles.includes('summarize'));
    expect(summarizeModel).toBeDefined();
    expect(summarizeModel?.name).toBe('custom-summarize');
    expect(summarizeModel?.model).toBe('summarize-model');

    // Check that embeddings model is preserved
    const embeddingsModel = updatedConfig.models?.find(m => m.roles.includes('embed'));
    expect(embeddingsModel).toBeDefined();
    expect(embeddingsModel?.name).toBe('custom-embeddings');
    expect(embeddingsModel?.model).toBe('custom-embed-model');

    // Check total count (should be 3: chat + embeddings + summarize)
    expect(updatedConfig.models?.length).toBe(3);
  });
});
