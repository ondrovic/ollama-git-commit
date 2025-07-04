import { describe, expect, test } from 'bun:test';
import * as path from 'path';
import { GitService } from '../src/core/git';
import { Logger } from '../src/utils/logger';
import { mockFs, mockGit } from './setup';

describe('Git Integration', () => {
  const testRepoPath = '/mock/repo';

  describe('Git Commands', () => {
    test('should get git status', async () => {
      const status = await mockGit.exec('git', ['status', '--porcelain']);
      expect(status).toBe('M  test.txt\n');
    });
  });

  describe('Version Extraction', () => {
    test('should extract version changes from package.json diff', () => {
      const gitService = new GitService(process.cwd(), new Logger());

      // Mock the extractVersionChanges method by accessing it through the prototype
      const extractVersionChanges = (gitService as any).extractVersionChanges.bind(gitService);

      const mockDiff = `diff --git a/package.json b/package.json
index e2b836d..b62d39a 100644
--- a/package.json
+++ b/package.json
@@ -1,6 +1,6 @@
 {
   "name": "contentstack-search-cli",
-  "version": "1.0.1",
+  "version": "1.0.2",
   "type": "commonjs",
   "description": "A powerful CLI tool for searching ContentStack CMS content"`;

      const result = extractVersionChanges('package.json', mockDiff);
      expect(result).toBe('📦 package.json: Bumped version from 1.0.1 to 1.0.2');
    });

    test('should extract version changes from package-lock.json diff', () => {
      const gitService = new GitService(process.cwd(), new Logger());

      const extractVersionChanges = (gitService as any).extractVersionChanges.bind(gitService);

      const mockDiff = `diff --git a/package-lock.json b/package-lock.json
index e2b836d..b62d39a 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,6 +1,6 @@
 {
   "name": "contentstack-search-cli",
-  "version": "1.0.1",
+  "version": "1.0.2",
   "lockfileVersion": 2`;

      const result = extractVersionChanges('package-lock.json', mockDiff);
      expect(result).toBe('📦 package-lock.json: Updated version from 1.0.1 to 1.0.2');
    });

    test('should return null for files without version changes', () => {
      const gitService = new GitService(process.cwd(), new Logger());

      const extractVersionChanges = (gitService as any).extractVersionChanges.bind(gitService);

      const mockDiff = `diff --git a/src/index.js b/src/index.js
index e2b836d..b62d39a 100644
--- a/src/index.js
+++ b/src/index.js
@@ -1,3 +1,4 @@
 function hello() {
   console.log('Hello World');
+  console.log('Goodbye World');
 }`;

      const result = extractVersionChanges('src/index.js', mockDiff);
      expect(result).toBeNull();
    });

    test('should not detect version change in package-lock.json when version is truncated', () => {
      const gitService = new GitService(process.cwd(), new Logger());

      const extractVersionChanges = (gitService as any).extractVersionChanges.bind(gitService);

      // This simulates a case where the version line is truncated in the diff
      const mockDiff = `diff --git a/package-lock.json b/package-lock.json
index e2b836d..b62d39a 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,6 +1,6 @@
 {
   "name": "test-package",
-  "version": "1.0.0",
+  "version": "1.0.0",
   "lockfileVersion": 2,
   "requires": true,
   "dependencies": {
     "some-package": {
-      "version": "2.1.0",
+      "version": "2.1.1",
       "resolved": "https://registry.npmjs.org/some-package/-/some-package-2.1.1.tgz",
       "integrity": "sha512-abc123"
     }
   }
 }`;

      const result = extractVersionChanges('package-lock.json', mockDiff);
      // Should return null because the main version didn't change, only a dependency version
      expect(result).toBeNull();
    });

    test('should not detect version change when version line is incomplete', () => {
      const gitService = new GitService(process.cwd(), new Logger());

      const extractVersionChanges = (gitService as any).extractVersionChanges.bind(gitService);

      // This simulates a case where the version line is incomplete or malformed
      const mockDiff = `diff --git a/package-lock.json b/package-lock.json
index e2b836d..b62d39a 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,6 +1,6 @@
 {
   "name": "test-package",
-  "version": "1.0.0",
+  "version": ".."
 }`;

      const result = extractVersionChanges('package-lock.json', mockDiff);
      // Should return null because the version is incomplete
      expect(result).toBeNull();
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

      const exists = await mockFs
        .access(dirPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('Quiet Functionality', () => {
    test('should handle quiet parameter correctly', () => {
      const mockExecSync = () => Buffer.from('mocked output');
      const gitService = new GitService(process.cwd(), new Logger(), false, mockExecSync);
      expect(() => gitService.execCommand('git status', true)).not.toThrow();
      expect(() => gitService.execCommand('git status', false)).not.toThrow();
      expect(() => gitService.execCommand('git status')).not.toThrow();
    });

    test('should handle quiet parameter in constructor', () => {
      const gitService = new GitService(process.cwd(), new Logger(), true);
      
      // Test that the service can be created with quiet parameter
      expect(gitService).toBeInstanceOf(GitService);
    });

    test('should use correct stdio configuration for quiet mode', () => {
      let capturedOptions: any = null;
      const mockExecSync = (command: string, options: any) => {
        capturedOptions = options;
        return Buffer.from('mocked output');
      };
      
      const gitService = new GitService(process.cwd(), new Logger(), false, mockExecSync);
      
      // Test quiet mode - should capture output without display
      gitService.execCommand('git status', true);
      expect(capturedOptions.stdio).toEqual(['pipe', 'pipe', 'pipe']);
      
      // Test non-quiet mode - should capture stderr for error handling while displaying stdout naturally
      gitService.execCommand('git status', false);
      expect(capturedOptions.stdio).toEqual(['pipe', 'inherit', 'pipe']);
    });

    test('should use instance quiet setting when parameter is omitted', () => {
      let capturedOptions: any = null;
      const mockExecSync = (command: string, options: any) => {
        capturedOptions = options;
        return Buffer.from('mocked output');
      };
      
      // Test with instance quiet = true
      const quietGitService = new GitService(process.cwd(), new Logger(), true, mockExecSync);
      quietGitService.execCommand('git status');
      expect(capturedOptions.stdio).toEqual(['pipe', 'pipe', 'pipe']);
      
      // Test with instance quiet = false - should capture stderr for error handling while displaying stdout naturally
      const nonQuietGitService = new GitService(process.cwd(), new Logger(), false, mockExecSync);
      nonQuietGitService.execCommand('git status');
      expect(capturedOptions.stdio).toEqual(['pipe', 'inherit', 'pipe']);
    });
  });
});
