import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { ServiceFactory } from '../../src/core/factory';
import { MockedFileSystem } from '../mocks/MockedFileSystem';

const createMockLogger = () => ({
  info: mock(() => {}),
  warn: mock(() => {}),
  debug: mock(() => {}),
  error: mock(() => {}),
  setVerbose: mock(() => {}),
  setDebug: mock(() => {}),
});

const mockPath = {
  join: mock((...args: string[]) => args.join('/')),
  resolve: mock((...args: string[]) => args.join('/')),
  dirname: mock((path: string) => path.split('/').slice(0, -1).join('/')),
};

const mockOs = {
  homedir: mock(() => '/mock/home'),
  cwd: mock(() => '/mock/cwd'),
};

const mockSpawn = mock(() => ({}));
const mockSpinner = mock(() => ({ start: mock(() => {}), stop: mock(() => {}) }));
const mockFetch = mock(() => Promise.resolve({ json: () => ({}) }));
const mockConfig = { model: 'mock-model', host: 'mock-host' };

let factory: ServiceFactory;
let restoreGetConfig: any;

beforeEach(() => {
  // Always reset singleton for isolation
  (ServiceFactory as any).instance = undefined;
  factory = ServiceFactory.getInstance({
    fs: MockedFileSystem,
    path: mockPath,
    os: mockOs,
    spawn: mockSpawn,
    logger: createMockLogger(),
    spinner: mockSpinner,
    fetch: mockFetch,
    config: mockConfig,
  });

  // Mock the exported getConfig function for all tests
  restoreGetConfig = mock.module('../../src/core/config', () => ({
    getConfig: async () => mockConfig,
  }));
});

afterEach(() => {
  // Restore the getConfig mock
  if (restoreGetConfig) restoreGetConfig();
});

describe('ServiceFactory', () => {
  test('getInstance returns singleton', () => {
    const f1 = ServiceFactory.getInstance();
    const f2 = ServiceFactory.getInstance();
    expect(f1).toBe(f2);
  });

  test('initialize sets config', async () => {
    await factory.initialize();
    expect((factory as any).config).toBeDefined();
  });

  test('createLogger returns a logger and sets verbose/debug', () => {
    const logger = factory.createLogger({ verbose: true, debug: true });
    expect(logger).toBeDefined();
    expect(logger.setVerbose).toHaveBeenCalledWith(true);
    expect(logger.setDebug).toHaveBeenCalledWith(true);
  });

  test('createGitService returns a GitService with DI', () => {
    const gitService = factory.createGitService({ directory: '/mock/dir', quiet: true });
    expect(gitService).toBeDefined();
    expect((gitService as any).directory).toBe('/mock/dir');
    expect((gitService as any).quiet).toBe(true);
    expect((gitService as any).fs).toBe(MockedFileSystem);
  });

  test('createOllamaService returns an OllamaService with DI', () => {
    const ollamaService = factory.createOllamaService({ quiet: true });
    expect(ollamaService).toBeDefined();
    expect((ollamaService as any).quiet).toBe(true);
    expect((ollamaService as any).spinner).toBeDefined();
    expect(typeof (ollamaService as any).spinner.start).toBe('function');
    expect(typeof (ollamaService as any).spinner.stop).toBe('function');
  });

  test('createPromptService returns a PromptService with DI', () => {
    const promptService = factory.createPromptService({ quiet: true });
    expect(promptService).toBeDefined();
    expect((promptService as any).quiet).toBe(true);
    expect((promptService as any).contextService).toBeDefined();
    expect((promptService as any).fs).toBe(MockedFileSystem);
  });

  test('createContextService returns a ContextService with DI', () => {
    const contextService = factory.createContextService({ quiet: true });
    expect(contextService).toBeDefined();
    expect((contextService as any).quiet).toBe(true);
    expect((contextService as any).logger).toBeDefined();
  });

  test('createConfigManager returns a ConfigManager singleton', () => {
    const configManager1 = factory.createConfigManager();
    const configManager2 = factory.createConfigManager();
    expect(configManager1).toBe(configManager2);
  });

  test('createCommitServices returns all services', async () => {
    const services = await factory.createCommitServices({ quiet: true });
    expect(services.logger).toBeDefined();
    expect(services.gitService).toBeDefined();
    expect(services.ollamaService).toBeDefined();
    expect(services.promptService).toBeDefined();
    expect(services.configManager).toBeDefined();
  });

  test('createTestServices returns all test services', () => {
    const services = factory.createTestServices({ quiet: true });
    expect(services.logger).toBeDefined();
    expect(services.gitService).toBeDefined();
    expect(services.ollamaService).toBeDefined();
    expect(services.promptService).toBeDefined();
  });

  test('createLogger uses provided logger if given', () => {
    const customLogger = createMockLogger();
    const logger = factory.createLogger({ logger: customLogger });
    expect(logger).toBe(customLogger);
  });

  test('createLogger falls back to deps.logger if no option', () => {
    const logger = factory.createLogger();
    expect(logger).toBeDefined();
  });

  test('getInstance can be reset for isolation', () => {
    (ServiceFactory as any).instance = undefined;
    const f1 = ServiceFactory.getInstance();
    expect(f1).toBeDefined();
  });
});
