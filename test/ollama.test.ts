import { afterEach, beforeEach, describe, expect, it, mock, test } from 'bun:test';
import { OllamaService } from '../src/core/ollama';
import { Logger } from '../src/utils/logger';
import { MockedConfig } from './setup';

// Save the real fetch at the top
const realFetch = global.fetch;

// Mock the getConfig function to prevent real dependencies
const mockGetConfig = mock(() => Promise.resolve(MockedConfig));

describe('Ollama Integration', () => {
  let ollamaService: OllamaService;
  let mockLogger: Logger;

  beforeEach(() => {
    global.fetch = realFetch;
    mockLogger = new Logger();
    ollamaService = new OllamaService(mockLogger);

    // Mock the getConfig import to prevent real dependencies
    mock.module('../src/core/config', () => ({
      getConfig: mockGetConfig,
    }));
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  describe('Model Listing', () => {
    test('should fetch available models', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ models: MockedConfig.models }),
        }),
      );
      const service = new OllamaService(mockLogger, undefined, false, {
        fetch: mockFetch,
        config: MockedConfig,
      });

      const models = await service.getModels(MockedConfig.host);
      expect(models).toEqual(MockedConfig.models);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Message Generation', () => {
    test('should generate commit message', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('{"response": "test commit message"}'),
        }),
      );
      const service = new OllamaService(mockLogger, undefined, false, {
        fetch: mockFetch,
        config: { ...MockedConfig, useEmojis: false, timeouts: { generation: 1000 } },
      });

      const message = await service.generateCommitMessage(
        MockedConfig.model,
        MockedConfig.host,
        'Generate a commit message for: Added new feature',
        true,
      );
      expect(message).toBe('test commit message');
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Health Check', () => {
    test('should check server health', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(MockedConfig.health),
        }),
      );
      const service = new OllamaService(mockLogger, undefined, false, {
        fetch: mockFetch,
        config: MockedConfig,
      });

      // We'll use getModels as a proxy for health check (since there's no explicit health method)
      const models = await service.getModels(MockedConfig.host);
      expect(Array.isArray(models)).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Message Processing', () => {
    test('should remove emojis when useEmojis is false', () => {
      // Access the private method for testing
      const removeEmojis = (ollamaService as any).removeEmojis.bind(ollamaService);

      const messageWithEmojis =
        '📚 Updated README.md with new sections 📚\n- 📄 README.md: Added automated testing 🚀\n- 📄 src/core/config.ts: Added 133 lines of config magic 🧙‍️';
      const result = removeEmojis(messageWithEmojis);

      expect(result).not.toContain('📚');
      expect(result).not.toContain('📄');
      expect(result).not.toContain('🚀');
      expect(result).not.toContain('🧙‍️');
      expect(result).toContain('Updated README.md with new sections');
      expect(result).toContain('README.md: Added automated testing');
      expect(result).toContain('src/core/config.ts: Added  lines of config magic');
    });

    test('should remove think tags from message', () => {
      // Access the private method for testing
      const cleanMessage = (ollamaService as any).cleanMessage.bind(ollamaService);

      const messageWithThinkTags = `<think>Some thinking process here</think>
Updated README.md with new sections and improved contribution steps
- README.md: Added automated testing/publishing sections
- src/cli/commands/config/show.ts: Added 6 new functions/vars for better config display`;

      const result = cleanMessage(messageWithThinkTags);

      expect(result).not.toContain('<think>');
      expect(result).not.toContain('</think>');
      expect(result).not.toContain('Some thinking process here');
      expect(result).toContain(
        'Updated README.md with new sections and improved contribution steps',
      );
      expect(result).toContain('README.md: Added automated testing/publishing sections');
    });

    test('should handle mixed content with emojis and think tags', () => {
      // Access the private methods for testing
      const removeEmojis = (ollamaService as any).removeEmojis.bind(ollamaService);
      const cleanMessage = (ollamaService as any).cleanMessage.bind(ollamaService);

      const mixedMessage = `<think>Some thinking process here</think>
📚 Updated README.md with new sections 📚
- 📄 README.md: Added automated testing 🚀
- 📄 src/core/config.ts: Added 133 lines of config magic 🧙‍️`;

      // First remove emojis
      const withoutEmojis = removeEmojis(mixedMessage);
      // Then clean the message
      const finalResult = cleanMessage(withoutEmojis);

      expect(finalResult).not.toContain('<think>');
      expect(finalResult).not.toContain('</think>');
      expect(finalResult).not.toContain('📚');
      expect(finalResult).not.toContain('📄');
      expect(finalResult).not.toContain('🚀');
      expect(finalResult).not.toContain('🧙‍️');
      expect(finalResult).toContain('Updated README.md with new sections');
      expect(finalResult).toContain('README.md: Added automated testing');
      expect(finalResult).toContain('src/core/config.ts: Added lines of config magic');
    });
  });

  describe('Quiet Mode', () => {
    it('should respect quiet mode and not output verbose messages when quiet is true', async () => {
      const quietOllamaService = new OllamaService(mockLogger, undefined, true);
      const spy = mock(() => {});
      mockLogger.info = spy;

      // Mock fetch to return a successful response
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('{"response": "test commit message"}'),
        }),
      );

      try {
        await quietOllamaService.generateCommitMessage(
          'test-model',
          'http://localhost:11434',
          'test prompt',
          true,
        );
      } catch (error) {
        // Expected to fail due to fetch mock, but we're testing the logger calls
      }

      // Verify that no info messages were logged when quiet mode is enabled
      expect(spy).not.toHaveBeenCalled();
    });

    it('should output verbose messages when quiet is false', async () => {
      const nonQuietOllamaService = new OllamaService(mockLogger, undefined, false);
      const spy = mock(() => {});
      mockLogger.info = spy;

      // Mock fetch to return a successful response
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve('{"response": "test commit message"}'),
        }),
      );

      try {
        await nonQuietOllamaService.generateCommitMessage(
          'test-model',
          'http://localhost:11434',
          'test prompt',
          true,
        );
      } catch (error) {
        // Expected to fail due to fetch mock, but we're testing the logger calls
      }

      // Verify that info messages were logged when quiet mode is disabled
      expect(spy).toHaveBeenCalled();
    });
  });
});
