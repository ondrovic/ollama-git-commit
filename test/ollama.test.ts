import { describe, test, expect } from 'bun:test';
import { mockConfig, mockOllamaResponses } from './setup';

describe('Ollama Integration', () => {
  describe('Model Listing', () => {
    test('should fetch available models', async () => {
      const response = await fetch(`${mockConfig.host}/api/tags`);
      const data = await response.json();
      
      expect(data).toEqual(mockOllamaResponses.models);
      expect(data.models).toHaveLength(2);
      expect(data.models[0].name).toBe('mistral:7b-instruct');
    });
  });

  describe('Message Generation', () => {
    test('should generate commit message', async () => {
      const response = await fetch(`${mockConfig.host}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: mockConfig.model,
          prompt: 'Generate a commit message for: Added new feature',
        }),
      });
      
      const data = await response.json();
      
      expect(data).toEqual(mockOllamaResponses.generate);
      expect(data.model).toBe(mockConfig.model);
      expect(data.response).toBeTruthy();
      expect(data.done).toBe(true);
    });
  });

  describe('Health Check', () => {
    test('should check server health', async () => {
      const response = await fetch(`${mockConfig.host}/api/health`);
      const data = await response.json();
      
      expect(data).toEqual(mockOllamaResponses.health);
      expect(data.status).toBe('ok');
    });
  });
});
