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
}); 