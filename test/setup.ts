/* istanbul ignore file */
// Bun global test setup file. Use with: bun test --preload ./test/setup.ts
// Only include helpers and lifecycle hooks needed for all tests.
import { afterAll, afterEach, beforeAll } from 'bun:test';
import { MODELS } from '../src/constants/models';
import { MockedFileSystem } from './mocks/MockedFileSystem';

// Global MockedConfig for all tests
export const MockedConfig = {
  model: MODELS.DEFAULT,
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
  models: [
    { name: MODELS.DEFAULT, size: 1234567890, modified_at: '2024-01-01T00:00:00Z' },
    { name: 'nomic-embed-text', size: 987654321, modified_at: '2024-01-01T00:00:00Z' },
  ],
  generate: {
    model: MODELS.DEFAULT,
    response: 'test commit message',
    done: true,
  },
  health: {
    status: 'ok',
  },
};

// Setup before all tests
beforeAll(async () => {
  // Create mock files
  await MockedFileSystem.readFile(MockedConfig.promptFile, 'utf-8').catch(async () => {
    await MockedFileSystem.access(MockedConfig.promptFile).catch(async () => {
      // Simulate file creation
    });
  });
});

// Global safety net: restore common globals after each test
const realFetch = global.fetch;
const realConsole = global.console;
const realProcess = global.process;
afterEach(() => {
  global.fetch = realFetch;
  global.console = realConsole;
  global.process = realProcess;
});

afterAll(async () => {
  // No-op for MockedFileSystem
});
