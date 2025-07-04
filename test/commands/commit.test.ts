import { beforeAll, describe, expect, test } from 'bun:test';
import { CommitCommand } from '../../src/commands/commit';
import { Logger } from '../../src/utils/logger';
import { mockConfig } from '../setup';

describe('CommitCommand', () => {
  let commitCommand: CommitCommand;
  let logger: Logger;
  let mockGitService: any;
  let mockOllamaService: any;
  let mockPromptService: any;

  beforeAll(() => {
    logger = new Logger();
    logger.setVerbose(true);

    // Mock Git service
    mockGitService = {
      getChanges: () => ({
        diff: 'test diff',
        staged: true,
        stats: {},
        filesInfo:
          '📁 1 files changed:\n📄 test.js (modified) (+5 -2)\n\n📦 Version Changes:\n📦 package.json: Bumped version from 1.0.0 to 1.0.1',
      }),
      execCommand: (cmd: string) => {
        if (cmd.includes('git commit')) {
          return true;
        }
        return false;
      },
    };

    // Mock Ollama service
    mockOllamaService = {
      generateCommitMessage: async () => 'test commit message',
    };

    // Mock Prompt service
    mockPromptService = {
      getSystemPrompt: () => 'test system prompt',
      buildCommitPrompt: () => 'test full prompt',
      buildCommitPromptWithContext: async () => 'test context prompt',
      buildCommitPromptWithEmbeddings: async () => 'test embeddings prompt',
    };

    const mockConfigProvider = async () => ({
      ...mockConfig,
      autoCommit: false,
      autoStage: false,
      promptTemplate: 'default',
    });

    commitCommand = new CommitCommand(
      '/mock/repo',
      mockGitService,
      mockOllamaService,
      mockPromptService,
      logger,
      mockConfigProvider,
    );
  });

  test('should force autoStage to true when autoCommit is true', async () => {
    const options = {
      autoCommit: true,
      autoStage: false,
    };

    const config = await (commitCommand as any).buildConfig(options);
    expect(config.autoStage).toBe(true);
  });

  test('should respect autoStage when autoCommit is false', async () => {
    const options = {
      autoCommit: false,
      autoStage: false,
    };

    const config = await (commitCommand as any).buildConfig(options);
    expect(config.autoStage).toBe(false);
  });

  test('should validate prompt template against allowed values', async () => {
    const validOptions = {
      promptTemplate: 'simple',
    };

    const invalidOptions = {
      promptTemplate: 'invalid',
    };

    const validConfig = await (commitCommand as any).buildConfig(validOptions);
    expect(validConfig.promptTemplate).toBe('simple');

    const invalidConfig = await (commitCommand as any).buildConfig(invalidOptions);
    expect(invalidConfig.promptTemplate).toBe('default');
  });

  test('should not execute commit when autoCommit is false', async () => {
    const options = {
      autoCommit: false,
      autoStage: false,
    };

    // This test just verifies the configuration behavior
    const config = await (commitCommand as any).buildConfig(options);
    expect(config.autoCommit).toBe(false);
    expect(config.autoStage).toBe(false);
  });
});
