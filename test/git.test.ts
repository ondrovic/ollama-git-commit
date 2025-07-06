import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  GitCommandError,
  GitNoChangesError,
  GitRepositoryError,
  GitService,
} from '../src/core/git';

// Mock child_process.execSync
const mockExecSync = mock(() => 'mocked output');

// Mock logger
const mockLogger = {
  debug: mock(() => {}),
  info: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
};

// Mock file system operations
const mockFs = {
  existsSync: mock(() => true),
  readFileSync: mock(() => ''),
  writeFileSync: mock(() => {}),
  mkdirSync: mock(() => {}),
  statSync: mock(() => ({ isDirectory: () => true })),
};

// Mock path operations
const mockPath = {
  join: mock((...args: string[]) => args.join('/')),
  resolve: mock((...args: string[]) => args.join('/')),
  dirname: mock((path: string) => path.split('/').slice(0, -1).join('/')),
  basename: mock((path: string) => path.split('/').pop() || ''),
  extname: mock((path: string) => {
    const parts = path.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : '';
  }),
};

// Mock OS operations
const mockOs = {
  platform: mock(() => 'win32'),
  homedir: mock(() => '/mock/home'),
  tmpdir: mock(() => '/mock/tmp'),
  cpus: mock(() => []),
  freemem: mock(() => 1000000),
  totalmem: mock(() => 2000000),
};

// Mock process operations
const mockProcess = {
  cwd: mock(() => '/mock/cwd'),
  env: {},
  platform: 'win32',
  exit: mock(() => {}),
  on: mock(() => {}),
  off: mock(() => {}),
};

// Mock spawn
const mockSpawn = mock(() => ({
  stdout: { on: mock(() => {}), pipe: mock(() => {}) },
  stderr: { on: mock(() => {}), pipe: mock(() => {}) },
  on: mock(() => {}),
}));

const testRepoPath = '/mock/repo';

