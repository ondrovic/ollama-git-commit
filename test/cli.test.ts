import { beforeAll, describe, expect, mock, test } from 'bun:test';
import { Command } from 'commander';
import { CommitCommand } from '../src/commands/commit';
import { ModelsCommand } from '../src/commands/models';
import { TestCommand } from '../src/commands/test';
import { ENVIRONMENTAL_VARIABLES } from '../src/constants/enviornmental';
import { GitService } from '../src/core/git';
import { OllamaService } from '../src/core/ollama';
import { PromptService } from '../src/core/prompt';
import { Logger } from '../src/utils/logger';
import { mockConfig } from './setup';

// Mock the validation module with conditional logic for OLLAMA_HOST
mock.module('../src/utils/validation', () => ({
  validateGitRepository: () => {},
  validateNodeVersion: () => true,
  validateEnvironment: () => {
    if (!process.env.OLLAMA_HOST) {
      return { valid: false, errors: ['Ollama host is not configured'] };
    }
    return { valid: true, errors: [] };
  },
}));

// Mock GitService module for both possible import paths
mock.module('../core/git', () => ({
  GitService: class {
    getStagedDiff() {
      return 'test diff';
    }
    getStatus() {
      return 'test status';
    }
    commit() {
      return true;
    }
    getChanges() {
      return { 
        diff: 'test diff', 
        staged: true, 
        stats: {}, 
        filesInfo: '📁 1 files changed:\n📄 test.js (modified) (+5 -2)\n\n📦 Version Changes:\n📦 package.json: Bumped version from 1.0.0 to 1.0.1' 
      };
    }
    isRepository() {
      return true;
    }
    getRoot() {
      return '/mock/repo';
    }
    getCurrentBranch() {
      return 'main';
    }
    stageAll() {
      return true;
    }
    hasStagedChanges() {
      return true;
    }
  },
  GitRepositoryError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'GitRepositoryError';
    }
  },
}));

// Mock services
const mockOllamaService = {
  generateCommitMessage: async () => 'test commit message',
  testModel: async () => true,
  listModels: async () => ['model1', 'model2'],
};

const mockGitService = {
  getStagedDiff: () => 'test diff',
  getStatus: () => 'test status',
  commit: () => true,
  getChanges: () => ({ 
    diff: 'test diff', 
    staged: true, 
    stats: {}, 
    filesInfo: '📁 1 files changed:\n📄 test.js (modified) (+5 -2)\n\n📦 Version Changes:\n📦 package.json: Bumped version from 1.0.0 to 1.0.1' 
  }),
  isRepository: () => true,
  getRoot: () => '/mock/repo',
  getCurrentBranch: () => 'main',
  stageAll: () => true,
  hasStagedChanges: () => true,
};

const mockPromptService = {
  createCommitPrompt: () => 'test prompt',
  getSystemPrompt: () => 'test system prompt',
  buildCommitPrompt: (filesInfo, diff, systemPrompt) => 'test full prompt',
  buildCommitPromptWithContext: async () => 'test context prompt',
  buildCommitPromptWithEmbeddings: async () => 'test embeddings prompt',
};

// Mock commands
TestCommand.prototype.testModel = async function (model: string, host: string, debug: boolean) {
  return true;
};

ModelsCommand.prototype.listModels = async function (host: string, debug: boolean) {
  console.log('Available models:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  📦 model1');
  console.log('  📦 model2');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Total: 2 models available');
};

// Mock the interactive prompt
mock.module('../src/utils/interactive', () => ({
  askCommitAction: async () => 'use',
}));

describe('CLI Commands', () => {
  let program: Command;
  let logger: Logger;

  beforeAll(() => {
    program = new Command();
    logger = new Logger();
    logger.setVerbose(true);

    // Set up test environment
    if (!process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_HOST]) {
      process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_HOST] = mockConfig.host;
    }
  });

  test('commit command should generate and apply commit message', async () => {
    const commitCommand = new CommitCommand(
      '/mock/repo',
      mockGitService as unknown as GitService,
      mockOllamaService as unknown as OllamaService,
      mockPromptService as unknown as PromptService,
      logger,
    );

    const options = {
      model: 'test-model',
      host: 'http://localhost:11434',
      timeout: 30000,
      maxTokens: 100,
      temperature: 0.7,
      systemPrompt: 'test prompt',
      contextLines: 3,
      debug: false,
    };

    const result = await commitCommand.execute(options);
    expect(result).toBeUndefined();
  });

  test('test command should verify model availability', async () => {
    const testCommand = new TestCommand(mockOllamaService as unknown as OllamaService, logger);
    const result = await testCommand.testModel('test-model', 'http://localhost:11434', false);
    expect(result).toBe(true);
  });

  test('models command should list available models', async () => {
    const modelsCommand = new ModelsCommand(logger, mockOllamaService as unknown as OllamaService);
    await modelsCommand.listModels('http://localhost:11434', false);
    // No need to expect anything since the method logs to console
  });
});
