import { beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  isValidPath,
  isVersionCompatible,
  sanitizeInput,
  validateEnvironmentDI,
  validateGitConfigDI,
  validateGitRepositoryDI,
  validateModelNameDI,
  validateNodeVersionDI,
  validateOllamaHostDI,
  validatePromptFileDI,
} from '../../src/utils/validation';

describe('validation.ts (DI)', () => {
  let mockLogger;
  let mockProcess;
  let mockExecSync;

  beforeEach(() => {
    mockLogger = {
      error: mock(() => {}),
      debug: mock(() => {}),
    };
    mockProcess = {
      version: 'v18.13.0',
      exit: mock(() => {}),
      cwd: mock(() => '/mock'),
      env: {},
    };
    mockExecSync = mock(() => {});
  });

  describe('validateNodeVersionDI', () => {
    it('should log debug for compatible version', () => {
      validateNodeVersionDI({ process: mockProcess, logger: mockLogger });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Node.js version: 18.13.0'),
      );
    });
    it('should log error and call exit for incompatible version', () => {
      mockProcess.version = 'v16.0.0';
      validateNodeVersionDI({ process: mockProcess, logger: mockLogger });
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Node.js version 18.12.0 or higher'),
      );
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('validateGitRepositoryDI', () => {
    it('should log debug if git repo detected', () => {
      mockExecSync.mockReturnValue('');
      validateGitRepositoryDI({ execSync: mockExecSync, process: mockProcess, logger: mockLogger });
      expect(mockLogger.debug).toHaveBeenCalledWith('Git repository detected ✓');
    });
    it('should throw if not a git repo', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('fail');
      });
      expect(() =>
        validateGitRepositoryDI({
          execSync: mockExecSync,
          process: mockProcess,
          logger: mockLogger,
        }),
      ).toThrow('Not a git repository');
    });
  });

  describe('validateGitConfigDI', () => {
    it('should return name and email if configured', () => {
      mockExecSync.mockReturnValueOnce('Test User').mockReturnValueOnce('test@example.com');
      const result = validateGitConfigDI({ execSync: mockExecSync, process: mockProcess });
      expect(result.name).toBe('Test User');
      expect(result.email).toBe('test@example.com');
      expect(result.warnings).toEqual([]);
    });
    it('should warn if name or email not configured', () => {
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('fail');
        })
        .mockImplementationOnce(() => {
          throw new Error('fail');
        });
      const result = validateGitConfigDI({ execSync: mockExecSync, process: mockProcess });
      expect(result.name).toBeUndefined();
      expect(result.email).toBeUndefined();
      expect(result.warnings.length).toBe(2);
    });
  });

  describe('validateOllamaHostDI', () => {
    it('should return true for valid http/https', () => {
      expect(validateOllamaHostDI('http://localhost:1234')).toBe(true);
      expect(validateOllamaHostDI('https://host')).toBe(true);
    });
    it('should return false for invalid protocol', () => {
      expect(validateOllamaHostDI('ftp://host')).toBe(false);
      expect(validateOllamaHostDI('not-a-url')).toBe(false);
    });
  });

  describe('validateModelNameDI', () => {
    it('should validate correct model names', () => {
      expect(validateModelNameDI('llama3')).toBe(true);
      expect(validateModelNameDI('llama3:8b')).toBe(true);
      expect(validateModelNameDI('model-1.2_3')).toBe(true);
    });
    it('should invalidate incorrect model names', () => {
      expect(validateModelNameDI('llama 3')).toBe(false);
      expect(validateModelNameDI('llama@3')).toBe(false);
    });
  });

  describe('validatePromptFileDI', () => {
    it('should validate correct file path', () => {
      expect(validatePromptFileDI('/path/to/file.txt')).toEqual({ valid: true });
    });
    it('should invalidate empty path', () => {
      expect(validatePromptFileDI('')).toEqual({
        valid: false,
        error: expect.stringContaining('empty'),
      });
    });
    it('should invalidate unsafe path', () => {
      expect(validatePromptFileDI('../file.txt')).toEqual({
        valid: false,
        error: expect.stringContaining('unsafe'),
      });
      expect(validatePromptFileDI('~/file.txt')).toEqual({
        valid: false,
        error: expect.stringContaining('unsafe'),
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

  describe('validateEnvironmentDI', () => {
    it('should return valid if all checks pass', () => {
      mockExecSync.mockReturnValue('ok');
      mockLogger.debug.mockReturnValue(undefined);
      mockProcess.env = { OLLAMA_HOST: 'http://localhost:11434' };
      const result = validateEnvironmentDI({
        execSync: mockExecSync,
        process: mockProcess,
        logger: mockLogger,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
    it('should collect errors and warnings for failures', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('fail');
      });
      mockLogger.debug.mockReturnValue(undefined);
      mockProcess.env = {};
      mockProcess.version = 'v16.0.0';
      const result = validateEnvironmentDI({
        execSync: mockExecSync,
        process: mockProcess,
        logger: mockLogger,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
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
