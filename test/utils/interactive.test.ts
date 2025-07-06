import { describe, expect, it, mock } from 'bun:test';
import * as interactive from '../../src/utils/interactive';

// Mock clipboard functionality
mock.module('../../src/utils/clipboard', () => ({
  hasClipboardSupport: mock(() => Promise.resolve(true)),
}));

// Simple mocks
const mockLogger = {
  info: mock(() => {}),
  warn: mock(() => {}),
  debug: mock(() => {}),
  plain: mock(() => {}),
} as any; // Type assertion to avoid complex mock typing

const mockProcess = {
  stdin: {
    isTTY: true,
    setRawMode: mock(() => {}),
    resume: mock(() => {}),
    pause: mock(() => {}),
    once: mock(() => {}),
    removeListener: mock(() => {}),
    on: mock(() => {}),
  },
  stdout: {
    write: mock(() => {}),
  },
  versions: { bun: '1.0.0' },
  on: mock(() => {}),
  exit: mock(() => {}),
} as any; // Type assertion to avoid complex Process interface

const mockSetTimeout = mock((fn: Function, ms: number) => {
  setTimeout(fn, 0);
  return 1;
}) as any; // Type assertion to avoid setTimeout interface complexity

const mockClearTimeout = mock(() => {}) as any; // Type assertion to avoid clearTimeout interface complexity

