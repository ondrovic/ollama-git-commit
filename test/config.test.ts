import { beforeEach, describe, expect, it } from 'bun:test';
import { CONFIGURATIONS } from '../src/constants/configurations';
import { Logger } from '../src/utils/logger';
import { MockedConfigManager } from './mocks/MockedConfigManager';

describe('ConfigManager', () => {
  let configManager: MockedConfigManager;

  beforeEach(() => {
    configManager = new MockedConfigManager(Logger.getDefault());
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

  it('should get debug info', async () => {
    const debugInfo = await configManager.getDebugInfo();
    expect(debugInfo.config).toBeDefined();
    expect(debugInfo.files).toBeDefined();
  });
});
