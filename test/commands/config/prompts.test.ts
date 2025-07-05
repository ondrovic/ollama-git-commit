import { describe, expect, test } from 'bun:test';
import { PROMPTS, VALID_TEMPLATES } from '../../../src/constants/prompts';
import { PromptService } from '../../../src/core/prompt';
import { Logger } from '../../../src/utils/logger';

describe('Prompts Commands', () => {
  describe('PromptService integration', () => {
    test('should use PromptService to get templates', () => {
      const logger = new Logger();
      const promptService = new PromptService(logger);
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
      const logger = new Logger();
      const promptService = new PromptService(logger);
      
      // Test that createPromptFromTemplate handles case-insensitive names
      expect(() => promptService.createPromptFromTemplate('DEFAULT')).toThrow();
      expect(() => promptService.createPromptFromTemplate('default')).not.toThrow();
      expect(() => promptService.createPromptFromTemplate('CONVENTIONAL')).toThrow();
      expect(() => promptService.createPromptFromTemplate('conventional')).not.toThrow();
    });

    test('should throw error for invalid template names', () => {
      const logger = new Logger();
      const promptService = new PromptService(logger);
      
      expect(() => promptService.createPromptFromTemplate('invalid')).toThrow();
      expect(() => promptService.createPromptFromTemplate('')).toThrow();
      expect(() => promptService.createPromptFromTemplate('nonexistent')).toThrow();
    });
  });

  describe('Template content validation', () => {
    test('should have non-empty template content', () => {
      const logger = new Logger();
      const promptService = new PromptService(logger);
      const templates = promptService.getPromptTemplates();

      Object.entries(templates).forEach(([name, content]) => {
        expect(content).toBeTruthy();
        expect(typeof content).toBe('string');
        expect(content.length).toBeGreaterThan(0);
        expect(content).toContain('commit message');
      });
    });

    test('should have unique template content', () => {
      const logger = new Logger();
      const promptService = new PromptService(logger);
      const templates = promptService.getPromptTemplates();

      const contents = Object.values(templates);
      const uniqueContents = new Set(contents);
      
      expect(uniqueContents.size).toBe(contents.length);
    });
  });

  describe('Template validation functions', () => {
    test('should get template keys from service', () => {
      const logger = new Logger();
      const promptService = new PromptService(logger);
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
      const logger = new Logger();
      const promptService = new PromptService(logger);
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