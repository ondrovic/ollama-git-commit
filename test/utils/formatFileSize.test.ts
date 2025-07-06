import { describe, expect, it } from 'bun:test';
import { formatFileSize } from '../../src/utils/formatFileSize';

describe('formatFileSize', () => {
  it('should return empty string for undefined', () => {
    expect(formatFileSize(undefined)).toBe('');
  });

  it('should return empty string for null', () => {
    expect(formatFileSize(null)).toBe('');
  });

  it('should return empty string for 0', () => {
    expect(formatFileSize(0)).toBe('');
  });

  it('should format bytes < 1KB', () => {
    expect(formatFileSize(1)).toBe('(1.0 B)');
    expect(formatFileSize(512)).toBe('(512 B)');
    expect(formatFileSize(1023)).toBe('(1023 B)');
  });

  it('should format bytes in KB', () => {
    expect(formatFileSize(1024)).toBe('(1.0 KB)');
    expect(formatFileSize(1536)).toBe('(1.5 KB)');
    expect(formatFileSize(2048)).toBe('(2.0 KB)');
    expect(formatFileSize(10 * 1024)).toBe('(10 KB)');
  });

  it('should format bytes in MB', () => {
    expect(formatFileSize(1024 * 1024)).toBe('(1.0 MB)');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('(5.0 MB)');
    expect(formatFileSize(10 * 1024 * 1024)).toBe('(10 MB)');
  });

  it('should format bytes in GB', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('(1.0 GB)');
    expect(formatFileSize(5 * 1024 * 1024 * 1024)).toBe('(5.0 GB)');
    expect(formatFileSize(10 * 1024 * 1024 * 1024)).toBe('(10 GB)');
  });

  it('should format bytes in TB', () => {
    expect(formatFileSize(1024 ** 4)).toBe('(1.0 TB)');
    expect(formatFileSize(5 * 1024 ** 4)).toBe('(5.0 TB)');
    expect(formatFileSize(10 * 1024 ** 4)).toBe('(10 TB)');
  });

  it('should format bytes in PB', () => {
    expect(formatFileSize(1024 ** 5)).toBe('(1.0 PB)');
    expect(formatFileSize(5 * 1024 ** 5)).toBe('(5.0 PB)');
    expect(formatFileSize(10 * 1024 ** 5)).toBe('(10 PB)');
  });

  it('should handle very large numbers', () => {
    expect(formatFileSize(Number.MAX_SAFE_INTEGER)).toMatch(/PB|TB|GB|MB|KB|B/);
  });
});
