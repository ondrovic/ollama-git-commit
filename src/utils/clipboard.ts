import { spawn as realSpawn } from 'child_process';
import { Logger as RealLogger } from './logger';

interface ClipboardTool {
  cmd: string;
  args?: string[];
  name: string;
  test?: () => Promise<boolean>;
}

const clipboardTools: ClipboardTool[] = [
  {
    cmd: 'pbcopy',
    name: 'macOS',
    test: async () => process.platform === 'darwin',
  },
  {
    cmd: 'xclip',
    args: ['-selection', 'clipboard'],
    name: 'Linux (X11)',
    test: async () => process.platform === 'linux' && process.env.DISPLAY !== undefined,
  },
  {
    cmd: 'wl-copy',
    name: 'Linux (Wayland)',
    test: async () => process.platform === 'linux' && process.env.WAYLAND_DISPLAY !== undefined,
  },
  {
    cmd: 'clip',
    name: 'Windows',
    test: async () => process.platform === 'win32',
  },
];

// Dependency-injectable clipboard logic
export async function copyToClipboardDI(
  text: string,
  spawn: typeof realSpawn,
  Logger: typeof RealLogger,
  timeoutMs = 5000,
): Promise<void> {
  if (!text || text.trim().length === 0) {
    Logger.warn('No text to copy to clipboard');
    return;
  }

  for (const tool of clipboardTools) {
    try {
      if (tool.test && !(await tool.test())) {
        continue;
      }
      const success = await tryClipboardToolDI(tool, text, spawn, Logger, timeoutMs);
      if (success) {
        Logger.success(`Message copied to clipboard (${tool.name})`);
        return;
      }
    } catch (error) {
      Logger.debug(`Failed to use ${tool.cmd}: ${error}`);
      continue;
    }
  }

  Logger.error('No clipboard tool found (pbcopy, xclip, wl-copy, or clip)');
  Logger.info('You can manually copy the commit message above');
}

export async function tryClipboardToolDI(
  tool: ClipboardTool,
  text: string,
  spawn: typeof realSpawn,
  Logger: typeof RealLogger,
  timeoutMs = 5000,
): Promise<boolean> {
  return new Promise(resolve => {
    try {
      const proc = spawn(tool.cmd, tool.args || [], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let errorOutput = '';

      proc.stderr.on('data', data => {
        errorOutput += data.toString();
      });

      proc.on('error', error => {
        Logger.debug(`${tool.cmd} error: ${error.message}`);
        resolve(false);
      });

      proc.on('close', code => {
        if (code === 0) {
          resolve(true);
        } else {
          Logger.debug(`${tool.cmd} exited with code ${code}: ${errorOutput}`);
          resolve(false);
        }
      });

      const timeout = setTimeout(() => {
        proc.kill();
        Logger.debug(`${tool.cmd} timed out`);
        resolve(false);
      }, timeoutMs);

      proc.on('close', () => {
        clearTimeout(timeout);
      });

      proc.stdin.write(text);
      proc.stdin.end();
    } catch (error) {
      Logger.debug(`Exception with ${tool.cmd}: ${error}`);
      resolve(false);
    }
  });
}

export async function getClipboardCapabilitiesDI(
  spawn: typeof realSpawn,
  Logger: typeof RealLogger,
  timeoutMs = 5000,
): Promise<string[]> {
  const available: string[] = [];
  for (const tool of clipboardTools) {
    try {
      if (tool.test && (await tool.test())) {
        const success = await tryClipboardToolDI(tool, 'test', spawn, Logger, timeoutMs);
        if (success) {
          available.push(tool.name);
        }
      }
    } catch {
      // Tool not available
    }
  }
  return available;
}

export async function hasClipboardSupportDI(
  spawn: typeof realSpawn,
  Logger: typeof RealLogger,
  timeoutMs = 5000,
): Promise<boolean> {
  const capabilities = await getClipboardCapabilitiesDI(spawn, Logger, timeoutMs);
  return capabilities.length > 0;
}

// Default exports using real spawn and Logger
export async function copyToClipboard(text: string) {
  return copyToClipboardDI(text, realSpawn, RealLogger);
}
export async function getClipboardCapabilities() {
  return getClipboardCapabilitiesDI(realSpawn, RealLogger);
}
export async function hasClipboardSupport() {
  return hasClipboardSupportDI(realSpawn, RealLogger);
}
