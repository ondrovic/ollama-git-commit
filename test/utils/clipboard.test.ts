import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  copyToClipboardDI,
  getClipboardCapabilitiesDI,
  hasClipboardSupportDI,
} from '../../src/utils/clipboard';

// Mock Logger static methods
const loggerMethods = ['warn', 'error', 'debug', 'success', 'info'] as const;
const mockLogger: Record<string, any> = {};
for (const m of loggerMethods) {
  mockLogger[m] = mock(() => {});
}

// Mock child_process.spawn
const mockSpawn = mock(() => {
  const listeners: Record<string, Function[]> = { error: [], close: [], data: [] };
  const process = {
    stdin: {
      write: mock(() => {}),
      end: mock(() => {}),
    },
    stderr: {
      on: (event: string, cb: Function) => {
        (listeners[event] = listeners[event] || []).push(cb);
      },
    },
    on: (event: string, cb: Function) => {
      (listeners[event] = listeners[event] || []).push(cb);
    },
    kill: mock(() => {}),
    emit: (event: string, ...args: any[]) => {
      (listeners[event] || []).forEach(cb => cb(...args));
    },
  };
  return process;
});

// Mock process.platform and environment variables
const originalPlatform = process.platform;
const originalEnv = { ...process.env };

beforeEach(() => {
  mockSpawn.mockReset();
  for (const m of loggerMethods) {
    mockLogger[m].mockReset();
  }
});

afterEach(() => {
  process.platform = originalPlatform;
  process.env = { ...originalEnv };
});

describe('copyToClipboardDI', () => {
  test('warns if text is empty', async () => {
    await copyToClipboardDI('', mockSpawn, mockLogger);
    expect(mockLogger.warn).toHaveBeenCalledWith('No text to copy to clipboard');
  });

  test('warns if text is only whitespace', async () => {
    await copyToClipboardDI('   ', mockSpawn, mockLogger);
    expect(mockLogger.warn).toHaveBeenCalledWith('No text to copy to clipboard');
  });

  test('tries macOS tool on darwin platform', async () => {
    process.platform = 'darwin';
    mockSpawn.mockReturnValue({
      stdin: { write: mock(() => {}), end: mock(() => {}) },
      stderr: { on: mock(() => {}) },
      on: mock((event: string, cb: Function) => {
        if (event === 'close') setTimeout(() => cb(0), 0);
      }),
      kill: mock(() => {}),
    });

    await copyToClipboardDI('test text', mockSpawn, mockLogger);
    expect(mockSpawn).toHaveBeenCalledWith('pbcopy', [], expect.any(Object));
    expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('macOS'));
  });

  test('tries Linux X11 tool on linux with DISPLAY', async () => {
    process.platform = 'linux';
    process.env.DISPLAY = ':0';
    mockSpawn.mockReturnValue({
      stdin: { write: mock(() => {}), end: mock(() => {}) },
      stderr: { on: mock(() => {}) },
      on: mock((event: string, cb: Function) => {
        if (event === 'close') setTimeout(() => cb(0), 0);
      }),
      kill: mock(() => {}),
    });

    await copyToClipboardDI('test text', mockSpawn, mockLogger);
    expect(mockSpawn).toHaveBeenCalledWith(
      'xclip',
      ['-selection', 'clipboard'],
      expect.any(Object),
    );
    expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('Linux (X11)'));
  });

  test('tries Linux Wayland tool on linux with WAYLAND_DISPLAY', async () => {
    process.platform = 'linux';
    process.env.WAYLAND_DISPLAY = 'wayland-0';
    mockSpawn.mockReturnValue({
      stdin: { write: mock(() => {}), end: mock(() => {}) },
      stderr: { on: mock(() => {}) },
      on: mock((event: string, cb: Function) => {
        if (event === 'close') setTimeout(() => cb(0), 0);
      }),
      kill: mock(() => {}),
    });

    await copyToClipboardDI('test text', mockSpawn, mockLogger);
    expect(mockSpawn).toHaveBeenCalledWith('wl-copy', [], expect.any(Object));
    expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('Linux (Wayland)'));
  });

  test('tries Windows tool on win32 platform', async () => {
    process.platform = 'win32';
    mockSpawn.mockReturnValue({
      stdin: { write: mock(() => {}), end: mock(() => {}) },
      stderr: { on: mock(() => {}) },
      on: mock((event: string, cb: Function) => {
        if (event === 'close') setTimeout(() => cb(0), 0);
      }),
      kill: mock(() => {}),
    });

    await copyToClipboardDI('test text', mockSpawn, mockLogger);
    expect(mockSpawn).toHaveBeenCalledWith('clip', [], expect.any(Object));
    expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('Windows'));
  });

  test('handles spawn error', async () => {
    process.platform = 'darwin';
    mockSpawn.mockImplementation(() => {
      throw new Error('spawn failed');
    });

    await copyToClipboardDI('test text', mockSpawn, mockLogger);
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Exception with pbcopy'));
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('No clipboard tool found'),
    );
  });

  test('handles process error event', async () => {
    process.platform = 'darwin';
    const mockProcess = {
      stdin: { write: mock(() => {}), end: mock(() => {}) },
      stderr: { on: mock(() => {}) },
      on: mock((event: string, cb: Function) => {
        if (event === 'error') setTimeout(() => cb(new Error('process error')), 0);
      }),
      kill: mock(() => {}),
    };
    mockSpawn.mockReturnValue(mockProcess);

    await copyToClipboardDI('test text', mockSpawn, mockLogger);
    expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('pbcopy error'));
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('No clipboard tool found'),
    );
  });

  test('handles process close with non-zero code', async () => {
    process.platform = 'darwin';
    const mockProcess = {
      stdin: { write: mock(() => {}), end: mock(() => {}) },
      stderr: { on: mock(() => {}) },
      on: mock((event: string, cb: Function) => {
        if (event === 'close') setTimeout(() => cb(1), 0);
      }),
      kill: mock(() => {}),
    };
    mockSpawn.mockReturnValue(mockProcess);

    await copyToClipboardDI('test text', mockSpawn, mockLogger);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('pbcopy exited with code 1'),
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('No clipboard tool found'),
    );
  });

  test('handles timeout', async () => {
    process.platform = 'darwin';
    const mockProcess = {
      stdin: { write: mock(() => {}), end: mock(() => {}) },
      stderr: { on: mock(() => {}) },
      on: mock(() => {}), // Never call close
      kill: mock(() => {}),
    };
    mockSpawn.mockReturnValue(mockProcess);

    await copyToClipboardDI('test text', mockSpawn, mockLogger, 20);
    // Wait for timeout
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('pbcopy timed out'));
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('No clipboard tool found'),
    );
  });

  test('logs error when no tools work', async () => {
    process.platform = 'unsupported';
    await copyToClipboardDI('test text', mockSpawn, mockLogger);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('No clipboard tool found'),
    );
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('manually copy'));
  });

  test('continues to next tool when first tool test fails', async () => {
    process.platform = 'linux';
    process.env.DISPLAY = ':0';
    process.env.WAYLAND_DISPLAY = 'wayland-0';

    // First call to spawn should fail (for xclip), second should succeed (for wl-copy)
    let callCount = 0;
    mockSpawn.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First tool (xclip) fails
        throw new Error('xclip not available');
      } else {
        // Second tool (wl-copy) succeeds
        return {
          stdin: { write: mock(() => {}), end: mock(() => {}) },
          stderr: { on: mock(() => {}) },
          on: mock((event: string, cb: Function) => {
            if (event === 'close') setTimeout(() => cb(0), 0);
          }),
          kill: mock(() => {}),
        };
      }
    });

    await copyToClipboardDI('test text', mockSpawn, mockLogger);
    // Verify that spawn was called twice (once for xclip, once for wl-copy)
    expect(mockSpawn).toHaveBeenCalledTimes(2);
    expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('Linux (Wayland)'));
  });
});

