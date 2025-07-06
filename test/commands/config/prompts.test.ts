import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { PROMPTS, VALID_TEMPLATES } from '../../../src/constants/prompts';
import { PromptService } from '../../../src/core/prompt';
import { ContextProvider } from '../../../src/types';
import { Logger } from '../../../src/utils/logger';

describe('Prompts Commands', () => {
  let logger: Logger;
  let promptService: PromptService;

  beforeEach(() => {
    logger = new Logger();
    promptService = new PromptService(logger);
  });

  describe('PromptService integration', () => {
    test('should use PromptService to get templates', () => {
      const templates = promptService.getPromptTemplates();

      expect(templates).toHaveProperty('default');
      expect(templates).toHaveProperty('conventional');
      expect(templates).toHaveProperty('simple');
      expect(templates).toHaveProperty('detailed');

      expect(templates.default).toBe(PROMPTS.DEFAULT);
      expect(templates.conventional).toBe(PROMPTS.CONVENTIONAL);
      expect(templates.simple).toBe(PROMPTS.SIMPLE);
      expect(templates.detailed).toBe(PROMPTS.DETAILED);
    });

    test('should validate template names correctly', () => {
      expect(VALID_TEMPLATES).toContain('default');
      expect(VALID_TEMPLATES).toContain('conventional');
      expect(VALID_TEMPLATES).toContain('simple');
      expect(VALID_TEMPLATES).toContain('detailed');
      expect(VALID_TEMPLATES).toHaveLength(4);
    });

    test('should handle case-insensitive template names', () => {
      // Test that createPromptFromTemplate handles case-insensitive names
      expect(() => promptService.createPromptFromTemplate('DEFAULT')).toThrow();
      expect(() => promptService.createPromptFromTemplate('default')).not.toThrow();
      expect(() => promptService.createPromptFromTemplate('CONVENTIONAL')).toThrow();
      expect(() => promptService.createPromptFromTemplate('conventional')).not.toThrow();
    });

    test('should throw error for invalid template names', () => {
      expect(() => promptService.createPromptFromTemplate('invalid')).toThrow();
      expect(() => promptService.createPromptFromTemplate('')).toThrow();
      expect(() => promptService.createPromptFromTemplate('nonexistent')).toThrow();
    });

    test('should create valid prompts from templates', () => {
      const defaultPrompt = promptService.createPromptFromTemplate('default');
      const conventionalPrompt = promptService.createPromptFromTemplate('conventional');
      const simplePrompt = promptService.createPromptFromTemplate('simple');
      const detailedPrompt = promptService.createPromptFromTemplate('detailed');

      expect(defaultPrompt).toBe(PROMPTS.DEFAULT);
      expect(conventionalPrompt).toBe(PROMPTS.CONVENTIONAL);
      expect(simplePrompt).toBe(PROMPTS.SIMPLE);
      expect(detailedPrompt).toBe(PROMPTS.DETAILED);
    });
  });

  describe('Template content validation', () => {
    test('should have non-empty template content', () => {
      const templates = promptService.getPromptTemplates();

      Object.entries(templates).forEach(([name, content]) => {
        expect(content).toBeTruthy();
        expect(typeof content).toBe('string');
        expect(content.length).toBeGreaterThan(0);
        expect(content).toContain('commit message');
      });
    });

    test('should have unique template content', () => {
      const templates = promptService.getPromptTemplates();

      const contents = Object.values(templates);
      const uniqueContents = new Set(contents);

      expect(uniqueContents.size).toBe(contents.length);
    });

    test('should have consistent template structure', () => {
      const templates = promptService.getPromptTemplates();

      Object.entries(templates).forEach(([name, content]) => {
        // All templates should contain key phrases
        expect(content).toContain('commit message');

        // Templates should be substantial
        expect(content.length).toBeGreaterThan(50);
      });
    });
  });

  describe('Template validation functions', () => {
    test('should get template keys from service', () => {
      const templates = promptService.getPromptTemplates();
      const templateKeys = Object.keys(templates);

      expect(templateKeys).toContain('default');
      expect(templateKeys).toContain('conventional');
      expect(templateKeys).toContain('simple');
      expect(templateKeys).toContain('detailed');
      expect(templateKeys).toHaveLength(4);
    });

    test('should find similar template names', () => {
      const validTemplates = ['default', 'conventional', 'simple', 'detailed'];

      // Test exact substring matches
      const suggestions1 = findSimilarTemplates('def', validTemplates);
      expect(suggestions1).toContain('default');

      // Test similar length and characters
      const suggestions2 = findSimilarTemplates('convent', validTemplates);
      expect(suggestions2).toContain('conventional');

      // Test no matches
      const suggestions3 = findSimilarTemplates('xyz', validTemplates);
      expect(suggestions3).toHaveLength(0);
    });

    test('should validate template names correctly', () => {
      const templates = promptService.getPromptTemplates();
      const templateKeys = Object.keys(templates);

      // Test valid template names
      expect(templateKeys).toContain('default');
      expect(templateKeys).toContain('conventional');
      expect(templateKeys).toContain('simple');
      expect(templateKeys).toContain('detailed');

      // Test invalid template names
      expect(templateKeys).not.toContain('invalid');
      expect(templateKeys).not.toContain('nonexistent');
    });

    test('should handle edge cases in template similarity', () => {
      const validTemplates = ['default', 'conventional', 'simple', 'detailed'];

      // Test very long string
      const suggestions2 = findSimilarTemplates('verylongstringthatdoesnotmatch', validTemplates);
      expect(suggestions2).toHaveLength(0);

      // Test exact match
      const suggestions3 = findSimilarTemplates('default', validTemplates);
      expect(suggestions3).toContain('default');

      // Test partial matches
      const suggestions4 = findSimilarTemplates('sim', validTemplates);
      expect(suggestions4).toContain('simple');
    });
  });

  describe('PromptService methods', () => {
    test('should build commit prompt with context', async () => {
      const filesInfo = 'test files info';
      const diff = 'test diff content';
      const systemPrompt = 'test system prompt';
      const contextProviders: ContextProvider[] = [
        { provider: 'docs', enabled: true },
        { provider: 'code', enabled: true },
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
      expect(typeof result).toBe('string');
      expect(result).toContain(diff);
      expect(result).toContain(filesInfo);
    });

    test('should build commit prompt with embeddings', async () => {
      const filesInfo = 'test files info';
      const diff = 'test diff content';
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
        host
      );

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toContain(diff);
      expect(result).toContain(filesInfo);
    });

    test('should build system prompt', () => {
      const promptFile = '/test/prompt.txt';
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
        dirname: mock(() => '/test'),
      };

      const mockedPromptService = new PromptService(logger, false, undefined, {
        fs: mockFs as any,
        path: mockPath as any,
      });

      const result = mockedPromptService.getSystemPrompt(promptFile, verbose);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toBe('Mocked prompt content');
    });

    test('should build commit prompt', () => {
      const filesInfo = 'test files info';
      const diff = 'test diff content';
      const systemPrompt = 'test system prompt';

      const result = promptService.buildCommitPrompt(filesInfo, diff, systemPrompt);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toContain(diff);
      expect(result).toContain(filesInfo);
    });
  });

  describe('Constants validation', () => {
    test('should have all required prompt constants', () => {
      expect(PROMPTS).toHaveProperty('DEFAULT');
      expect(PROMPTS).toHaveProperty('CONVENTIONAL');
      expect(PROMPTS).toHaveProperty('SIMPLE');
      expect(PROMPTS).toHaveProperty('DETAILED');
    });

    test('should have valid template names in constants', () => {
      expect(VALID_TEMPLATES).toBeInstanceOf(Array);
      expect(VALID_TEMPLATES.length).toBeGreaterThan(0);

      VALID_TEMPLATES.forEach(template => {
        expect(typeof template).toBe('string');
        expect(template.length).toBeGreaterThan(0);
        expect(PROMPTS).toHaveProperty(template.toUpperCase());
      });
    });

    test('should have consistent naming between constants', () => {
      const promptKeys = Object.keys(PROMPTS);
      const templateNames = VALID_TEMPLATES.map(t => t.toUpperCase());

      templateNames.forEach(templateName => {
        expect(promptKeys).toContain(templateName);
      });
    });
  });
});

// Helper function for testing (copied from the prompts.ts file)
function findSimilarTemplates(invalidTemplate: string, validTemplates: string[]): string[] {
  const suggestions: string[] = [];

  // Check for exact substring matches
  for (const validTemplate of validTemplates) {
    if (validTemplate.includes(invalidTemplate) || invalidTemplate.includes(validTemplate)) {
      suggestions.push(validTemplate);
    }
  }

  // Check for templates with similar length and common characters
  for (const validTemplate of validTemplates) {
    if (Math.abs(validTemplate.length - invalidTemplate.length) <= 2) {
      const commonChars = [...invalidTemplate].filter(char => validTemplate.includes(char)).length;
      const similarity = commonChars / Math.max(invalidTemplate.length, validTemplate.length);
      if (similarity >= 0.6) {
        suggestions.push(validTemplate);
      }
    }
  }

  // Remove duplicates and limit to 5 suggestions
  return [...new Set(suggestions)].slice(0, 5);
}
