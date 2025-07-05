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

  describe('Git Rename Handling', () => {
    test('should handle renamed files correctly without ambiguous argument', () => {
      const mockExecSync = (command: string) => {
        if (command.includes('git diff --cached') && !command.includes('--name-status') && !command.includes('--stat')) {
          // Mock staged changes with renamed files
          return `diff --git a/src/FaqsGrid.tsx b/src/faqs-grid.tsx
similarity index 100%
rename from src/FaqsGrid.tsx
rename to src/faqs-grid.tsx
diff --git a/src/MediacontentFaqs.tsx b/src/media-content-faqs.tsx
similarity index 100%
rename from src/MediacontentFaqs.tsx
rename to src/media-content-faqs.tsx
diff --git a/src/other-file.ts b/src/other-file.ts
index 1234567..abcdefg 100644
--- a/src/other-file.ts
+++ b/src/other-file.ts
@@ -1,1 +1,2 @@
export const test = true;
+export const newValue = false;`;
        }
        
        if (command.includes('git diff --cached --name-status')) {
          // Mock git output for renamed files
          return 'R100\tsrc/FaqsGrid.tsx\tsrc/faqs-grid.tsx\nR100\tsrc/MediacontentFaqs.tsx\tsrc/media-content-faqs.tsx\nM\tsrc/other-file.ts';
        }
        
        if (command.includes('git diff --cached --stat')) {
          return ` src/faqs-grid.tsx     | 0
 src/media-content-faqs.tsx | 0
 src/other-file.ts          | 1 +
 3 files changed, 1 insertion(+)
`;
        }
        
        if (command.includes('git diff --cached "src/faqs-grid.tsx"')) {
          return `diff --git a/src/FaqsGrid.tsx b/src/faqs-grid.tsx
similarity index 100%
rename from src/FaqsGrid.tsx
rename to src/faqs-grid.tsx`;
        }
        
        if (command.includes('git diff --cached "src/media-content-faqs.tsx"')) {
          return `diff --git a/src/MediacontentFaqs.tsx b/src/media-content-faqs.tsx
similarity index 100%
rename from src/MediacontentFaqs.tsx
rename to src/media-content-faqs.tsx`;
        }
        
        if (command.includes('git diff --cached "src/other-file.ts"')) {
          return `diff --git a/src/other-file.ts b/src/other-file.ts
index 1234567..abcdefg 100644
--- a/src/other-file.ts
+++ b/src/other-file.ts
@@ -1,1 +1,2 @@
export const test = true;
+export const newValue = false;`;
        }
        
        if (command.includes('git diff') && !command.includes('--cached')) {
          // No unstaged changes
          return '';
        }
        
        if (command.includes('git rev-parse --git-dir')) {
          return '.git';
        }
        
        // Default fallback - return empty to avoid real git calls
        return '';
      };

      const gitService = new GitService(process.cwd(), new Logger(), false, mockExecSync as any);
      
      // This should not throw an error
      expect(() => {
        const changes = gitService.getChanges(false);
        
        // Verify the structure is correct
        expect(changes.diff).toBeDefined();
        expect(changes.staged).toBe(true);
        expect(changes.filesInfo).toBeDefined();
        
        // Check that renamed files are displayed correctly
        expect(changes.filesInfo).toContain('src/FaqsGrid.tsx → src/faqs-grid.tsx');
        expect(changes.filesInfo).toContain('src/MediacontentFaqs.tsx → src/media-content-faqs.tsx');
        expect(changes.filesInfo).toContain('(renamed)');
        expect(changes.filesInfo).toContain('src/other-file.ts (modified)');
        
      }).not.toThrow();
    });

    test('should handle copied files correctly', () => {
      const mockExecSync = (command: string) => {
        if (command.includes('git diff --cached') && !command.includes('--name-status') && !command.includes('--stat')) {
          // Mock staged changes with copied files
          return `diff --git a/src/original-file.tsx b/src/copied-file.tsx
similarity index 100%
copy from src/original-file.tsx
copy to src/copied-file.tsx`;
        }
        
        if (command.includes('git diff --cached --name-status')) {
          // Mock git output for copied files
          return 'C100\tsrc/original-file.tsx\tsrc/copied-file.tsx';
        }
        
        if (command.includes('git diff --cached --stat')) {
          return ` src/copied-file.tsx | 0
 1 file changed, 0 insertions(+), 0 deletions(-)
`;
        }
        
        if (command.includes('git diff --cached "src/copied-file.tsx"')) {
          // Mock diff for the copied file (using new path)
          return `diff --git a/src/original-file.tsx b/src/copied-file.tsx
  similarity index 100%
  copy from src/original-file.tsx
  copy to src/copied-file.tsx`;
        }
        
        if (command.includes('git diff') && !command.includes('--cached')) {
          // No unstaged changes
          return '';
        }
        
        if (command.includes('git rev-parse --git-dir')) {
          return '.git';
        }
        
        // Default fallback - return empty to avoid real git calls
        return '';
      };

      const gitService = new GitService(process.cwd(), new Logger(), false, mockExecSync as any);
      
      expect(() => {
        const changes = gitService.getChanges(false);
        
        expect(changes.filesInfo).toContain('src/original-file.tsx → src/copied-file.tsx');
        expect(changes.filesInfo).toContain('(copied)');
        
      }).not.toThrow();
    });

    test('should handle malformed rename output gracefully', () => {
      const mockExecSync = (command: string) => {
        if (command.includes('git diff --cached') && !command.includes('--name-status') && !command.includes('--stat')) {
          // Mock staged changes with malformed rename and normal file
          return `diff --git a/src/normal-file.ts b/src/normal-file.ts
index 1234567..abcdefg 100644
--- a/src/normal-file.ts
+++ b/src/normal-file.ts
@@ -1,1 +1,2 @@
export const test = true;
+export const newValue = false;`;
        }
        
        if (command.includes('git diff --cached --name-status')) {
          // Mock malformed git output (missing new path)
          return 'R100\tsrc/only-old-path.tsx\nM\tsrc/normal-file.ts';
        }
        
        if (command.includes('git diff --cached --stat')) {
          return ` src/normal-file.ts | 1 +
 1 file changed, 1 insertion(+)
`;
        }
        
        if (command.includes('git diff --cached "src/normal-file.ts"')) {
          return `diff --git a/src/normal-file.ts b/src/normal-file.ts
index 1234567..abcdefg 100644
--- a/src/normal-file.ts
+++ b/src/normal-file.ts
@@ -1,1 +1,2 @@
export const test = true;
+export const newValue = false;`;
        }
        
        if (command.includes('git diff') && !command.includes('--cached')) {
          // No unstaged changes
          return '';
        }
        
        if (command.includes('git rev-parse --git-dir')) {
          return '.git';
        }
        
        // Default fallback - return empty to avoid real git calls
        return '';
      };

      const gitService = new GitService(process.cwd(), new Logger(), false, mockExecSync as any);
      
      // Should handle malformed input gracefully without throwing
      expect(() => {
        const changes = gitService.getChanges(false);
        
        // Should still process the normal file
        expect(changes.filesInfo).toContain('src/normal-file.ts (modified)');
        
      }).not.toThrow();
    });

    test('should use correct file paths for git diff commands on renames', () => {
      let diffCommandsExecuted: string[] = [];
      
      const mockExecSync = (command: string) => {
        // Track which diff commands are executed
        if (command.includes('git diff --cached "')) {
          diffCommandsExecuted.push(command);
        }
        
        if (command.includes('git diff --cached') && !command.includes('--name-status') && !command.includes('--stat')) {
          return `diff --git a/old-name.tsx b/new-name.tsx
similarity index 100%
rename from old-name.tsx
rename to new-name.tsx`;
        }
        
        if (command.includes('git diff --cached --name-status')) {
          return 'R100\told-name.tsx\tnew-name.tsx';
        }
        
        if (command.includes('git diff --cached --stat')) {
          return ` new-name.tsx | 0
 1 file changed, 0 insertions(+), 0 deletions(-)
`;
        }
        
        if (command.includes('git diff --cached "new-name.tsx"')) {
          return `diff --git a/old-name.tsx b/new-name.tsx
similarity index 100%
rename from old-name.tsx
rename to new-name.tsx`;
        }
        
        if (command.includes('git diff') && !command.includes('--cached')) {
          // No unstaged changes
          return '';
        }
        
        if (command.includes('git rev-parse --git-dir')) {
          return '.git';
        }
        
        // Default fallback - return empty to avoid real git calls
        return '';
      };

      const gitService = new GitService(process.cwd(), new Logger(), false, mockExecSync as any);
      
      gitService.getChanges(false);
      
      // Verify that git diff was called with the NEW file path, not the old one
      expect(diffCommandsExecuted).toContain('git diff --cached "new-name.tsx"');
      // Should NOT contain the old path
      expect(diffCommandsExecuted.some(cmd => cmd.includes('old-name.tsx'))).toBe(false);
      // Should NOT contain the malformed tab-separated path
      expect(diffCommandsExecuted.some(cmd => cmd.includes('old-name.tsx\tnew-name.tsx'))).toBe(false);
    });

    test('should display version changes correctly for renamed version files', () => {
      const mockExecSync = (command: string) => {
        if (command.includes('git diff --cached') && !command.includes('--name-status') && !command.includes('--stat')) {
          return `diff --git a/VERSION.old b/VERSION
similarity index 90%
rename from VERSION.old
rename to VERSION
index 1234567..abcdefg 100644
--- a/VERSION.old
+++ b/VERSION
@@ -1 +1 @@
-1.0.0
+1.0.1`;
        }
        
        if (command.includes('git diff --cached --name-status')) {
          return 'R100\tVERSION.old\tVERSION';
        }
        
        if (command.includes('git diff --cached --stat')) {
          return ` VERSION | 1 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
`;
        }
        
        if (command.includes('git diff --cached "VERSION"')) {
          return `diff --git a/VERSION.old b/VERSION
  similarity index 90%
  rename from VERSION.old
  rename to VERSION
  index 1234567..abcdefg 100644
  --- a/VERSION.old
  +++ b/VERSION
  @@ -1 +1 @@
  -1.0.0
  +1.0.1`;
        }
        
        if (command.includes('git diff') && !command.includes('--cached')) {
          // No unstaged changes
          return '';
        }
        
        if (command.includes('git rev-parse --git-dir')) {
          return '.git';
        }
        
        // Default fallback - return empty to avoid real git calls
        return '';
      };

      const gitService = new GitService(process.cwd(), new Logger(), false, mockExecSync as any);
      
      const changes = gitService.getChanges(false);
      
      // Should correctly identify version changes even in renamed files
      expect(changes.filesInfo).toContain('📦 Version Changes:');
      expect(changes.filesInfo).toContain('VERSION: Updated version from 1.0.0 to 1.0.1');
      expect(changes.filesInfo).toContain('VERSION.old → VERSION (renamed)');
    });
  });

  describe('Quiet Functionality', () => {
    test('should handle quiet parameter correctly', () => {
      const mockExecSync: any = (command: string, options?: any) => 'mocked output';
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
      const mockExecSync: any = (command: string, options: any) => {
        capturedOptions = options;
        return 'mocked output';
      };
      
      const gitService = new GitService(process.cwd(), new Logger(), false, mockExecSync);
      
      // Test quiet mode - should capture output without display
      gitService.execCommand('git status', true);
      expect(capturedOptions.stdio).toEqual(['pipe', 'pipe', 'pipe']);
      
      // Test non-quiet mode - should inherit stderr for real-time output
      gitService.execCommand('git status', false);
      expect(capturedOptions.stdio).toEqual(['pipe', 'pipe', 'inherit']);
    });

    test('should use instance quiet setting when parameter is omitted', () => {
      let capturedOptions: any = null;
      const mockExecSync: any = (command: string, options: any) => {
        capturedOptions = options;
        return 'mocked output';
      };
      
      // Test with instance quiet = true
      const quietGitService = new GitService(process.cwd(), new Logger(), true, mockExecSync);
      quietGitService.execCommand('git status');
      expect(capturedOptions.stdio).toEqual(['pipe', 'pipe', 'pipe']);
      
      // Test with instance quiet = false - should inherit stderr for real-time output
      const nonQuietGitService = new GitService(process.cwd(), new Logger(), false, mockExecSync);
      nonQuietGitService.execCommand('git status');
      expect(capturedOptions.stdio).toEqual(['pipe', 'pipe', 'inherit']);
    });

    test('should return actual command output in both quiet and non-quiet modes', () => {
      const mockOutput = 'mocked git output';
      const mockExecSync: any = () => mockOutput;
      const gitService = new GitService(process.cwd(), new Logger(), false, mockExecSync);
      
      // Both modes should return the actual output (this was the bug!)
      const quietResult = gitService.execCommand('git status', true);
      expect(quietResult).toBe(mockOutput);
      
      const nonQuietResult = gitService.execCommand('git status', false);
      expect(nonQuietResult).toBe(mockOutput);
    });

    test('should return actual output for analysis methods', () => {
      const mockExecSync: any = (command: string) => {
        if (command.includes('branch --show-current')) {
          return 'main';
        }
        if (command.includes('rev-parse HEAD')) {
          return 'abc123';
        }
        if (command.includes('rev-parse --show-toplevel')) {
          return '/path/to/repo';
        }
        return '';
      };
      
      const gitService = new GitService(process.cwd(), new Logger(), false, mockExecSync);
      
      // These methods should return actual values, not empty strings
      expect(gitService.getBranchName()).toBe('main');
      expect(gitService.getLastCommitHash()).toBe('abc123');
      expect(gitService.getRepositoryRoot()).toBe('/path/to/repo');
    });
  });
});
