import { describe, expect, test } from 'bun:test';
import { TROUBLE_SHOOTING } from '../../src/constants/troubleshooting';

describe('TROUBLE_SHOOTING', () => {
  describe('GENERAL', () => {
    test('should contain all main troubleshooting steps', () => {
      const general = TROUBLE_SHOOTING.GENERAL;
      expect(general).toContain('Check is Ollama is running');
      expect(general).toContain('ollama serve');
      expect(general).toContain('Check configuration');
      expect(general).toContain('ollama-git-commit config show');
      expect(general).toContain('Test connection');
      expect(general).toContain('ollama-git-commit test connection');
      expect(general).toContain('Verify host URL format');
      expect(general).toContain('http://localhost:11434');
      expect(general).toContain('Check firewall and network settings');
      expect(general).toContain('curl http://<host>:<port>/api/tags');
    });
  });

  describe('MODEL_NOT_FOUND', () => {
    test('should return correct message for a typical model', () => {
      const msg = TROUBLE_SHOOTING.MODEL_NOT_FOUND('llama3:8b');
      expect(msg).toContain("Model 'llama3:8b' is not available.");
      expect(msg).toContain('ollama pull llama3:8b');
      expect(msg).toContain('ollama-git-commit config models list');
    });

    test('should handle empty model name', () => {
      const msg = TROUBLE_SHOOTING.MODEL_NOT_FOUND('');
      expect(msg).toContain("Model '' is not available.");
      expect(msg).toContain('ollama pull ');
    });

    test('should handle special characters in model name', () => {
      const msg = TROUBLE_SHOOTING.MODEL_NOT_FOUND('weird:model!@#');
      expect(msg).toContain("Model 'weird:model!@#' is not available.");
      expect(msg).toContain('ollama pull weird:model!@#');
    });
  });

  describe('TIMEOUT', () => {
    test('should return correct message for a typical timeout', () => {
      const msg = TROUBLE_SHOOTING.TIMEOUT(30000);
      expect(msg).toContain('Timeout troubleshooting:');
      expect(msg).toContain('Current timeout: 30000ms');
      expect(msg).toContain('Try a smaller model for faster response');
      expect(msg).toContain('Increase timeout in config file');
      expect(msg).toContain('"timeouts": { "generation": 300000 }');
      expect(msg).toContain('Check system resources (CPU/Memory/GPU)');
    });

    test('should handle zero timeout', () => {
      const msg = TROUBLE_SHOOTING.TIMEOUT(0);
      expect(msg).toContain('Current timeout: 0ms');
    });

    test('should handle large timeout', () => {
      const msg = TROUBLE_SHOOTING.TIMEOUT(9999999);
      expect(msg).toContain('Current timeout: 9999999ms');
    });
    
    test('should handle negative timeout', () => {
      const msg = TROUBLE_SHOOTING.TIMEOUT(-100);
      expect(msg).toContain('Current timeout: -100ms');
    });
  });
}); 