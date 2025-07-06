import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { MockedConfigManager } from './MockedConfigManager';
import { MockedFileSystem } from './MockedFileSystem';

describe('MockedFileSystem', () => {
  test('readdir returns directory contents', async () => {
    const files = await MockedFileSystem.readdir('/mock/dir');
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBeGreaterThan(0);
  });

  test('readdir returns empty for unknown path', async () => {
    const files = await MockedFileSystem.readdir('/unknown');
    expect(files).toEqual([]);
  });

  test('readFile returns config content for package.json', async () => {
    const content = await MockedFileSystem.readFile('/mock/dir/package.json', 'utf-8');
    expect(content).toContain('mock-model');
  });

  test('readFile throws for unknown file', async () => {
    await expect(MockedFileSystem.readFile('/mock/dir/unknown.txt', 'utf-8')).rejects.toThrow(
      'File not found',
    );
  });

  test('access resolves for package.json', async () => {
    await expect(MockedFileSystem.access('/mock/dir/package.json')).resolves.toBeUndefined();
  });

  test('access rejects for unknown file', async () => {
    await expect(MockedFileSystem.access('/mock/dir/unknown.txt')).rejects.toThrow(
      'File not found',
    );
  });
});

describe('MockedConfigManager', () => {
  let logger;
  let config;
  beforeEach(() => {
    logger = {
      info: mock(() => {}),
      warn: mock(() => {}),
      debug: mock(() => {}),
    };
    config = new MockedConfigManager(logger);
  });

  test('should construct and call all public methods', async () => {
    await config.initialize();
    await config.getConfig();
    await config.getConfigByType('user');
    await config.removeConfig('user');
    await config.getConfigFiles();
    await config.getDebugInfo();
    await config.getConfigSources();
    await config.getConfigSourceInfo();
    await config.getConfigFileInfo();
    await config.saveConfig({});
    config.override({
      model: 'override',
      models: [],
      context: [],
      timeouts: {},
      host: '',
      promptFile: '',
      configFile: '',
    });
    await config.getModelByRole('chat');
    await config.getEmbeddingsModel();
    await config.getContextProviders();
    await config.getChatModel();
    await config.getPrimaryModel();
    await config.getConfigKeys();
  });

  test('saveConfig with valid model triggers auto-sync and info logs', async () => {
    await config.saveConfig({ model: 'new-model' });
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Mock config saved'));
  });

  test('saveConfig with invalid model triggers warning', async () => {
    await config.saveConfig({ model: '' });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid model value'));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Mock config saved'));
  });

  test('saveConfig with no model skips auto-sync', async () => {
    await config.saveConfig({ host: 'test-host' });
    expect(logger.debug).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Mock config saved'));
  });

  test('getConfigKeys returns all expected keys', async () => {
    const keys = await config.getConfigKeys();
    expect(Array.isArray(keys)).toBe(true);
    expect(keys.some(k => k.key === 'model')).toBe(true);
    expect(keys.some(k => k.key === 'host')).toBe(true);
    expect(keys.some(k => k.key === 'embeddingsModel')).toBe(true);
    expect(keys.some(k => k.key === 'context')).toBe(true);
  });
});
