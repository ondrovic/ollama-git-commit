import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
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

  beforeEach(async () => {
    // Create new instance with mocked dependencies
    configManager = new MockedConfigManager(logger);
    await configManager.initialize();
  });

  afterEach(() => {
    // Clean up
  });

  test('should initialize with mock configuration', async () => {
    const config = await configManager.getConfig();
    // The MockedConfigManager uses CONFIGURATIONS.MOCK, so host will be mock-host
    expect(config.model).toBe(CONFIGURATIONS.MOCK.model);
    expect(config.host).toBe(CONFIGURATIONS.MOCK.host);
    expect(config.autoCommit).toBe(CONFIGURATIONS.MOCK.autoCommit);
    expect(config.promptTemplate).toBe(CONFIGURATIONS.MOCK.promptTemplate);
  });

  test('should support multi-model configuration', async () => {
    const chatModel = await configManager.getChatModel();
    expect(chatModel).toBeDefined();
    expect(chatModel?.name).toBe('mock-chat-model');
    expect(chatModel?.roles).toContain('chat');

    const embeddingsModel = await configManager.getEmbeddingsModel();
    expect(embeddingsModel).toBeDefined();
    expect(embeddingsModel?.roles).toContain('embed');

    const contextProviders = await configManager.getContextProviders();
    expect(Array.isArray(contextProviders)).toBe(true);
  });

  test('should get primary model', async () => {
    const primaryModel = await configManager.getPrimaryModel();
    expect(primaryModel).toBe('mock-chat');
  });

  test('should merge new config values instead of overwriting', async () => {
    // Save a new value
    await configManager.saveConfig({ model: 'new-model', debug: true }, 'user');
    const config = await configManager.getConfig();
    // Old values should remain (host is mock-host)
    expect(config.host).toBe(CONFIGURATIONS.MOCK.host);
    expect(config.model).toBe('new-model');
    expect(config.debug).toBe(true);
    // Other values should remain unchanged
    expect(config.promptFile).toBe(CONFIGURATIONS.MOCK.promptFile);
  });

  test('should auto-sync models array when model field is updated', async () => {
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

    // Check that other models are preserved or updated
    const embeddingsModel = updatedConfig.models?.find(m => m.roles.includes('embed'));
    expect(embeddingsModel).toBeDefined();
    expect(embeddingsModel?.roles).toContain('embed');
  });

  test('should add chat model if none exists when model field is set', async () => {
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
    // Should have a chat and an embed model
    const chatModel = updatedConfig.models?.find(m => m.roles.includes('chat'));
    expect(chatModel).toBeDefined();
    expect(chatModel?.model).toBe('mistral:7b');
    expect(chatModel?.roles).toContain('chat');
    const embeddingsModel = updatedConfig.models?.find(m => m.roles.includes('embed'));
    expect(embeddingsModel).toBeDefined();
    expect(embeddingsModel?.name).toBe('embeddings-only');
  });

  test('should skip auto-sync for invalid model values', async () => {
    const initialConfig = await configManager.getConfig();
    // Compare only model names and roles
    const initialModels = initialConfig.models?.map(m => ({
      name: m.name,
      roles: m.roles,
    }));
    await configManager.saveConfig({ model: '' }, 'user');
    let updatedConfig = await configManager.getConfig();
    const updatedModels = updatedConfig.models?.map(m => ({
      name: m.name,
      roles: m.roles,
    }));
    expect(updatedModels).toEqual(initialModels);
    await configManager.saveConfig({ model: '   ' }, 'user');
    const updatedConfig2 = await configManager.getConfig();
    const updatedModels2 = updatedConfig2.models?.map(m => ({
      name: m.name,
      roles: m.roles,
    }));
    expect(updatedModels2).toEqual(initialModels);
  });

  test('should preserve custom model configurations when updating chat model', async () => {
    // Set up custom models
    const customModels = [
      {
        name: 'custom-chat',
        provider: 'ollama' as const,
        model: 'custom-chat-model',
        roles: ['chat', 'edit'],
      },
      {
        name: 'custom-embeddings',
        provider: 'ollama' as const,
        model: 'custom-embed-model',
        roles: ['embed'],
      },
    ];

    configManager.override({
      ...CONFIGURATIONS.MOCK,
      models: customModels,
    });

    // Update model field
    await configManager.saveConfig({ model: 'llama3:8b' }, 'user');
    const updatedConfig = await configManager.getConfig();

    // Check that chat model was updated but embeddings preserved
    expect(updatedConfig.model).toBe('llama3:8b');
    const chatModel = updatedConfig.models?.find(m => m.roles.includes('chat'));
    expect(chatModel).toBeDefined();
    expect(chatModel?.model).toBe('llama3:8b');
    expect(chatModel?.name).toBe('llama3:8b');

    const embeddingsModel = updatedConfig.models?.find(m => m.roles.includes('embed'));
    expect(embeddingsModel).toBeDefined();
    expect(embeddingsModel?.name).toBe('custom-embeddings');
    expect(embeddingsModel?.model).toBe('custom-embed-model');
  });

  test('should handle multiple chat models correctly', async () => {
    // Set up multiple chat models
    const multipleChatModels = [
      {
        name: 'chat-model-1',
        provider: 'ollama' as const,
        model: 'llama3:8b',
        roles: ['chat'],
      },
      {
        name: 'chat-model-2',
        provider: 'ollama' as const,
        model: 'mistral:7b',
        roles: ['chat'],
      },
      {
        name: 'embeddings-model',
        provider: 'ollama' as const,
        model: 'nomic-embed-text',
        roles: ['embed'],
      },
    ];

    configManager.override({
      ...CONFIGURATIONS.MOCK,
      models: multipleChatModels,
    });

    // Update model field
    await configManager.saveConfig({ model: 'llama3:8b' }, 'user');
    const updatedConfig = await configManager.getConfig();

    // Check that the first chat model was updated
    expect(updatedConfig.model).toBe('llama3:8b');
    const chatModels = updatedConfig.models?.filter(m => m.roles.includes('chat'));
    expect(chatModels).toHaveLength(2);
    expect(chatModels?.[0]?.model).toBe('llama3:8b');
    expect(chatModels?.[1]?.model).toBe('mistral:7b');
  });

  test('should handle configuration with no models array', async () => {
    // Set up config without models array
    configManager.override({
      ...CONFIGURATIONS.MOCK,
      models: undefined,
    });

    // Update model field
    await configManager.saveConfig({ model: 'llama3:8b' }, 'user');
    const updatedConfig = await configManager.getConfig();

    // Check that models array was created
    expect(updatedConfig.model).toBe('llama3:8b');
    expect(updatedConfig.models).toBeDefined();
    expect(updatedConfig.models?.length).toBe(2); // chat + embeddings
  });

  test('should handle empty models array', async () => {
    // Set up config with empty models array
    configManager.override({
      ...CONFIGURATIONS.MOCK,
      models: [],
    });

    // Update model field
    await configManager.saveConfig({ model: 'llama3:8b' }, 'user');
    const updatedConfig = await configManager.getConfig();

    // Check that models array was populated
    expect(updatedConfig.model).toBe('llama3:8b');
    expect(updatedConfig.models).toBeDefined();
    expect(updatedConfig.models?.length).toBe(2); // chat + embeddings
  });

  test('should preserve existing model names when possible', async () => {
    // Set up config with custom model names
    const customModels = [
      {
        name: 'my-chat-model',
        provider: 'ollama' as const,
        model: 'llama3:8b',
        roles: ['chat'],
      },
      {
        name: 'my-embeddings',
        provider: 'ollama' as const,
        model: 'nomic-embed-text',
        roles: ['embed'],
      },
    ];

    configManager.override({
      ...CONFIGURATIONS.MOCK,
      models: customModels,
    });

    // Update model field
    await configManager.saveConfig({ model: 'llama3:8b' }, 'user');
    const updatedConfig = await configManager.getConfig();

    // Check that model names were preserved
    expect(updatedConfig.model).toBe('llama3:8b');
    const chatModel = updatedConfig.models?.find(m => m.roles.includes('chat'));
    expect(chatModel?.name).toBe('my-chat-model');
    expect(chatModel?.model).toBe('llama3:8b');
  });

  test('should handle configuration sources', async () => {
    const sources = await configManager.getConfigSources();
    expect(sources).toBeDefined();
    expect(typeof sources.model).toBe('string');
    expect(typeof sources.host).toBe('string');
  });
});