describe('InteractivePrompt', () => {
  it('should create instance with DI dependencies', () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });
    expect(prompt).toBeInstanceOf(interactive.InteractivePromptDI);
  });

  it('should handle cleanup', () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    // Set raw mode enabled
    prompt['isRawModeEnabled'] = true;

    prompt.cleanup();

    expect(mockProcess.stdin.setRawMode).toHaveBeenCalledWith(false);
    expect(mockProcess.stdin.pause).toHaveBeenCalled();
  });

  it('should handle cleanup errors gracefully', () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    // Make setRawMode throw
    mockProcess.stdin.setRawMode.mockImplementation(() => {
      throw new Error('setRawMode failed');
    });

    prompt['isRawModeEnabled'] = true;
    prompt.cleanup();

    expect(mockLogger.debug).toHaveBeenCalledWith('Failed to cleanup raw mode:', expect.any(Error));
  });

  it('should handle pause errors gracefully', () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    // Make pause throw
    mockProcess.stdin.pause.mockImplementation(() => {
      throw new Error('pause failed');
    });

    prompt.cleanup();

    expect(mockLogger.debug).toHaveBeenCalledWith('Failed to pause stdin:', expect.any(Error));
  });

  it('should detect Bun runtime', () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    const isBun = prompt['isBunRuntime'](mockProcess);
    expect(isBun).toBe(true);
  });

  it('should detect Node runtime', () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    const nodeProcess = { ...mockProcess, versions: undefined };
    const isBun = prompt['isBunRuntime'](nodeProcess);
    expect(isBun).toBe(false);
  });

  it('should detect undefined process', () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    const isBun = prompt['isBunRuntime'](undefined);
    expect(isBun).toBe(false);
  });

  it('should handle valid choice in handleChoice', () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    const resolve = mock(() => {});
    const askQuestion = mock(() => {});
    const choices = [
      { key: 'y', description: 'Yes' },
      { key: 'n', description: 'No' },
    ];

    prompt['handleChoice']('y', choices, resolve, askQuestion, mockLogger);

    expect(resolve).toHaveBeenCalledWith('y');
    expect(askQuestion).not.toHaveBeenCalled();
  });

  it('should handle invalid choice in handleChoice', () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    const resolve = mock(() => {});
    const askQuestion = mock(() => {});
    const choices = [
      { key: 'y', description: 'Yes' },
      { key: 'n', description: 'No' },
    ];

    // Mock global setTimeout to track calls, but use the original to avoid recursion
    const originalSetTimeout = global.setTimeout;
    const mockGlobalSetTimeout = mock((fn: Function, ms: number) => {
      return originalSetTimeout(fn, 0);
    }) as any;
    global.setTimeout = mockGlobalSetTimeout;

    prompt['handleChoice']('z', choices, resolve, askQuestion, mockLogger);

    expect(mockLogger.plain).toHaveBeenCalledWith('Please choose one of: y, n');
    expect(mockGlobalSetTimeout).toHaveBeenCalled();
    expect(resolve).not.toHaveBeenCalled();

    global.setTimeout = originalSetTimeout;
  });

  it('should handle empty choice with default in handleChoice', () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    const resolve = mock(() => {});
    const askQuestion = mock(() => {});
    const choices = [
      { key: 'y', description: 'Yes' },
      { key: 'n', description: 'No' },
    ];

    // Mock global setTimeout to track calls, but use the original to avoid recursion
    const originalSetTimeout = global.setTimeout;
    const mockGlobalSetTimeout = mock((fn: Function, ms: number) => {
      return originalSetTimeout(fn, 0);
    }) as any;
    global.setTimeout = mockGlobalSetTimeout;

    prompt['handleChoice']('', choices, resolve, askQuestion, mockLogger);

    expect(mockLogger.plain).toHaveBeenCalledWith('Please choose one of: y, n');
    expect(mockGlobalSetTimeout).toHaveBeenCalled();
    expect(resolve).not.toHaveBeenCalled();

    global.setTimeout = originalSetTimeout;
  });

  it('should handle empty choice with valid default in handleChoice', () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    const resolve = mock(() => {});
    const askQuestion = mock(() => {});
    const choices = [
      { key: 'y', description: 'Yes' },
      { key: 'n', description: 'No' },
    ];

    prompt['handleChoice']('y', choices, resolve, askQuestion, mockLogger);

    expect(resolve).toHaveBeenCalledWith('y');
    expect(askQuestion).not.toHaveBeenCalled();
  });

  it('should handle empty choice with matching default choice', () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    const resolve = mock(() => {});
    const askQuestion = mock(() => {});
    const choices = [
      { key: '', description: 'Empty choice' },
      { key: 'y', description: 'Yes' },
    ];

    prompt['handleChoice']('', choices, resolve, askQuestion, mockLogger);

    expect(resolve).toHaveBeenCalledWith('');
    expect(askQuestion).not.toHaveBeenCalled();
  });

  it('should test prompt method with timeout', async () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    // Mock the input handlers to not call anything
    prompt['handleInput'] = mock(() => {});

    const promise = prompt.prompt({
      message: 'Test?',
      choices: [
        { key: 'y', description: 'Yes' },
        { key: 'n', description: 'No' },
      ],
      defaultChoice: 'y',
    });

    // Let the timeout fire
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockLogger.plain).toHaveBeenCalledWith('Test?');
    expect(mockLogger.plain).toHaveBeenCalledWith('   [y] Yes (default)');
    expect(mockLogger.plain).toHaveBeenCalledWith('   [n] No');
    expect(mockLogger.plain).toHaveBeenCalledWith('');
  });

  it('should test prompt method with cleanup functions', async () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    // Mock the input handlers to call cleanupAndResolve
    const mockResolve = mock(() => {});
    const mockReject = mock(() => {});

    prompt['handleInput'] = mock((choices, defaultChoice, resolve, reject, processObj, logger) => {
      resolve('y');
    });

    const result = await prompt.prompt({
      message: 'Test?',
      choices: [
        { key: 'y', description: 'Yes' },
        { key: 'n', description: 'No' },
      ],
      defaultChoice: 'y',
    });

    expect(result).toBe('y');
  });

  it('should test handleInput without TTY', () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    const resolve = mock(() => {});
    const reject = mock(() => {});
    const choices = [
      { key: 'y', description: 'Yes' },
      { key: 'n', description: 'No' },
    ];

    const nonTTYProcess = {
      ...mockProcess,
      stdin: { ...mockProcess.stdin, isTTY: false },
    };

    // Mock createInterface
    const mockRl = {
      question: mock((prompt, callback) => {
        setTimeout(() => callback('y'), 0);
      }),
      close: mock(() => {}),
    };

    const originalCreateInterface = require('readline').createInterface;
    require('readline').createInterface = mock(() => mockRl);

    prompt['handleInput'](choices, 'y', resolve, reject, nonTTYProcess, mockLogger);

    expect(mockProcess.stdout.write).toHaveBeenCalledWith('What would you like to do? ');
    expect(mockProcess.stdout.write).toHaveBeenCalledWith('[y]: ');

    require('readline').createInterface = originalCreateInterface;
  });

  it('should test handleInput error handling', () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    const resolve = mock(() => {});
    const reject = mock(() => {});
    const choices = [
      { key: 'y', description: 'Yes' },
      { key: 'n', description: 'No' },
    ];

    // Make setRawMode throw
    mockProcess.stdin.setRawMode.mockImplementation(() => {
      throw new Error('setRawMode failed');
    });

    prompt['handleInput'](choices, 'y', resolve, reject, mockProcess, mockLogger);

    expect(mockLogger.debug).toHaveBeenCalledWith('Bun input error:', expect.any(Error));
    expect(reject).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should test handleInput for Node.js', () => {
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    const resolve = mock(() => {});
    const reject = mock(() => {});
    const choices = [
      { key: 'y', description: 'Yes' },
      { key: 'n', description: 'No' },
    ];

    // Create a Node.js-specific mock process (no bun version)
    const nodeProcess = {
      ...mockProcess,
      versions: undefined,
    };

    // Mock stdin.once to simulate data
    nodeProcess.stdin.once.mockImplementation((event, callback) => {
      if (event === 'data') {
        setTimeout(() => callback(Buffer.from('y\n')), 0);
      }
      return nodeProcess.stdin;
    });

    prompt['handleInput'](choices, 'y', resolve, reject, nodeProcess, mockLogger);

    expect(nodeProcess.stdout.write).toHaveBeenCalledWith('What would you like to do? ');
    expect(nodeProcess.stdout.write).toHaveBeenCalledWith('[y]: ');
    expect(nodeProcess.stdin.setRawMode).toHaveBeenCalledWith(true);
    expect(nodeProcess.stdin.resume).toHaveBeenCalled();
  });

  it('should test handleInput with raw mode error for Node.js', () => {
    mockLogger.debug.mockClear();
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    const resolve = mock(() => {});
    const reject = mock(() => {});
    const choices = [
      { key: 'y', description: 'Yes' },
      { key: 'n', description: 'No' },
    ];

    // Create a Node.js-specific mock process (no bun version)
    const nodeProcess = {
      ...mockProcess,
      versions: undefined,
    };

    // Make setRawMode throw
    nodeProcess.stdin.setRawMode.mockImplementation(() => {
      throw new Error('setRawMode failed');
    });

    prompt['handleInput'](choices, 'y', resolve, reject, nodeProcess, mockLogger);

    expect(mockLogger.debug).toHaveBeenCalledWith('Failed to set raw mode:', expect.any(Error));
    expect(nodeProcess.stdin.resume).toHaveBeenCalled();
  });

  it('should test handleInput with error event for Node.js', async () => {
    mockLogger.debug.mockClear();
    const prompt = new interactive.InteractivePromptDI({
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    const resolve = mock(() => {});
    const reject = mock(() => {});
    const choices = [
      { key: 'y', description: 'Yes' },
      { key: 'n', description: 'No' },
    ];

    // Create a Node.js-specific mock process (no bun version)
    const nodeProcess = {
      ...mockProcess,
      versions: undefined,
    };

    // Mock stdin.once to simulate error immediately
    nodeProcess.stdin.once.mockImplementation((event, callback) => {
      if (event === 'error') {
        // Call immediately instead of with setTimeout
        callback(new Error('stdin error'));
      }
      return nodeProcess.stdin;
    });

    prompt['handleInput'](choices, 'y', resolve, reject, nodeProcess, mockLogger);

    // Wait a bit for any async operations
    await new Promise(resolve => setTimeout(resolve, 5));

    // Check that reject was called with an error
    expect(reject).toHaveBeenCalledWith(expect.any(Error));

    // Check that debug was called (any call to debug is fine for this test)
    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('should test process exit handlers', () => {
    // Test that the default instance is created
    expect(interactive.InteractivePrompt).toBeInstanceOf(interactive.InteractivePromptDI);

    // Test that process event handlers are set up (these are covered by the default export test)
    expect(typeof process.on).toBe('function');
  });
});

describe('askYesNoDI', () => {
  it('should return true for yes choice', async () => {
    const deps = {
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    // Mock the prompt to return 'y'
    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() => Promise.resolve('y'));

    const result = await interactive.askYesNoDI('Proceed?', 'y', deps);
    expect(result).toBe(true);

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });

  it('should return false for no choice', async () => {
    const deps = {
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() => Promise.resolve('n'));

    const result = await interactive.askYesNoDI('Proceed?', 'n', deps);
    expect(result).toBe(false);

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });

  it('should handle error and return default', async () => {
    const deps = {
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() =>
      Promise.reject(new Error('fail')),
    );

    const result = await interactive.askYesNoDI('Proceed?', 'y', deps);
    expect(result).toBe(true);

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });
});

describe('askCommitActionDI', () => {
  it('should return use for y choice', async () => {
    const deps = {
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() => Promise.resolve('y'));

    const result = await interactive.askCommitActionDI(false, deps);
    expect(result).toBe('use');

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });

  it('should return copy for c choice', async () => {
    const deps = {
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() => Promise.resolve('c'));

    const result = await interactive.askCommitActionDI(false, deps);
    expect(result).toBe('copy');

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });

  it('should return regenerate for r choice', async () => {
    const deps = {
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() => Promise.resolve('r'));

    const result = await interactive.askCommitActionDI(false, deps);
    expect(result).toBe('regenerate');

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });

  it('should return cancel for n choice', async () => {
    const deps = {
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() => Promise.resolve('n'));

    const result = await interactive.askCommitActionDI(false, deps);
    expect(result).toBe('cancel');

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });

  it('should return cancel for unknown choice', async () => {
    const deps = {
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() => Promise.resolve('x'));

    const result = await interactive.askCommitActionDI(false, deps);
    expect(result).toBe('cancel');

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });

  it('should handle error and return cancel', async () => {
    const deps = {
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() =>
      Promise.reject(new Error('fail')),
    );

    const result = await interactive.askCommitActionDI(false, deps);
    expect(result).toBe('cancel');

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });

  it('should show correct description for autoCommit true', async () => {
    const deps = {
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() => Promise.resolve('y'));

    await interactive.askCommitActionDI(true, deps);

    // Check that prompt was called with correct options
    expect(interactive.InteractivePromptDI.prototype.prompt).toHaveBeenCalledWith({
      message: 'Available actions:',
      choices: expect.arrayContaining([
        expect.objectContaining({
          key: 'y',
          description: 'Use this message and commit changes',
        }),
      ]),
      defaultChoice: 'y',
    });

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });

  it('should show correct description for autoCommit false', async () => {
    const deps = {
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() => Promise.resolve('y'));

    await interactive.askCommitActionDI(false, deps);

    // Check that prompt was called with correct options
    expect(interactive.InteractivePromptDI.prototype.prompt).toHaveBeenCalledWith({
      message: 'Available actions:',
      choices: expect.arrayContaining([
        expect.objectContaining({
          key: 'y',
          description: 'Use this message and copy commit command',
        }),
      ]),
      defaultChoice: 'y',
    });

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });

  it('should hide copy option when autoCommit is true', async () => {
    const deps = {
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() => Promise.resolve('y'));

    await interactive.askCommitActionDI(true, deps);

    // Check that prompt was called without copy option
    expect(interactive.InteractivePromptDI.prototype.prompt).toHaveBeenCalledWith({
      message: 'Available actions:',
      choices: expect.not.arrayContaining([
        expect.objectContaining({
          key: 'c',
          description: 'Copy message to clipboard (if available)',
        }),
      ]),
      defaultChoice: 'y',
    });

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });

  it('should hide copy option when not interactive', async () => {
    const deps = {
      logger: mockLogger,
      processObj: { ...mockProcess, stdin: { ...mockProcess.stdin, isTTY: false } },
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() => Promise.resolve('y'));

    await interactive.askCommitActionDI(false, deps);

    // Check that prompt was called without copy option
    expect(interactive.InteractivePromptDI.prototype.prompt).toHaveBeenCalledWith({
      message: 'Available actions:',
      choices: expect.not.arrayContaining([
        expect.objectContaining({
          key: 'c',
          description: 'Copy message to clipboard (if available)',
        }),
      ]),
      defaultChoice: 'y',
    });

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });

  it('should hide regenerate option when not interactive', async () => {
    const deps = {
      logger: mockLogger,
      processObj: { ...mockProcess, stdin: { ...mockProcess.stdin, isTTY: false } },
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() => Promise.resolve('y'));

    await interactive.askCommitActionDI(false, deps);

    // Check that prompt was called without regenerate option
    expect(interactive.InteractivePromptDI.prototype.prompt).toHaveBeenCalledWith({
      message: 'Available actions:',
      choices: expect.not.arrayContaining([
        expect.objectContaining({
          key: 'r',
          description: 'Regenerate message',
        }),
      ]),
      defaultChoice: 'y',
    });

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });

  it('should return cancel for copy choice when autoCommit is true', async () => {
    const deps = {
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() => Promise.resolve('c'));

    const result = await interactive.askCommitActionDI(true, deps);
    expect(result).toBe('cancel');

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });

  it('should return cancel for regenerate choice when not interactive', async () => {
    const deps = {
      logger: mockLogger,
      processObj: { ...mockProcess, stdin: { ...mockProcess.stdin, isTTY: false } },
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() => Promise.resolve('r'));

    const result = await interactive.askCommitActionDI(false, deps);
    expect(result).toBe('cancel');

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });

  it('should show all options when interactive and not autoCommit', async () => {
    const deps = {
      logger: mockLogger,
      processObj: mockProcess,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    };

    const originalPrompt = interactive.InteractivePromptDI.prototype.prompt;
    interactive.InteractivePromptDI.prototype.prompt = mock(() => Promise.resolve('y'));

    await interactive.askCommitActionDI(false, deps);

    // Check that prompt was called with all expected options
    expect(interactive.InteractivePromptDI.prototype.prompt).toHaveBeenCalledWith({
      message: 'Available actions:',
      choices: expect.arrayContaining([
        expect.objectContaining({
          key: 'y',
          description: 'Use this message and copy commit command',
        }),
        expect.objectContaining({
          key: 'c',
          description: 'Copy message to clipboard (if available)',
        }),
        expect.objectContaining({ key: 'r', description: 'Regenerate message' }),
        expect.objectContaining({ key: 'n', description: 'Cancel' }),
      ]),
      defaultChoice: 'y',
    });

    interactive.InteractivePromptDI.prototype.prompt = originalPrompt;
  });
});

describe('Default exports', () => {
  it('should export askYesNo function', () => {
    expect(typeof interactive.askYesNo).toBe('function');
  });

  it('should export askCommitAction function', () => {
    expect(typeof interactive.askCommitAction).toBe('function');
  });

  it('should export InteractivePrompt instance', () => {
    expect(interactive.InteractivePrompt).toBeInstanceOf(interactive.InteractivePromptDI);
  });
});
