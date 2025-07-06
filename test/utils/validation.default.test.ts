import { describe, expect, it } from 'bun:test';
import {
  isValidPath,
  isVersionCompatible,
  sanitizeInput,
  validateModelName,
  validateOllamaHost,
  validatePromptFile,
} from '../../src/utils/validation';

describe('validation.ts (default exports - simple)', () => {
  describe('validateOllamaHost', () => {
    it('should return true for valid http/https', () => {
      expect(validateOllamaHost('http://localhost:1234')).toBe(true);
      expect(validateOllamaHost('https://host')).toBe(true);
    });

    it('should return false for invalid protocol', () => {
      expect(validateOllamaHost('ftp://host')).toBe(false);
      expect(validateOllamaHost('not-a-url')).toBe(false);
    });
  });

  describe('validateModelName', () => {
    it('should validate correct model names', () => {
      expect(validateModelName('llama3')).toBe(true);
      expect(validateModelName('llama3:8b')).toBe(true);
      expect(validateModelName('model-1.2_3')).toBe(true);
    });

    it('should invalidate incorrect model names', () => {
      expect(validateModelName('llama 3')).toBe(false);
      expect(validateModelName('llama@3')).toBe(false);
    });
  });

  describe('validatePromptFile', () => {
    it('should validate correct file path', () => {
      expect(validatePromptFile('/path/to/file.txt')).toEqual({ valid: true });
    });

    it('should invalidate empty path', () => {
      expect(validatePromptFile('')).toEqual({
        valid: false,
        error: 'Prompt file path cannot be empty',
      });
    });

    it('should invalidate whitespace-only path', () => {
      expect(validatePromptFile('   ')).toEqual({
        valid: false,
        error: 'Prompt file path cannot be empty',
      });
    });

    it('should invalidate unsafe path with ..', () => {
      expect(validatePromptFile('../file.txt')).toEqual({
        valid: false,
        error: 'Prompt file path contains potentially unsafe characters',
      });
    });

    it('should invalidate unsafe path with ~', () => {
      expect(validatePromptFile('~/file.txt')).toEqual({
        valid: false,
        error: 'Prompt file path contains potentially unsafe characters',
      });
    });
  });

  describe('isVersionCompatible', () => {
    it('should return true if current >= required', () => {
      expect(isVersionCompatible('18.13.0', '18.12.0')).toBe(true);
      expect(isVersionCompatible('19.0.0', '18.12.0')).toBe(true);
      expect(isVersionCompatible('18.12.0', '18.12.0')).toBe(true);
    });

    it('should return false if current < required', () => {
      expect(isVersionCompatible('18.11.0', '18.12.0')).toBe(false);
      expect(isVersionCompatible('17.0.0', '18.12.0')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove control characters and limit length', () => {
      const input = 'abc\x00\x01\x02def\n\t' + 'x'.repeat(2000);
      const sanitized = sanitizeInput(input, 10);
      expect(sanitized).not.toContain('\x00');
      expect(sanitized.length).toBeLessThanOrEqual(13); // 10 + '...'
    });
  });

  describe('isValidPath', () => {
    it('should validate correct paths', () => {
      expect(isValidPath('/path/to/file')).toBe(true);
    });

    it('should invalidate empty, null byte, or long paths', () => {
      expect(isValidPath('')).toBe(false);
      expect(isValidPath('abc\0def')).toBe(false);
      expect(isValidPath('x'.repeat(5000))).toBe(false);
    });
  });
});
