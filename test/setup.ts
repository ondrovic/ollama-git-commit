import { beforeAll, afterAll } from 'bun:test';
import * as path from 'path';
import * as os from 'os';

// Mock file system
export const mockFs = {
  files: new Map<string, string>(),
  dirs: new Set<string>(),
  
  async mkdir(dir: string, options?: { recursive: boolean }) {
    this.dirs.add(dir);
    if (options?.recursive) {
      const parts = dir.split(path.sep);
      let current = '';
      for (const part of parts) {
        current = current ? path.join(current, part) : part;
        this.dirs.add(current);
      }
    }
  },
  
  async writeFile(filePath: string, content: string) {
    this.files.set(filePath, content);
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    this.dirs.add(dir);
  },
  
  async readFile(filePath: string, encoding: string) {
    return this.files.get(filePath) || '';
  },
  
  async access(filePath: string) {
    if (this.files.has(filePath) || this.dirs.has(filePath)) {
      return;
    }
    throw new Error('File not found');
  },
  
  async rm(dir: string, options?: { recursive: boolean; force: boolean }) {
    if (options?.recursive) {
      for (const file of this.files.keys()) {
        if (file.startsWith(dir)) {
          this.files.delete(file);
        }
      }
      for (const d of this.dirs) {
        if (d.startsWith(dir)) {
          this.dirs.delete(d);
        }
      }
    }
  }
};

// Mock Git commands
export const mockGit = {
  async exec(cmd: string, args: string[]) {
    if (cmd === 'git') {
      if (args[0] === 'diff' && args[1] === '--staged') {
        return createMockGitDiff();
      }
      if (args[0] === 'status' && args[1] === '--porcelain') {
        return 'M  test.txt\n';
      }
    }
    return '';
  }
};

// Mock Ollama API responses
export const mockOllamaResponses = {
  models: {
    models: [
      { name: 'mistral:7b-instruct', modified_at: '2024-03-20T12:00:00Z' },
      { name: 'llama2:7b', modified_at: '2024-03-20T12:00:00Z' }
    ]
  },
  generate: {
    model: 'mistral:7b-instruct',
    response: 'feat: add new feature for improved performance',
    done: true
  },
  health: {
    status: 'ok'
  }
};

// Mock fetch for Ollama API calls
export function mockOllamaFetch() {
  const originalFetch = global.fetch;
  
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof URL ? input : new URL(input.toString());
    
    // Mock different endpoints
    if (url.pathname === '/api/tags') {
      return new Response(JSON.stringify(mockOllamaResponses.models));
    }
    
    if (url.pathname === '/api/generate') {
      return new Response(JSON.stringify(mockOllamaResponses.generate));
    }
    
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify(mockOllamaResponses.health));
    }
    
    // Default to original fetch for other requests
    return originalFetch(input, init);
  };
  
  return () => {
    global.fetch = originalFetch;
  };
}

// Mock configuration
export const mockConfig = {
  model: 'mistral:7b-instruct',
  host: 'http://localhost:11434',
  verbose: false,
  interactive: false,
  debug: false,
  autoStage: false,
  autoModel: false,
  promptFile: '/mock/prompt.txt',
  configFile: '/mock/config.json',
  timeouts: {
    connection: 1000,
    generation: 2000,
    modelPull: 3000,
  },
  useEmojis: false,
  promptTemplate: 'default',
};

// Helper function to create mock git diff
export function createMockGitDiff() {
  return `diff --git a/test.txt b/test.txt
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/test.txt
@@ -0,0 +1,1 @@
+Test content
`;
}

// Setup before all tests
beforeAll(async () => {
  // Setup Ollama API mocking
  mockOllamaFetch();
  
  // Create mock files
  await mockFs.writeFile(mockConfig.promptFile, 'Generate a commit message for the following changes:\n{{diff}}');
  await mockFs.writeFile(mockConfig.configFile, JSON.stringify(mockConfig, null, 2));
});

// Cleanup after all tests
afterAll(async () => {
  // Clean up mock files
  mockFs.files.clear();
  mockFs.dirs.clear();
});
