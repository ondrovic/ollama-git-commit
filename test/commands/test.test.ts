import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { GetConfigFn, TestCommand } from '../../src/commands/test';
import { ILogger, IOllamaService } from '../../src/core/interfaces';
import { MockedConfigManager } from '../mocks/MockedConfigManager';

// Save ALL global state at the top to ensure we can always restore it
const realFetch = global.fetch;
const realConsole = global.console;
const realProcess = global.process;

describe('TestCommand', () => {
  let testCommand: TestCommand;
  let mockLogger: ILogger;
  let mockOllamaService: IOllamaService;
  let mockConfigManager: MockedConfigManager;
  let mockGetConfig: GetConfigFn;

  beforeEach(() => {
    // Restore ALL global state to ensure clean environment
    global.fetch = realFetch;
    global.console = realConsole;
    global.process = realProcess;

    // Create fresh mocks for each test
    mockOllamaService = {
      testConnection: mock(() => Promise.resolve(true)),
      isModelAvailable: mock(() => Promise.resolve(true)),
      generateCommitMessage: mock(() => Promise.resolve('test message')),
      getModels: mock(() => Promise.resolve([])),
      generateEmbeddings: mock(() => Promise.resolve([])),
      generateEmbeddingsBatch: mock(() => Promise.resolve([])),
      setQuiet: mock(() => {}),
    };

    // Simplified mock logger with type assertion
    mockLogger = {
      info: mock(() => {}),
      warn: mock(() => {}),
      error: mock(() => {}),
      debug: mock(() => {}),
      success: mock(() => {}),
      test: mock(() => {}),
      rocket: mock(() => {}),
      table: mock(() => {}),
      group: mock(() => {}),
      plain: mock(() => {}),
      clock: mock(() => {}),
      setVerbose: mock(() => {}),
      setDebug: mock(() => {}),
      isVerbose: mock(() => false),
      isDebug: mock(() => false),
      log: mock(() => {}),
      time: mock(() => {}),
      timeEnd: mock(() => {}),
      version: mock(() => {}),
      increment: mock(() => {}),
      decrement: mock(() => {}),
      gauge: mock(() => {}),
      histogram: mock(() => {}),
      trace: mock(() => {}),
      fatal: mock(() => {}),
      silent: mock(() => {}),
      verbose: mock(() => {}),
      quiet: mock(() => {}),
      setLevel: mock(() => {}),
      getLevel: mock(() => 'info'),
    } as unknown as ILogger;

    // Create MockedConfigManager and getConfig function
    mockConfigManager = new MockedConfigManager(mockLogger);
    mockGetConfig = mock(() => mockConfigManager.getConfig());

    // Create TestCommand instance with injected dependencies
    testCommand = new TestCommand(mockOllamaService, mockLogger, mockGetConfig);
  });

  afterEach(() => {
    // Restore ALL global state
    global.fetch = realFetch;
    global.console = realConsole;
    global.process = realProcess;
  });

  describe('testConnection', () => {
    test('should test connection successfully', async () => {
      const result = await testCommand.testConnection('http://localhost:11434', false);

      expect(result).toBe(true);
      expect(mockOllamaService.testConnection).toHaveBeenCalledWith(
        'http://localhost:11434',
        false,
      );
    });

    test('should test connection with verbose logging', async () => {
      // Ensure mock returns true for this test
      (mockOllamaService.testConnection as any).mockImplementation(() => Promise.resolve(true));
      mockGetConfig.mockImplementation(() =>
        Promise.resolve({
          host: 'http://localhost:11434',
          timeouts: { connection: 1000, generation: 1000 },
          model: 'llama3:8b',
        }),
      );
      const result = await testCommand.testConnection('http://localhost:11434', true);
      expect(result).toBe(true);
    });

    test('should handle connection failure', async () => {
      (mockOllamaService.testConnection as any).mockImplementation(() => Promise.resolve(false));

      const result = await testCommand.testConnection('http://localhost:11434', false);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Connection test failed:',
        'Connection test failed',
      );
    });

    test('should handle connection error', async () => {
      (mockOllamaService.testConnection as any).mockImplementation(() =>
        Promise.reject(new Error('Network error')),
      );

      const result = await testCommand.testConnection('http://localhost:11434', false);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Connection test failed:', 'Network error');
    });

    test('should handle unknown error', async () => {
      (mockOllamaService.testConnection as any).mockImplementation(() =>
        Promise.reject('Unknown error'),
      );

      const result = await testCommand.testConnection('http://localhost:11434', false);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Connection test failed:',
        'Unknown error occurred',
      );
    });
  });

  describe('testModel', () => {
    test('should test model successfully', async () => {
      const result = await testCommand.testModel('llama3:8b', 'http://localhost:11434', false);

      expect(result).toBe(true);
      expect(mockOllamaService.testConnection).toHaveBeenCalledWith(
        'http://localhost:11434',
        false,
      );
      expect(mockOllamaService.isModelAvailable).toHaveBeenCalledWith(
        'http://localhost:11434',
        'llama3:8b',
      );
    });

    test('should test model with verbose logging', async () => {
      // Ensure mocks return true for this test
      (mockOllamaService.testConnection as any).mockImplementation(() => Promise.resolve(true));
      (mockOllamaService.isModelAvailable as any).mockImplementation(() => Promise.resolve(true));
      mockGetConfig.mockImplementation(() =>
        Promise.resolve({
          host: 'http://localhost:11434',
          timeouts: { connection: 1000, generation: 1000 },
          model: 'llama3:8b',
        }),
      );
      const result = await testCommand.testModel('llama3:8b', 'http://localhost:11434', true);
      expect(result).toBe(true);
    });

    test('should handle connection failure in model test', async () => {
      (mockOllamaService.testConnection as any).mockImplementation(() => Promise.resolve(false));

      const result = await testCommand.testModel('llama3:8b', 'http://localhost:11434', false);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Connection test failed');
    });

    test('should handle model availability failure', async () => {
      (mockOllamaService.isModelAvailable as any).mockImplementation(() => Promise.resolve(false));

      const result = await testCommand.testModel('llama3:8b', 'http://localhost:11434', false);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Model test failed');
    });

    test('should handle model test error', async () => {
      (mockOllamaService.testConnection as any).mockImplementation(() =>
        Promise.reject(new Error('Test error')),
      );

      const result = await testCommand.testModel('llama3:8b', 'http://localhost:11434', false);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Connection test failed:', 'Test error');
      expect(mockLogger.error).toHaveBeenCalledWith('Connection test failed');
    });

    test('should handle unknown error in model test', async () => {
      (mockOllamaService.testConnection as any).mockImplementation(() =>
        Promise.reject('Unknown error'),
      );

      const result = await testCommand.testModel('llama3:8b', 'http://localhost:11434', false);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Connection test failed:',
        'Unknown error occurred',
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Connection test failed');
    });
  });

  describe('testAll', () => {
    test('should run all tests successfully', async () => {
      // Mock fetch for simple prompt test
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('{"response": "Test successful"}'),
        }),
      );
      global.fetch = mockFetch as any;

      const result = await testCommand.testAll('llama3:8b', 'http://localhost:11434', false);

      expect(result).toBe(true);
      expect(mockLogger.test).toHaveBeenCalledWith('Testing connection...');
      expect(mockLogger.test).toHaveBeenCalledWith('Testing model...');
      expect(mockLogger.test).toHaveBeenCalledWith('Testing simple prompt...');
      expect(mockLogger.test).toHaveBeenCalledWith('Running benchmark...');
      expect(mockLogger.success).toHaveBeenCalledWith('All tests passed!');
    });

    test('should handle model failure in testAll', async () => {
      (mockOllamaService.testConnection as any).mockImplementation(() => Promise.resolve(false));

      const result = await testCommand.testAll('llama3:8b', 'http://localhost:11434', false);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Connection test failed');
    });

    test('should handle simple prompt failure', async () => {
      // Mock fetch to fail
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        }),
      );
      global.fetch = mockFetch as any;

      const result = await testCommand.testAll('llama3:8b', 'http://localhost:11434', false);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Simple prompt test failed');
    });
  });

  describe('testSimplePrompt', () => {
    test('should test simple prompt successfully', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('{"response": "Test successful"}'),
        }),
      );
      global.fetch = mockFetch as any;

      const result = await testCommand.testSimplePrompt(
        'http://localhost:11434',
        'llama3:8b',
        false,
      );

      expect(result).toBe(true);
    });

    test('should handle simple prompt failure', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        }),
      );
      global.fetch = mockFetch as any;

      const result = await testCommand.testSimplePrompt(
        'http://localhost:11434',
        'llama3:8b',
        false,
      );

      expect(result).toBe(false);
    });

    test('should handle JSON parse error', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('invalid json'),
        }),
      );
      global.fetch = mockFetch as any;

      const result = await testCommand.testSimplePrompt(
        'http://localhost:11434',
        'llama3:8b',
        false,
      );

      expect(result).toBe(false);
    });
  });

  describe('testModelAvailability', () => {
    test('should test model availability successfully', async () => {
      const result = await testCommand.testModelAvailability(
        'llama3:8b',
        'http://localhost:11434',
        false,
      );

      expect(result).toBe(true);
      expect(mockOllamaService.isModelAvailable).toHaveBeenCalledWith(
        'http://localhost:11434',
        'llama3:8b',
      );
    });

    test('should handle model availability failure', async () => {
      (mockOllamaService.isModelAvailable as any).mockImplementation(() => Promise.resolve(false));

      const result = await testCommand.testModelAvailability(
        'llama3:8b',
        'http://localhost:11434',
        false,
      );

      expect(result).toBe(false);
    });
  });

  describe('benchmarkModel', () => {
    test('should run benchmark successfully', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('{"response": "test"}'),
        }),
      );
      global.fetch = mockFetch as any;

      await testCommand.benchmarkModel('llama3:8b', 'http://localhost:11434', 2);

      expect(mockLogger.test).toHaveBeenCalledWith('Benchmarking model: llama3:8b');
      expect(mockLogger.test).toHaveBeenCalledWith('Running 2 iterations...');
      expect(mockLogger.plain).toHaveBeenCalled(); // Called for each iteration and summary
    });
  });
});
