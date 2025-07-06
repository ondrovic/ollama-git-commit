import { beforeEach, describe, expect, it } from 'bun:test';
import { Command } from 'commander';
import { getConfigKeys, registerKeysCommands } from '../../../../src/cli/commands/config/keys';
import { Logger } from '../../../../src/utils/logger';
import { MockedConfigManager } from '../../../mocks/MockedConfigManager';

let loggerTableCalls: any[] = [];
let loggerGroupCalls: any[] = [];
let loggerPlainCalls: any[] = [];
let loggerErrorCalls: any[] = [];
let processExitCalled = false;

function mockLogger() {
  Logger.table = (...args: any[]) => {
    loggerTableCalls.push(args);
  };
  Logger.group = async (...args: any[]) => {
    loggerGroupCalls.push(args);
    if (args[1]) await args[1]();
  };
  Logger.plain = (...args: any[]) => {
    loggerPlainCalls.push(args);
  };
  Logger.error = (...args: any[]) => {
    loggerErrorCalls.push(args);
  };
}

function mockProcessExit() {
  (process as any).exit = () => {
    processExitCalled = true;
  };
}

beforeEach(() => {
  loggerTableCalls = [];
  loggerGroupCalls = [];
  loggerPlainCalls = [];
  loggerErrorCalls = [];
  processExitCalled = false;
  mockLogger();
  mockProcessExit();
});

describe('registerKeysCommands', () => {
  it('should print simple key list (non-verbose)', async () => {
    const mockConfigManager = new MockedConfigManager(Logger);
    const program = new Command();
    registerKeysCommands(program, mockConfigManager);
    await program.parseAsync(['node', 'config', 'keys']);
    expect(loggerTableCalls.length).toBe(1);
    expect(loggerPlainCalls.some(call => call[0].includes('model'))).toBe(true);
    expect(
      loggerPlainCalls.some(
        call => call[0] === 'Usage: ollama-git-commit config set <key> <value>',
      ),
    ).toBe(true);
    expect(loggerPlainCalls.some(call => call[0] === '')).toBe(true);
    expect(loggerGroupCalls.length).toBe(0);
    expect(loggerErrorCalls.length).toBe(0);
    expect(processExitCalled).toBe(false);
  });

  it('should print detailed key info (verbose)', async () => {
    const mockConfigManager = new MockedConfigManager(Logger);
    const program = new Command();
    registerKeysCommands(program, mockConfigManager);
    await program.parseAsync(['node', 'config', 'keys', '--verbose']);
    expect(loggerTableCalls.length).toBe(1);
    expect(loggerGroupCalls.length).toBeGreaterThan(0);
    expect(loggerPlainCalls.some(call => call[0].includes('Description:'))).toBe(true);
    expect(
      loggerPlainCalls.some(
        call => call[0] === 'Usage: ollama-git-commit config set <key> <value>',
      ),
    ).toBe(true);
    expect(loggerPlainCalls.some(call => call[0] === '')).toBe(true);
    expect(loggerErrorCalls.length).toBe(0);
    expect(processExitCalled).toBe(false);
  });

  it('should handle errors and call process.exit', async () => {
    // Create a mock config manager that throws when getConfigKeys is called
    const mockConfigManager = new MockedConfigManager(Logger);
    const originalGetConfigKeys = mockConfigManager.getConfigKeys.bind(mockConfigManager);
    mockConfigManager.getConfigKeys = async () => {
      throw new Error('fail');
    };

    const program = new Command();
    registerKeysCommands(program, mockConfigManager);
    await program.parseAsync(['node', 'config', 'keys']);
    expect(loggerErrorCalls.length).toBeGreaterThan(0);
    expect(processExitCalled).toBe(true);
  });
});

describe('getConfigKeys', () => {
  it('should return all config keys with correct structure', () => {
    const keys = getConfigKeys();
    expect(Array.isArray(keys)).toBe(true);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key).toHaveProperty('key');
      expect(key).toHaveProperty('description');
      expect(key).toHaveProperty('type');
      expect(key).toHaveProperty('default');
    }
  });
});
