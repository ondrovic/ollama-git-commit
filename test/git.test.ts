import { describe, test, expect } from 'bun:test';
import * as path from 'path';
import { mockFs, mockGit, createMockGitDiff } from './setup';

describe('Git Integration', () => {
  const testRepoPath = '/mock/repo';

  describe('Git Commands', () => {
    test('should get staged diff', async () => {
      const diff = await mockGit.exec('git', ['diff', '--staged']);
      expect(diff).toContain('diff --git');
      expect(diff).toContain('Test content');
    });

    test('should get git status', async () => {
      const status = await mockGit.exec('git', ['status', '--porcelain']);
      expect(status).toBe('M  test.txt\n');
    });
  });

  describe('File System Operations', () => {
    test('should create and read files', async () => {
      const filePath = path.join(testRepoPath, 'test.txt');
      const content = 'Test content';
      
      await mockFs.writeFile(filePath, content);
      const readContent = await mockFs.readFile(filePath, 'utf-8');
      
      expect(readContent).toBe(content);
    });

    test('should create directories', async () => {
      const dirPath = path.join(testRepoPath, 'nested', 'dir');
      await mockFs.mkdir(dirPath, { recursive: true });
      
      const exists = await mockFs.access(dirPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });
});