describe('getClipboardCapabilitiesDI', () => {
  test('returns available tools for macOS', async () => {
    process.platform = 'darwin';
    mockSpawn.mockReturnValue({
      stdin: { write: mock(() => {}), end: mock(() => {}) },
      stderr: { on: mock(() => {}) },
      on: mock((event: string, cb: Function) => {
        if (event === 'close') setTimeout(() => cb(0), 0);
      }),
      kill: mock(() => {}),
    });

    const result = await getClipboardCapabilitiesDI(mockSpawn, mockLogger);
    expect(result).toContain('macOS');
  });

  test('returns empty array when no tools work', async () => {
    process.platform = 'unsupported';
    const result = await getClipboardCapabilitiesDI(mockSpawn, mockLogger);
    expect(result).toEqual([]);
  });

  test('handles tool test throwing error', async () => {
    process.platform = 'darwin';
    // Mock spawn to throw an error when called
    mockSpawn.mockImplementation(() => {
      throw new Error('spawn failed');
    });

    const result = await getClipboardCapabilitiesDI(mockSpawn, mockLogger);
    expect(result).toEqual([]);
  });
});

describe('hasClipboardSupportDI', () => {
  test('returns true when tools are available', async () => {
    process.platform = 'darwin';
    mockSpawn.mockReturnValue({
      stdin: { write: mock(() => {}), end: mock(() => {}) },
      stderr: { on: mock(() => {}) },
      on: mock((event: string, cb: Function) => {
        if (event === 'close') setTimeout(() => cb(0), 0);
      }),
      kill: mock(() => {}),
    });

    const result = await hasClipboardSupportDI(mockSpawn, mockLogger);
    expect(result).toBe(true);
  });

  test('returns false when no tools are available', async () => {
    process.platform = 'unsupported';
    const result = await hasClipboardSupportDI(mockSpawn, mockLogger);
    expect(result).toBe(false);
  });
});

// Test the default exports for function coverage
import {
  copyToClipboard,
  getClipboardCapabilities,
  hasClipboardSupport,
} from '../../src/utils/clipboard';

describe('clipboard default exports', () => {
  test('copyToClipboard does not throw on empty', async () => {
    await expect(copyToClipboard('')).resolves.toBeUndefined();
  });

  test('getClipboardCapabilities returns array', async () => {
    const result = await getClipboardCapabilities();
    expect(Array.isArray(result)).toBe(true);
  });

  test('hasClipboardSupport returns boolean', async () => {
    const result = await hasClipboardSupport();
    expect(typeof result).toBe('boolean');
  });
});
