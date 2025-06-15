import { beforeEach, describe, expect, it } from 'bun:test';
import { ENVIRONMENTAL_VARIABLES } from '../src/constants/enviornmental';
import { ConfigManager } from '../src/core/config';

// Stubbed logger
const mockLogger = {
  setVerbose: () => {},
  setDebug: () => {},
  isVerbose: () => false,
  isDebug: () => false,
  info: () => {},
  success: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  log: () => {},
  table: () => {},
  group: () => {},
  time: () => {},
  timeEnd: () => {},
};

// Stubbed fs-extra
const stubFs = {
  readFile: async () => JSON.stringify({ model: 'mock-model', host: 'http://mock-host:1234' }),
  writeFile: async () => {},
  writeJson: async () => {},
  ensureDir: async () => {},
  pathExists: async () => true,
  unlink: async () => {},
};

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset the singleton so each test gets a fresh instance with the stubbed fs
    // @ts-ignore
    ConfigManager['instance'] = undefined;
    configManager = ConfigManager.getInstance(mockLogger as any, stubFs as any);
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  it('should initialize and load config with stubbed fs', async () => {
    // Set the environment variable to match the test expectation
    process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_HOST] = 'http://mock-host:1234';
    await configManager.initialize();
    const config = await configManager.getConfig();
    expect(config.model).toBe('mock-model');
    expect(config.host).toBe('http://mock-host:1234');
  });

  it('should create default config file', async () => {
    await expect(configManager.createDefaultConfig()).resolves.toBeUndefined();
  });

  it('should get config files', async () => {
    const files = await configManager.getConfigFiles();
    expect(files).toHaveProperty('user');
    expect(files).toHaveProperty('local');
    expect(Array.isArray(files.active)).toBe(true);
  });

  it('should reload config', async () => {
    await expect(configManager.reload()).resolves.toBeUndefined();
  });

  it('should get debug info', async () => {
    const debugInfo = await configManager.getDebugInfo();
    expect(debugInfo).toHaveProperty('config');
    expect(debugInfo).toHaveProperty('files');
    expect(debugInfo).toHaveProperty('environment');
  });
});
