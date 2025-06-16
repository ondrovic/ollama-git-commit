import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { ENVIRONMENTAL_VARIABLES } from '../src/constants/enviornmental';
import { validateEnvironment, validateNodeVersion } from '../src/utils/validation';
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
      process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_HOST] = mockConfig.host;

      const result = await validateEnvironment();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail when Ollama host is not set', async () => {
      delete process.env[ENVIRONMENTAL_VARIABLES.OLLAMA_HOST];

      const result = await validateEnvironment();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Ollama host is not configured');
    });
  });
});
