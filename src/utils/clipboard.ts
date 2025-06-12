import { spawn } from 'child_process';
import { Logger } from './logger';

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
    test: async () => process.platform === 'darwin'
  },
  { 
    cmd: 'xclip', 
    args: ['-selection', 'clipboard'], 
    name: 'Linux (X11)',
    test: async () => process.platform === 'linux' && process.env.DISPLAY !== undefined
  },
  { 
    cmd: 'wl-copy', 
    name: 'Linux (Wayland)',
    test: async () => process.platform === 'linux' && process.env.WAYLAND_DISPLAY !== undefined
  },
  { 
    cmd: 'clip', 
    name: 'Windows',
    test: async () => process.platform === 'win32'
  },
];

export async function copyToClipboard(text: string): Promise<void> {
  if (!text || text.trim().length === 0) {
    Logger.warn('No text to copy to clipboard');
    return;
  }

  for (const tool of clipboardTools) {
    try {
      // Test if this tool is appropriate for the current platform
      if (tool.test && !(await tool.test())) {
        continue;
      }

      const success = await tryClipboardTool(tool, text);
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

async function tryClipboardTool(tool: ClipboardTool, text: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const proc = spawn(tool.cmd, tool.args || [], { 
        stdio: ['pipe', 'pipe', 'pipe'] 
      });

      let errorOutput = '';

      proc.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      proc.on('error', (error) => {
        Logger.debug(`${tool.cmd} error: ${error.message}`);
        resolve(false);
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          Logger.debug(`${tool.cmd} exited with code ${code}: ${errorOutput}`);
          resolve(false);
        }
      });

      // Set a timeout to avoid hanging
      const timeout = setTimeout(() => {
        proc.kill();
        Logger.debug(`${tool.cmd} timed out`);
        resolve(false);
      }, 5000);

      proc.on('close', () => {
        clearTimeout(timeout);
      });

      // Write the text to the process
      proc.stdin.write(text);
      proc.stdin.end();

    } catch (error) {
      Logger.debug(`Exception with ${tool.cmd}: ${error}`);
      resolve(false);
    }
  });
}

export async function getClipboardCapabilities(): Promise<string[]> {
  const available: string[] = [];

  for (const tool of clipboardTools) {
    try {
      if (tool.test && (await tool.test())) {
        const success = await tryClipboardTool(tool, 'test');
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

export async function hasClipboardSupport(): Promise<boolean> {
  const capabilities = await getClipboardCapabilities();
  return capabilities.length > 0;
}