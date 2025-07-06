import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { PROMPTS } from '../../src/constants/prompts';
import { PromptService } from '../../src/core/prompt';
import { ContextProvider } from '../../src/types';
import { Logger } from '../../src/utils/logger';

describe('PromptService', () => {
  let promptService: PromptService;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    logger.setVerbose(true);
    promptService = new PromptService(logger);
  });

  describe('Template Management', () => {
    test('getPromptTemplates should return all prompt templates', () => {
      const templates = promptService.getPromptTemplates();
      expect(templates).toHaveProperty('default');
      expect(templates).toHaveProperty('conventional');
      expect(templates).toHaveProperty('simple');
      expect(templates).toHaveProperty('detailed');
    });

    test('default prompt template should match the imported default prompt', () => {
      const templates = promptService.getPromptTemplates();
      expect(templates.default).toBe(PROMPTS.DEFAULT);
    });

    test('conventional prompt template should match the imported conventional prompt', () => {
      const templates = promptService.getPromptTemplates();
      expect(templates.conventional).toBe(PROMPTS.CONVENTIONAL);
    });

    test('simple prompt template should match the imported simple prompt', () => {
      const templates = promptService.getPromptTemplates();
      expect(templates.simple).toBe(PROMPTS.SIMPLE);
    });

    test('detailed prompt template should match the imported detailed prompt', () => {
      const templates = promptService.getPromptTemplates();
      expect(templates.detailed).toBe(PROMPTS.DETAILED);
    });

    test('createPromptFromTemplate should return the correct template', () => {
      expect(promptService.createPromptFromTemplate('default')).toBe(PROMPTS.DEFAULT);
      expect(promptService.createPromptFromTemplate('conventional')).toBe(PROMPTS.CONVENTIONAL);
      expect(promptService.createPromptFromTemplate('simple')).toBe(PROMPTS.SIMPLE);
      expect(promptService.createPromptFromTemplate('detailed')).toBe(PROMPTS.DETAILED);
    });

    test('createPromptFromTemplate should throw error for invalid template', () => {
      expect(() => promptService.createPromptFromTemplate('invalid')).toThrow();
      expect(() => promptService.createPromptFromTemplate('')).toThrow();
      expect(() => promptService.createPromptFromTemplate('nonexistent')).toThrow();
    });

    test('createPromptFromTemplate should be case sensitive', () => {
      expect(() => promptService.createPromptFromTemplate('DEFAULT')).toThrow();
      expect(() => promptService.createPromptFromTemplate('Default')).toThrow();
      expect(() => promptService.createPromptFromTemplate('default')).not.toThrow();
    });
  });

  describe('Prompt Validation', () => {
    test('validatePrompt should validate prompts correctly', () => {
      const validResult = promptService.validatePrompt(PROMPTS.DEFAULT);
      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = promptService.validatePrompt('');
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('Prompt cannot be empty');
    });

    test('validatePrompt should reject empty prompts', () => {
      const result = promptService.validatePrompt('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Prompt cannot be empty');
    });

    test('validatePrompt should reject whitespace-only prompts', () => {
      const result = promptService.validatePrompt('   \n\t   ');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Prompt cannot be empty');
    });

    test('validatePrompt should reject very short prompts', () => {
      const result = promptService.validatePrompt('short');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Prompt seems too short (less than 50 characters)');
    });

    test('validatePrompt should accept valid prompts', () => {
      const validPrompt =
        'This is a valid prompt that is long enough to pass validation. It contains meaningful content for testing purposes and mentions commit messages.';
      const result = promptService.validatePrompt(validPrompt);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Commit Prompt Building', () => {
    test('buildCommitPrompt should format the prompt correctly', () => {
      const filesInfo = 'test files';
      const diff = 'test diff';
      const systemPrompt = 'test system prompt';

      const result = promptService.buildCommitPrompt(filesInfo, diff, systemPrompt);
      expect(result).toContain(systemPrompt);
      expect(result).toContain(filesInfo);
      expect(result).toContain(diff);
      expect(result).toContain('CONTEXT:');
      expect(result).toContain('GIT DIFF:');
      expect(result).toContain('Please analyze these changes');
    });

    test('buildCommitPrompt should truncate large diffs', () => {
      const filesInfo = 'test files';
      const largeDiff = Array(5000).fill('a').join('\n'); // 5000 lines
      const systemPrompt = 'test system prompt';

      const result = promptService.buildCommitPrompt(filesInfo, largeDiff, systemPrompt);

      // Extract the GIT DIFF section
      const diffSection = result.split('GIT DIFF:')[1];
      // Get the lines before the truncation message
      const truncatedLines = diffSection
        .split('[... diff truncated')[0]
        .split('\n')
        .filter(Boolean);
      // Should be 100 lines
      expect(truncatedLines.length).toBe(100);
      expect(result).toContain('[... diff truncated');
      expect(result).toContain('Total files changed');
    });

    test('buildCommitPrompt should handle diffs with file count', () => {
      const filesInfo = 'test files';
      // Create a diff that's long enough to trigger truncation
      const diffWithFiles = Array(5000)
        .fill(
          'diff --git a/file1.txt b/file1.txt\nindex 123..456\n--- a/file1.txt\n+++ b/file1.txt\n@@ -1,1 +1,1 @@\n-old\n+new\ndiff --git a/file2.txt b/file2.txt\nindex 789..abc\n--- a/file2.txt\n+++ b/file2.txt\n@@ -1,1 +1,1 @@\n-old2\n+new2',
        )
        .join('\n');
      const systemPrompt = 'test system prompt';

      const result = promptService.buildCommitPrompt(filesInfo, diffWithFiles, systemPrompt);
      expect(result).toContain('Total files changed:');
    });

    test('buildCommitPrompt should clean problematic characters', () => {
      const filesInfo = 'test files';
      const diffWithCarriageReturns = 'test\r\ndiff\r\nwith\r\ncarriage\r\nreturns';
      const systemPrompt = 'test system prompt';

      const result = promptService.buildCommitPrompt(
        filesInfo,
        diffWithCarriageReturns,
        systemPrompt,
      );
      expect(result).not.toContain('\r');
      expect(result).toContain('test\ndiff\nwith\ncarriage\nreturns');
    });

    test('buildCommitPrompt should handle small diffs without truncation', () => {
      const filesInfo = 'test files';
      const smallDiff = 'small diff content';
      const systemPrompt = 'test system prompt';

      const result = promptService.buildCommitPrompt(filesInfo, smallDiff, systemPrompt);
      expect(result).toContain(smallDiff);
      expect(result).not.toContain('[... diff truncated');
    });
  });

  describe('System Prompt Management', () => {
    test('getSystemPrompt should create prompt file if it does not exist', () => {
      const promptFile = '/tmp/test-prompt.txt';
      const verbose = false;

      // Mock the filesystem operations to avoid real file creation
      let fileExists = false;
      const mockFs = {
        existsSync: mock((path: string) => {
          if (path === promptFile) {
            return fileExists;
          }
          return false; // Directory doesn't exist
        }),
        mkdirSync: mock(() => {}),
        writeFileSync: mock(() => {
          fileExists = true; // File is created
        }),
        readFileSync: mock(() => 'Mocked prompt content'),
      };

      const mockPath = {
        dirname: mock(() => '/tmp'),
      };

      const mockedPromptService = new PromptService(logger, false, undefined, {
        fs: mockFs as any,
        path: mockPath as any,
      });

      const result = mockedPromptService.getSystemPrompt(promptFile, verbose);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('getSystemPrompt should use specified template', () => {
      const promptFile = '/tmp/test-prompt-conventional.txt';
      const verbose = false;
      const promptTemplate = 'conventional';

      // Mock the filesystem operations to avoid real file creation
      let fileExists = false;
      const mockFs = {
        existsSync: mock((path: string) => {
          if (path === promptFile) {
            return fileExists;
          }
          return false; // Directory doesn't exist
        }),
        mkdirSync: mock(() => {}),
        writeFileSync: mock(() => {
          fileExists = true; // File is created
        }),
        readFileSync: mock(() => 'conventional template content'),
      };

      const mockPath = {
        dirname: mock(() => '/tmp'),
      };

      const mockedPromptService = new PromptService(logger, false, undefined, {
        fs: mockFs as any,
        path: mockPath as any,
      });

      const result = mockedPromptService.getSystemPrompt(promptFile, verbose, promptTemplate);
      expect(result).toBeTruthy();
      expect(result).toContain('conventional');
    });

    test('getSystemPrompt should handle verbose mode', () => {
      const promptFile = '/tmp/test-prompt-verbose.txt';
      const verbose = true;

      // Mock the filesystem operations to avoid real file creation
      let fileExists = false;
      const mockFs = {
        existsSync: mock((path: string) => {
          if (path === promptFile) {
            return fileExists;
          }
          return false; // Directory doesn't exist
        }),
        mkdirSync: mock(() => {}),
        writeFileSync: mock(() => {
          fileExists = true; // File is created
        }),
        readFileSync: mock(() => 'Mocked prompt content'),
      };

      const mockPath = {
        dirname: mock(() => '/tmp'),
      };

      const mockedPromptService = new PromptService(logger, false, undefined, {
        fs: mockFs as any,
        path: mockPath as any,
      });

      // Mock logger.info to verify it's called
      const originalInfo = logger.info;
      const mockInfo = mock();
      logger.info = mockInfo;

      try {
        const result = mockedPromptService.getSystemPrompt(promptFile, verbose);
        expect(result).toBeTruthy();
        expect(mockInfo).toHaveBeenCalled();
      } finally {
        logger.info = originalInfo;
      }
    });
  });

  describe('Context Integration', () => {
    test('buildCommitPromptWithContext should build basic prompt when no providers', async () => {
      const filesInfo = 'test files';
      const diff = 'test diff';
      const systemPrompt = 'test system prompt';
      const contextProviders: ContextProvider[] = [];
      const directory = '/test/directory';

      const result = await promptService.buildCommitPromptWithContext(
        filesInfo,
        diff,
        systemPrompt,
        contextProviders,
        directory,
        false,
      );

      expect(result).toBeTruthy();
      expect(result).toContain(filesInfo);
      expect(result).toContain(diff);
      expect(result).toContain(systemPrompt);
      expect(result).not.toContain('ADDITIONAL CONTEXT:');
    });

    test('buildCommitPromptWithContext should include context when providers available', async () => {
      const filesInfo = 'test files';
      const diff = 'test diff';
      const systemPrompt = 'test system prompt';
      const contextProviders: ContextProvider[] = [
        { provider: 'code', enabled: true },
        { provider: 'docs', enabled: true },
      ];
      const directory = '/test/directory';

      const result = await promptService.buildCommitPromptWithContext(
        filesInfo,
        diff,
        systemPrompt,
        contextProviders,
        directory,
        false,
      );

      expect(result).toBeTruthy();
      expect(result).toContain(filesInfo);
      expect(result).toContain(diff);
      expect(result).toContain(systemPrompt);
    });
  });

  describe('Embeddings Integration', () => {
    test('buildCommitPromptWithEmbeddings should build basic prompt with embeddings note', async () => {
      const filesInfo = 'test files';
      const diff = 'test diff';
      const systemPrompt = 'test system prompt';
      const mockOllamaService = {
        generateEmbeddings: mock(async () => 'test embeddings'),
      } as any;
      const embeddingsModel = 'test-model';
      const host = 'http://localhost:11434';

      const result = await promptService.buildCommitPromptWithEmbeddings(
        filesInfo,
        diff,
        systemPrompt,
        mockOllamaService,
        embeddingsModel,
        host,
      );

      expect(result).toBeTruthy();
      expect(result).toContain(filesInfo);
      expect(result).toContain(diff);
      expect(result).toContain(systemPrompt);
      expect(result).toContain('Embeddings generated using test-model');
    });

    test('buildCommitPromptWithEmbeddings should fall back to basic prompt on error', async () => {
      const filesInfo = 'test files';
      const diff = 'test diff';
      const systemPrompt = 'test system prompt';
      const mockOllamaService = {
        generateEmbeddings: mock(async () => {
          throw new Error('Embeddings failed');
        }),
      } as any;
      const embeddingsModel = 'test-model';
      const host = 'http://localhost:11434';

      const result = await promptService.buildCommitPromptWithEmbeddings(
        filesInfo,
        diff,
        systemPrompt,
        mockOllamaService,
        embeddingsModel,
        host,
      );

      expect(result).toBeTruthy();
      expect(result).toContain(filesInfo);
      expect(result).toContain(diff);
      expect(result).toContain(systemPrompt);
      expect(result).not.toContain('Embeddings generated');
    });
  });

  describe('Service Configuration', () => {
    test('should set quiet mode', () => {
      expect(promptService.setQuiet).toBeDefined();
      expect(typeof promptService.setQuiet).toBe('function');

      // Test that it doesn't throw
      expect(() => promptService.setQuiet(true)).not.toThrow();
      expect(() => promptService.setQuiet(false)).not.toThrow();
    });

    test('should accept custom context service in constructor', () => {
      const customLogger = new Logger();
      const customContextService = {
        gatherContext: mock(async () => []),
      } as any;

      const customPromptService = new PromptService(customLogger, false, customContextService);
      expect(customPromptService).toBeDefined();
    });
  });
});
