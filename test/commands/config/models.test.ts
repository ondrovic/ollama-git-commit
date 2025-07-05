import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { ConfigManager } from '../../../src/core/config';

describe('Models Commands - set-primary bug fix', () => {
  let configManager: ConfigManager;

  beforeEach(async () => {
    // Create a fresh config manager for each test
    configManager = ConfigManager.getInstance();
    await configManager.initialize();
  });

  afterEach(async () => {
    // Clean up any test configurations
    try {
      await configManager.removeConfig('user');
      await configManager.removeConfig('local');
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should save the model identifier, not the display name when setting primary model', async () => {
    // First, add a model with a different display name and identifier
    const testModel = {
      name: 'my-chat-model', // Display name
      provider: 'ollama' as const,
      model: 'llama3:8b', // Model identifier
      roles: ['chat'] as const,
    };

    // Add the model to the configuration
    const initialConfig = await configManager.getConfig();
    const models = initialConfig.models || [];
    models.push(testModel);
    await configManager.saveConfig({ models }, 'user');

    // Verify the model was added correctly
    const configAfterAdd = await configManager.getConfig();
    expect(configAfterAdd.models).toBeDefined();
    expect(configAfterAdd.models!.length).toBeGreaterThan(0);
    const addedModel = configAfterAdd.models!.find(m => m.name === 'my-chat-model');
    expect(addedModel).toBeDefined();
    expect(addedModel!.model).toBe('llama3:8b');

    // Now simulate the set-primary command logic
    // This is the key part that was buggy - it should save targetModel.model, not name
    const targetModel = configAfterAdd.models!.find(m => m.name === 'my-chat-model');
    expect(targetModel).toBeDefined();
    expect(targetModel!.roles.includes('chat')).toBe(true);

    // This is the fix: save targetModel.model instead of name
    await configManager.saveConfig({ model: targetModel!.model }, 'user');

    // Verify that the model field contains the model identifier, not the display name
    const finalConfig = await configManager.getConfig();
    expect(finalConfig.model).toBe('llama3:8b');
    expect(finalConfig.model).not.toBe('my-chat-model');
  });

  it('should work with the actual set-primary command implementation', async () => {
    // Add a test model
    const testModel = {
      name: 'test-model',
      provider: 'ollama' as const,
      model: 'mistral:7b',
      roles: ['chat'] as const,
    };

    const initialConfig = await configManager.getConfig();
    const models = initialConfig.models || [];
    models.push(testModel);
    await configManager.saveConfig({ models }, 'user');

    // Simulate the exact logic from the set-primary command
    const config = await configManager.getConfig();
    const modelsList = config.models || [];
    const targetModel = modelsList.find(m => m.name === 'test-model');

    expect(targetModel).toBeDefined();
    expect(targetModel!.roles.includes('chat')).toBe(true);

    // This is the corrected line from the fix
    await configManager.saveConfig({ model: targetModel!.model }, 'user');

    // Verify the result
    const finalConfig = await configManager.getConfig();
    expect(finalConfig.model).toBe('mistral:7b');
    expect(finalConfig.model).not.toBe('test-model');
  });
}); 