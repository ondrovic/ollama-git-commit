import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { validateNodeVersion, validateEnvironment } from '../src/utils/validation';
import { mockConfig } from './setup';

// Mock process.env
const originalEnv = process.env;
beforeAll(() => {
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('Validation Utils', () => {
  describe('validateNodeVersion', () => {
    test('should pass for Node.js version >= 18.12.0', () => {
      expect(() => validateNodeVersion()).not.toThrow();
    });
  });

  describe('validateEnvironment', () => {
    test('should pass when all required environment variables are set', async () => {
      process.env.OLLAMA_HOST = mockConfig.host;
      
      const result = await validateEnvironment();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail when Ollama host is not set', async () => {
      delete process.env.OLLAMA_HOST;
      
      const result = await validateEnvironment();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Ollama host is not configured');
    });
  });
});