describe('GitService', () => {
  let gitService: GitService;
  let quietService: GitService;

  beforeEach(() => {
    // Clear all mocks
    mockExecSync.mockClear();
    mockLogger.debug.mockClear();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockFs.existsSync.mockClear();
    mockFs.readFileSync.mockClear();
    mockFs.writeFileSync.mockClear();
    mockPath.join.mockClear();
    mockPath.resolve.mockClear();
    mockOs.platform.mockClear();
    mockProcess.cwd.mockClear();
    mockSpawn.mockClear();

    // Create services with full dependency injection
    gitService = new GitService(testRepoPath, mockLogger, false, {
      execSync: mockExecSync,
      fs: mockFs,
      path: mockPath,
      os: mockOs,
      spawn: mockSpawn,
    });

    quietService = new GitService(testRepoPath, mockLogger, true, {
      execSync: mockExecSync,
      fs: mockFs,
      path: mockPath,
      os: mockOs,
      spawn: mockSpawn,
    });
  });

  describe('execCommand', () => {
    test('should execute git command successfully', () => {
      mockExecSync.mockReturnValue('success output');

      const result = gitService.execCommand('git status');

      expect(result).toBe('success output');
      expect(mockExecSync).toHaveBeenCalledWith('git status', {
        cwd: testRepoPath,
        stdio: ['pipe', 'pipe', 'inherit'],
      });
    });

    test('should handle execCommand error', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('git command failed');
      });

      expect(() => gitService.execCommand('git invalid')).toThrow(GitCommandError);
      expect(mockExecSync).toHaveBeenCalledWith('git invalid', {
        cwd: testRepoPath,
        stdio: ['pipe', 'pipe', 'inherit'],
      });
    });

    test('should handle quiet mode', () => {
      mockExecSync.mockReturnValue('quiet output');

      const result = quietService.execCommand('git status');

      expect(result).toBe('quiet output');
      expect(mockExecSync).toHaveBeenCalledWith('git status', {
        cwd: testRepoPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    test('should handle forceQuiet parameter', () => {
      mockExecSync.mockReturnValue('forced quiet output');

      const result = gitService.execCommand('git status', true);

      expect(result).toBe('forced quiet output');
      expect(mockExecSync).toHaveBeenCalledWith('git status', {
        cwd: testRepoPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    test('should handle non-string error', () => {
      mockExecSync.mockImplementation(() => {
        throw 123; // Non-string error
      });

      expect(() => gitService.execCommand('git invalid')).toThrow(GitCommandError);
    });
  });

  describe('isGitRepository', () => {
    test('should return true for valid git repository', () => {
      mockExecSync.mockReturnValue('.git');

      const result = gitService.isGitRepository();

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('git rev-parse --git-dir', {
        cwd: testRepoPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Git repository check for ${testRepoPath}: Success`,
      );
    });

    test('should return false for invalid git repository', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });

      const result = gitService.isGitRepository();

      expect(result).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Git repository check for ${testRepoPath}: Failed`,
      );
    });
  });

  describe('getChanges', () => {
    test('should throw if not a git repository', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });

      expect(() => gitService.getChanges(false)).toThrow(GitRepositoryError);
    });

    test('should throw if no changes found', () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') {
          return '.git';
        }
        if (command.includes('git diff --cached') || command.includes('git diff')) {
          return ''; // No changes
        }
        throw new Error('unexpected command');
      });

      expect(() => gitService.getChanges(false)).toThrow(GitNoChangesError);
    });

    test('should return changes successfully with staged changes', () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') {
          return '.git';
        }
        if (command.includes('git diff --cached')) {
          return 'diff output'; // Staged changes
        }
        if (command.includes('git diff --stat')) {
          return 'file1.txt | 5 +++++\n 1 file changed, 5 insertions(+)';
        }
        if (command.includes('git diff --name-status')) {
          return 'M\tfile1.txt';
        }
        if (command.includes('git diff "file1.txt"')) {
          return '+new line\n-old line';
        }
        throw new Error('unexpected command');
      });

      const result = gitService.getChanges(false);

      expect(result).toHaveProperty('diff', 'diff output');
      expect(result).toHaveProperty('staged', true);
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('filesInfo');
    });

    test('should return changes successfully with unstaged changes', () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') {
          return '.git';
        }
        if (command.includes('git diff --cached')) {
          return ''; // No staged changes
        }
        if (command.includes('git diff')) {
          return 'unstaged diff output'; // Unstaged changes
        }
        if (command.includes('git diff --stat')) {
          return 'file1.txt | 5 +++++\n 1 file changed, 5 insertions(+)';
        }
        if (command.includes('git diff --name-status')) {
          return 'M\tfile1.txt';
        }
        if (command.includes('git diff "file1.txt"')) {
          return '+new line\n-old line';
        }
        throw new Error('unexpected command');
      });

      const result = gitService.getChanges(true); // verbose = true

      expect(result).toHaveProperty('diff', 'unstaged diff output');
      expect(result).toHaveProperty('staged', false);
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('filesInfo');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Using unstaged changes for commit message generation',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Note: You'll need to stage these changes before committing",
      );
    });

    test('should handle staged changes error', () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') {
          return '.git';
        }
        if (command.includes('git diff --cached')) {
          throw new Error('staged diff failed');
        }
        throw new Error('unexpected command');
      });

      expect(() => gitService.getChanges(false)).toThrow(GitCommandError);
    });

    test('should handle unstaged changes error', () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') {
          return '.git';
        }
        if (command.includes('git diff --cached')) {
          return ''; // No staged changes
        }
        if (command.includes('git diff')) {
          throw new Error('unstaged diff failed');
        }
        throw new Error('unexpected command');
      });

      expect(() => gitService.getChanges(false)).toThrow(GitCommandError);
    });
  });

  describe('getBranchName', () => {
    test('should return branch name successfully', () => {
      mockExecSync.mockReturnValue('main');

      const result = gitService.getBranchName();

      expect(result).toBe('main');
      expect(mockExecSync).toHaveBeenCalledWith('git branch --show-current', {
        cwd: testRepoPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    test('should return unknown on error', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('git branch failed');
      });

      const result = gitService.getBranchName();

      expect(result).toBe('unknown');
    });
  });

  describe('getLastCommitHash', () => {
    test('should return commit hash successfully', () => {
      mockExecSync.mockReturnValue('abc123');

      const result = gitService.getLastCommitHash();

      expect(result).toBe('abc123');
      expect(mockExecSync).toHaveBeenCalledWith('git rev-parse HEAD', {
        cwd: testRepoPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    test('should return empty string on error', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('git rev-parse failed');
      });

      const result = gitService.getLastCommitHash();

      expect(result).toBe('');
    });
  });

  describe('getRepositoryRoot', () => {
    test('should return repository root successfully', () => {
      mockExecSync.mockReturnValue('/mock/repo');

      const result = gitService.getRepositoryRoot();

      expect(result).toBe('/mock/repo');
      expect(mockExecSync).toHaveBeenCalledWith('git rev-parse --show-toplevel', {
        cwd: testRepoPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });

    test('should return cwd on error', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('git rev-parse failed');
      });

      const result = gitService.getRepositoryRoot();

      expect(result).toBe(process.cwd());
    });
  });

  describe('getChangeStats', () => {
    test('should handle error gracefully', () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') return '.git';
        if (command.includes('git diff --cached')) return 'diff output';
        if (command.includes('git diff --stat')) throw new Error('git diff failed');
        if (command.includes('git diff --name-status')) return 'M\tfile1.txt';
        if (command.includes('git diff "file1.txt"')) return '+new line\n-old line';
        throw new Error('unexpected command');
      });
      const result = gitService.getChanges(false);
      expect(result.stats).toEqual({ files: 0, insertions: 0, deletions: 0 });
    });

    test('should handle empty stats output', () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command === 'git rev-parse --git-dir') return '.git';
        if (command.includes('git diff --cached')) return 'diff output';
        if (command.includes('git diff --stat')) return ''; // Empty stats
        if (command.includes('git diff --name-status')) return 'M\tfile1.txt';
        if (command.includes('git diff "file1.txt"')) return '+new line\n-old line';
        throw new Error('unexpected command');
      });
      const result = gitService.getChanges(false);
      expect(result.stats).toEqual({ files: 0, insertions: 0, deletions: 0 });
    });
  });

  describe('setQuiet', () => {
    test('should set quiet mode', () => {
      gitService.setQuiet(true);

      mockExecSync.mockReturnValue('quiet output');
      const result = gitService.execCommand('git status');

      expect(result).toBe('quiet output');
      expect(mockExecSync).toHaveBeenCalledWith('git status', {
        cwd: testRepoPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    });
  });
});
