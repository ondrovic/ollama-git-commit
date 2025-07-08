import { beforeEach, describe, expect, it } from 'bun:test';
import { Command } from 'commander';
import { registerBenchmarkTestCommand } from '../../../../src/cli/commands/test/benchmark';

// Mocks
class MockConfigManager {
  async initialize() {}
  async getPrimaryModel() {
    return 'mock-model';
  }
}

class MockOllamaService {
  async generateCommitMessage(model, host, prompt, verbose) {
    // Simulate a fast response
    return 'Commit message';
  }
}

class MockServiceFactory {
  createOllamaService() {
    return new MockOllamaService();
  }
}

let loggerCalls: Record<string, any[]>;
let processExitCalled: boolean;
let getConfig: () => Promise<any>;

function mockLogger() {
  loggerCalls = {
    info: [],
    error: [],
    warn: [],
    success: [],
    rocket: [],
    sectionBox: [],
    plain: [],
  };
  return {
    info: (...args: any[]) => loggerCalls.info.push(args),
    error: (...args: any[]) => loggerCalls.error.push(args),
    warn: (...args: any[]) => loggerCalls.warn.push(args),
    success: (...args: any[]) => loggerCalls.success.push(args),
    rocket: (...args: any[]) => loggerCalls.rocket.push(args),
    sectionBox: (...args: any[]) => loggerCalls.sectionBox.push(args),
    plain: (...args: any[]) => loggerCalls.plain.push(args),
  };
}

describe('registerBenchmarkTestCommand', () => {
  let logger;
  let program;
  let configManager;
  let serviceFactory;

  beforeEach(() => {
    logger = mockLogger();
    program = new Command();
    getConfig = async () => ({ model: 'mock-model', host: 'http://localhost:11434' });
    serviceFactory = new MockServiceFactory();
    processExitCalled = false;
    (process as any).exit = () => {
      processExitCalled = true;
    };
  });

  it('should run all benchmarks successfully (model from config)', async () => {
    registerBenchmarkTestCommand(program, { getConfig, serviceFactory, logger });
    await program.parseAsync(['node', 'test', 'benchmark', '--runs', '2']);
    expect(loggerCalls.sectionBox.length).toBeGreaterThan(0);
    expect(loggerCalls.rocket.length).toBe(1);
    expect(processExitCalled).toBe(false);
  });

  it('should use model from options', async () => {
    registerBenchmarkTestCommand(program, { getConfig, serviceFactory, logger });
    await program.parseAsync([
      'node',
      'test',
      'benchmark',
      '--model',
      'option-model',
      '--runs',
      '1',
    ]);
    expect(loggerCalls.sectionBox.length).toBeGreaterThan(0);
    expect(loggerCalls.rocket.length).toBe(1);
    expect(processExitCalled).toBe(false);
  });

  it('should handle invalid runs value', async () => {
    registerBenchmarkTestCommand(program, { getConfig, serviceFactory, logger });
    await program.parseAsync(['node', 'test', 'benchmark', '--runs', '0']);
    expect(loggerCalls.error[0][0]).toBe('Invalid number of runs. Must be a positive integer.');
    expect(processExitCalled).toBe(true);
  });

  it('should handle some failed runs', async () => {
    class FailingOllamaService {
      callCount = 0;
      async generateCommitMessage() {
        this.callCount++;
        if (this.callCount === 2) throw new Error('fail');
        return 'Commit message';
      }
    }
    const failingServiceFactory = { createOllamaService: () => new FailingOllamaService() } as any;
    registerBenchmarkTestCommand(program, {
      getConfig,
      serviceFactory: failingServiceFactory,
      logger,
    });
    await program.parseAsync(['node', 'test', 'benchmark', '--runs', '2']);
    expect(loggerCalls.sectionBox.length).toBeGreaterThan(0);
    expect(
      loggerCalls.rocket.length +
        loggerCalls.success.length +
        loggerCalls.warn.length +
        loggerCalls.error.length,
    ).toBeGreaterThan(0);
    expect(processExitCalled).toBe(false);
  });

  it('should handle all failed runs', async () => {
    class AllFailOllamaService {
      async generateCommitMessage() {
        throw new Error('fail');
      }
    }
    const allFailServiceFactory = { createOllamaService: () => new AllFailOllamaService() } as any;
    registerBenchmarkTestCommand(program, {
      getConfig,
      serviceFactory: allFailServiceFactory,
      logger,
    });
    await program.parseAsync(['node', 'test', 'benchmark', '--runs', '2']);
    expect(loggerCalls.error.some(call => call[0] === 'No successful runs completed')).toBe(true);
    expect(processExitCalled).toBe(true);
  });

  it('should handle top-level error inside action handler', async () => {
    const throwingGetConfig = async () => {
      throw new Error('fail-inside-action');
    };
    registerBenchmarkTestCommand(program, { getConfig: throwingGetConfig, serviceFactory, logger });
    await program.parseAsync(['node', 'test', 'benchmark']);
    expect(loggerCalls.error.some(call => call[0] === 'Benchmark test failed:')).toBe(true);
    expect(processExitCalled).toBe(true);
  });
});
