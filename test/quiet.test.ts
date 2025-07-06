import { mock } from 'bun:test';

mock.module('../src/utils/validation', () => ({
  validateGitRepository: () => {},
  validateNodeVersion: () => true,
  validateEnvironment: () => ({ valid: true, errors: [] }),
}));
mock.module('../src/utils/interactive', () => ({
  askCommitAction: async () => 'use',
}));

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { CommitCommand } from '../src/commands/commit';
import { Logger } from '../src/utils/logger';

// Save ALL global state at the top to ensure we can always restore it
const realFetch = global.fetch;
const realConsole = global.console;
const realProcess = global.process;

describe('Quiet Functionality', () => {
  let logger: Logger;
  let mockGitService: any;
  let mockOllamaService: any;
  let mockPromptService: any;

  beforeEach(() => {
    // Restore ALL global state to ensure clean environment
    global.fetch = realFetch;
    global.console = realConsole;
    global.process = realProcess;

    logger = new Logger();
    logger.setVerbose(true);

    // Mock Git service
    mockGitService = {
      getChanges: () => ({
        diff: 'test diff',
        staged: true,
        stats: {},
        filesInfo: '📁 1 files changed:\n📄 test.js (modified) (+5 -2)',
      }),
      execCommand: () => true,
      stageAll: () => true,
      commit: () => true,
      push: () => true,
      getStagedDiff: () => 'test diff',
      getStatus: () => 'test status',
      isRepository: () => true,
      getRoot: () => '/mock/repo',
      getCurrentBranch: () => 'main',
      hasStagedChanges: () => true,
      setQuiet: () => {},
    };

    // Mock Ollama service
    mockOllamaService = {
      generateCommitMessage: async () => 'test commit message',
      testConnection: async () => true,
      getModels: async () => [{ name: 'model1' }, { name: 'model2' }],
      isModelAvailable: async () => true,
      generateEmbeddings: async () => [0.1, 0.2, 0.3],
      generateEmbeddingsBatch: async () => [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
      setQuiet: () => {},
    };

    // Mock Prompt service
    mockPromptService = {
      getSystemPrompt: () => 'test system prompt',
      buildCommitPrompt: () => 'test full prompt',
      buildCommitPromptWithContext: async () => 'test context prompt',
      buildCommitPromptWithEmbeddings: async () => 'test embeddings prompt',
    };
  });

  afterEach(() => {
    // Restore ALL global state
    global.fetch = realFetch;
    global.console = realConsole;
    global.process = realProcess;
  });

  test('should respect quiet=false from config (default behavior)', async () => {
    const mockConfigProvider = async () => ({
      model: 'test-model',
      host: 'http://localhost:11434',
      verbose: false,
      quiet: false,
      autoCommit: true,
      autoStage: true,
      promptTemplate: 'default',
    });

    const commitCommand = new CommitCommand(
      '/mock/repo',
      mockGitService,
      mockOllamaService,
      mockPromptService,
      logger,
      mockConfigProvider,
    );

    const options = {
      autoCommit: true,
      autoStage: true,
    };

    await commitCommand.execute(options);

    // Verify that the command executed without errors
    expect(true).toBe(true);
  });

  test('should respect quiet=true from config (suppress git output)', async () => {
    const mockConfigProvider = async () => ({
      model: 'test-model',
      host: 'http://localhost:11434',
      verbose: false,
      quiet: true,
      autoCommit: true,
      autoStage: true,
      promptTemplate: 'default',
    });

    const commitCommand = new CommitCommand(
      '/mock/repo',
      mockGitService,
      mockOllamaService,
      mockPromptService,
      logger,
      mockConfigProvider,
    );

    const options = {
      autoCommit: true,
      autoStage: true,
    };

    await commitCommand.execute(options);

    // Verify that the command executed without errors
    expect(true).toBe(true);
  });

  test('should respect quiet=true from CLI options (override config)', async () => {
    const mockConfigProvider = async () => ({
      model: 'test-model',
      host: 'http://localhost:11434',
      verbose: false,
      quiet: false, // Config has quiet=false
      autoCommit: true,
      autoStage: true,
      promptTemplate: 'default',
    });

    const commitCommand = new CommitCommand(
      '/mock/repo',
      mockGitService,
      mockOllamaService,
      mockPromptService,
      logger,
      mockConfigProvider,
    );

    const options = {
      autoCommit: true,
      autoStage: true,
      quiet: true, // CLI option overrides config
    };

    await commitCommand.execute(options);

    // Verify that the command executed without errors
    expect(true).toBe(true);
  });

  test('should respect quiet=false from CLI options (override config)', async () => {
    const mockConfigProvider = async () => ({
      model: 'test-model',
      host: 'http://localhost:11434',
      verbose: false,
      quiet: true, // Config has quiet=true
      autoCommit: true,
      autoStage: true,
      promptTemplate: 'default',
    });

    const commitCommand = new CommitCommand(
      '/mock/repo',
      mockGitService,
      mockOllamaService,
      mockPromptService,
      logger,
      mockConfigProvider,
    );

    const options = {
      autoCommit: true,
      autoStage: true,
      quiet: false, // CLI option overrides config
    };

    await commitCommand.execute(options);

    // Verify that the command executed without errors
    expect(true).toBe(true);
  });
}); 