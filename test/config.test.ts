import { beforeEach, describe, expect, it } from 'bun:test';
import { CONFIGURATIONS } from '../src/constants/configurations';
import { MockedConfigManager } from './mocks/MockedConfigManager';

describe('ConfigManager', () => {
  let configManager: MockedConfigManager;

  beforeEach(() => {
    configManager = new MockedConfigManager();
  });

  it('should initialize and load config', async () => {
    await configManager.initialize();
    const config = await configManager.getConfig();
    expect(config.model).toBe(CONFIGURATIONS.MOCK.model);
    expect(config.host).toBe(CONFIGURATIONS.MOCK.host);
  });

  it('should get config files', async () => {
    const config = await configManager.getConfig();
    expect(config.promptFile).toBe(CONFIGURATIONS.MOCK.promptFile);
    expect(config.configFile).toBe(CONFIGURATIONS.MOCK.configFile);
  });

  it('should reload config', async () => {
    await expect(configManager.reload()).resolves.toBeUndefined();
  });

  it('should get debug info', async () => {
    const config = await configManager.getConfig();
    expect(config).toEqual(CONFIGURATIONS.MOCK);
  });
});
