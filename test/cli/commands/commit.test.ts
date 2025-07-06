import { mock } from 'bun:test';

const mockValidateEnvironment = mock(() => ({}));
mock.module('../../../src/utils/validation', () => ({
  validateEnvironment: mockValidateEnvironment,
}));

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Command } from 'commander';
import { executeCommitAction, registerCommitCommand } from '../../../src/cli/commands/commit';

// Save ALL global state at the top to ensure we can always restore it
const realFetch = global.fetch;
const realConsole = global.console;
const realProcess = global.process;

describe('Commit CLI Command', () => {
  let program: Command;
  let mockConfigManager: any;
  let mockServiceFactory: any;
  let mockLogger: any;
  let mockGetConfig: any;

  beforeEach(() => {
    // Restore ALL global state to ensure clean environment
    global.fetch = realFetch;
    global.console = realConsole;
    global.process = realProcess;

    // Reset all mocks
    mockValidateEnvironment.mockReset();
    // Set up environment variables for validation
    process.env.OLLAMA_HOST = 'http://localhost:11434';
    // Create mock dependencies
    mockConfigManager = {
      getConfig: mock(() => Promise.resolve({ model: 'test-model', host: 'http://localhost:11434' })),
      saveConfig: mock(() => Promise.resolve()),
    };
    mockLogger = {
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
    };
    mockServiceFactory = {
      createLogger: mock(() => mockLogger),
      createGitService: mock(() => ({ exec: mock(() => Promise.resolve('')) })),
      createOllamaService: mock(() => ({ generateCommitMessage: mock(() => Promise.resolve('test message')) })),
      createPromptService: mock(() => ({ buildCommitPrompt: mock(() => 'test prompt') })),
    };
    mockGetConfig = mock(() => Promise.resolve({ model: 'test-model', host: 'http://localhost:11434' }));
    // Create a new program for each test
    program = new Command();
  });

  afterEach(() => {
    // Restore ALL global state
    global.fetch = realFetch;
    global.console = realConsole;
    global.process = realProcess;
  });

  test('should register commit command with all options', () => {
    registerCommitCommand(program, {
      configManager: mockConfigManager,
      serviceFactory: mockServiceFactory,
      logger: mockLogger,
      getConfig: mockGetConfig,
    });
    
    const commitCommand = program.commands.find(cmd => cmd.name() === 'commit');
    expect(commitCommand).toBeDefined();
    expect(commitCommand?.description()).toBe('Generate a commit message using Ollama');
    
    // Check that all expected options are registered
    const options = commitCommand?.options || [];
    const optionNames = options.map(opt => opt.long);
    expect(optionNames).toContain('--directory');
    expect(optionNames).toContain('--model');
    expect(optionNames).toContain('--host');
    expect(optionNames).toContain('--verbose');
    expect(optionNames).toContain('--interactive');
    expect(optionNames).toContain('--prompt-file');
    expect(optionNames).toContain('--prompt-template');
    expect(optionNames).toContain('--debug');
    expect(optionNames).toContain('--auto-stage');
    expect(optionNames).toContain('--auto-commit');
    expect(optionNames).toContain('--auto-model');
    expect(optionNames).toContain('--quiet');
  });

  test('should handle environment validation failure', async () => {
    mockValidateEnvironment.mockImplementation(() => ({
      valid: false,
      errors: ['Invalid directory'],
      warnings: ['Warning message'],
    }));

    const options = { directory: '/invalid/path' };
    const deps = {
      configManager: mockConfigManager,
      serviceFactory: mockServiceFactory,
      logger: mockLogger,
      getConfig: mockGetConfig,
    };

    try {
      await executeCommitAction(options, deps);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Environment validation failed');
    }

    expect(mockLogger.error).toHaveBeenCalledWith('Environment validation failed:');
    expect(mockLogger.error).toHaveBeenCalledWith('  Invalid directory');
    expect(mockLogger.warn).toHaveBeenCalledWith('Warnings:');
    expect(mockLogger.warn).toHaveBeenCalledWith('  Warning message');
  });

  test('should handle environment validation warnings only', async () => {
    mockValidateEnvironment.mockImplementation(() => ({
      valid: true,
      errors: [],
      warnings: ['Warning message'],
    }));

    const options = { directory: '/test/path' };
    const deps = {
      configManager: mockConfigManager,
      serviceFactory: mockServiceFactory,
      logger: mockLogger,
      getConfig: mockGetConfig,
    };

    try {
      await executeCommitAction(options, deps);
    } catch (error) {
      // Expected to throw due to missing dependencies in test environment
    }

    expect(mockLogger.warn).toHaveBeenCalledWith('Environment warnings:');
    expect(mockLogger.warn).toHaveBeenCalledWith('  Warning message');
  });

  test('should use injected dependencies when provided', async () => {
    mockValidateEnvironment.mockImplementation(() => ({
      valid: true,
      errors: [],
      warnings: [],
    }));

    const options = { directory: '/test/path' };
    const deps = {
      configManager: mockConfigManager,
      serviceFactory: mockServiceFactory,
      logger: mockLogger,
      getConfig: mockGetConfig,
    };

    try {
      await executeCommitAction(options, deps);
    } catch (error) {
      // Expected to throw due to missing dependencies in test environment
    }

    // Verify that the injected dependencies are used
    expect(mockServiceFactory.createLogger).toHaveBeenCalled();
    expect(mockServiceFactory.createGitService).toHaveBeenCalled();
    expect(mockServiceFactory.createOllamaService).toHaveBeenCalled();
    expect(mockServiceFactory.createPromptService).toHaveBeenCalled();
  });

  test('should fall back to default dependencies when not provided', () => {
    registerCommitCommand(program);
    
    const commitCommand = program.commands.find(cmd => cmd.name() === 'commit');
    expect(commitCommand).toBeDefined();
    
    // The command should still be registered even without injected dependencies
    expect(commitCommand?.name()).toBe('commit');
  });

  test('should handle top-level error in action', async () => {
    mockValidateEnvironment.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const options = { directory: '/test/path' };
    const deps = {
      configManager: mockConfigManager,
      serviceFactory: mockServiceFactory,
      logger: mockLogger,
      getConfig: mockGetConfig,
    };

    try {
      await executeCommitAction(options, deps);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Unexpected error');
    }

    expect(mockLogger.error).toHaveBeenCalledWith('Commit failed:', expect.any(Error));
  });

  test('should handle error with non-Error object', async () => {
    mockValidateEnvironment.mockImplementation(() => {
      throw 'String error';
    });

    const options = { directory: '/test/path' };
    const deps = {
      configManager: mockConfigManager,
      serviceFactory: mockServiceFactory,
      logger: mockLogger,
      getConfig: mockGetConfig,
    };

    try {
      await executeCommitAction(options, deps);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBe('String error');
    }

    expect(mockLogger.error).toHaveBeenCalledWith('Commit failed:', 'String error');
  });

  test('should create services with correct options', async () => {
    mockValidateEnvironment.mockImplementation(() => ({
      valid: true,
      errors: [],
      warnings: [],
    }));

    const options = { directory: '/test/path', verbose: true, quiet: false };
    const deps = {
      configManager: mockConfigManager,
      serviceFactory: mockServiceFactory,
      logger: mockLogger,
      getConfig: mockGetConfig,
    };

    try {
      await executeCommitAction(options, deps);
    } catch (error) {
      // Expected to throw due to missing dependencies in test environment
    }

    // Verify that services are created with the correct options
    expect(mockServiceFactory.createLogger).toHaveBeenCalledWith({ verbose: true });
    expect(mockServiceFactory.createGitService).toHaveBeenCalledWith({ 
      verbose: true, 
      quiet: false 
    });
    expect(mockServiceFactory.createOllamaService).toHaveBeenCalledWith({ 
      verbose: true 
    });
    expect(mockServiceFactory.createPromptService).toHaveBeenCalledWith({ 
      verbose: true 
    });
  });

  test('should use provided logger for error handling when validation fails', async () => {
    const customLogger = {
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
    };

    mockValidateEnvironment.mockImplementation(() => ({
      valid: false,
      errors: ['Invalid directory'],
      warnings: [],
    }));

    const options = { directory: '/test/path' };
    const deps = {
      configManager: mockConfigManager,
      serviceFactory: mockServiceFactory,
      logger: customLogger,
      getConfig: mockGetConfig,
    };

    try {
      await executeCommitAction(options, deps);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Environment validation failed');
    }

    expect(customLogger.error).toHaveBeenCalledWith('Environment validation failed:');
    expect(customLogger.error).toHaveBeenCalledWith('  Invalid directory');
  });
}); 