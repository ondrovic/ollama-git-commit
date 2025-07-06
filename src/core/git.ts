import { ExecSyncOptions, execSync as realExecSync } from 'child_process';
import type { GitChanges } from '../types';
import { Logger } from '../utils/logger';
import { IGitService, ILogger } from './interfaces';

// Custom error types
export class GitNoChangesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitNoChangesError';
  }
}

export class GitRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitRepositoryError';
  }
}

export class GitCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitCommandError';
  }
}

export interface GitServiceDeps {
  fs?: typeof import('fs-extra');
  path?: typeof import('path');
  os?: typeof import('os');
  spawn?: typeof import('child_process').spawn;
  execSync?: typeof realExecSync;
}

export class GitService implements IGitService {
  private directory: string;
  private logger: ILogger;
  private quiet: boolean;
  private execSyncFn: typeof realExecSync;
  private fs: typeof import('fs-extra') | undefined;
  private path: typeof import('path') | undefined;
  private os: typeof import('os') | undefined;
  private spawn: typeof import('child_process').spawn | undefined;

  constructor(
    directory: string = process.cwd(),
    logger: ILogger = Logger.getDefault(),
    quiet = false,
    deps: GitServiceDeps = {},
  ) {
    this.directory = directory;
    this.logger = logger;
    this.quiet = quiet;
    this.execSyncFn = deps.execSync || realExecSync;
    this.fs = deps.fs;
    this.path = deps.path;
    this.os = deps.os;
    this.spawn = deps.spawn;
  }

  public setQuiet(quiet: boolean): void {
    this.quiet = quiet;
  }

  /**
   * Execute a git command for analysis purposes - ALWAYS returns output
   * Use this for commands that need to return data (getBranchName, getChanges, etc.)
   */
  private execForAnalysis(command: string): string {
    try {
      const options: ExecSyncOptions = {
        cwd: this.directory,
        stdio: ['pipe', 'pipe', 'pipe'], // Always capture everything
      };
      return this.execSyncFn(command, options).toString().trim();
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'message' in error) {
        throw new GitCommandError(
          `Failed to execute git command: ${(error as { message: string }).message}`,
        );
      } else {
        throw new GitCommandError(`Failed to execute git command: ${String(error)}`);
      }
    }
  }

  /**
   * Execute a git command for user interaction - respects quiet mode
   * Use this for commands where user needs to see real-time output (commit, push, etc.)
   */
  public execCommand(command: string, forceQuiet?: boolean): string {
    try {
      const options: ExecSyncOptions = { cwd: this.directory };
      const shouldBeQuiet = forceQuiet !== undefined ? forceQuiet : this.quiet;

      if (shouldBeQuiet) {
        // Quiet mode: capture everything, return stdout
        options.stdio = ['pipe', 'pipe', 'pipe'];
        return this.execSyncFn(command, options).toString().trim();
      } else {
        // Non-quiet mode: inherit stderr for real-time output, capture stdout
        options.stdio = ['pipe', 'pipe', 'inherit'];
        const result = this.execSyncFn(command, options);
        return result ? result.toString().trim() : '';
      }
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'message' in error) {
        throw new GitCommandError(
          `Failed to execute git command: ${(error as { message: string }).message}`,
        );
      } else {
        throw new GitCommandError(`Failed to execute git command: ${String(error)}`);
      }
    }
  }

  isGitRepository(): boolean {
    try {
      this.execForAnalysis('git rev-parse --git-dir');
      this.logger.debug(`Git repository check for ${this.directory}: Success`);
      return true;
    } catch (error) {
      this.logger.debug(`Git repository check for ${this.directory}: Failed`);
      this.logger.debug(`Error: ${error}`);
      return false;
    }
  }

  getChanges(verbose: boolean): GitChanges {
    if (!this.isGitRepository()) {
      throw new GitRepositoryError('Not a git repository');
    }

    let diff = '';
    let staged = true;

    // First check for staged changes
    try {
      diff = this.execForAnalysis('git diff --cached');
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'message' in error) {
        throw new GitCommandError(
          `Failed to get staged changes: ${(error as { message: string }).message}`,
        );
      } else {
        throw new GitCommandError(`Failed to get staged changes: ${String(error)}`);
      }
    }

    if (!diff.trim()) {
      // No staged changes, check for unstaged changes
      let unstagedDiff = '';
      try {
        unstagedDiff = this.execForAnalysis('git diff');
      } catch (error: unknown) {
        if (typeof error === 'object' && error && 'message' in error) {
          throw new GitCommandError(
            `Failed to check unstaged changes: ${(error as { message: string }).message}`,
          );
        } else {
          throw new GitCommandError(`Failed to check unstaged changes: ${String(error)}`);
        }
      }

      if (!unstagedDiff.trim()) {
        throw new GitNoChangesError('No changes found (staged or unstaged).');
      }

      diff = unstagedDiff;
      staged = false;
      if (verbose && !this.quiet) {
        this.logger.info('Using unstaged changes for commit message generation');
        this.logger.warn("Note: You'll need to stage these changes before committing");
      }
    } else if (verbose && !this.quiet) {
      this.logger.info('Using staged changes for commit message generation');
    }

    if (!diff.trim()) {
      throw new GitNoChangesError('No changes to commit.');
    }

    // Get stats
    const stats = this.getChangeStats(staged);

    if (verbose && !this.quiet && stats.files > 0) {
      this.logger.info('Change Statistics:');
      this.logger.info(`   Files changed: ${stats.files}`);
      this.logger.info(`   Insertions: ${stats.insertions}`);
      this.logger.info(`   Deletions: ${stats.deletions}`);
      this.logger.info('');
    }

    // Get file analysis
    const filesInfo = this.analyzeFileChanges(verbose, staged);

    return { diff, staged, stats, filesInfo };
  }

  private getChangeStats(staged: boolean): {
    files: number;
    insertions: number;
    deletions: number;
  } {
    const stats = { files: 0, insertions: 0, deletions: 0 };

    try {
      const statsCommand = staged ? 'git diff --cached --stat' : 'git diff --stat';
      const statsOutput = this.execForAnalysis(statsCommand);

      if (statsOutput) {
        const lines = statsOutput.split('\n');
        stats.files = Math.max(0, lines.length - 1);

        const summaryLine = lines[lines.length - 1];
        if (summaryLine) {
          const insertMatch = summaryLine.match(/(\d+) insertion/);
          const deleteMatch = summaryLine.match(/(\d+) deletion/);

          stats.insertions = insertMatch?.[1] ? parseInt(insertMatch[1], 10) : 0;
          stats.deletions = deleteMatch?.[1] ? parseInt(deleteMatch[1], 10) : 0;
        }
      }
    } catch {
      // Stats are optional, continue without them
    }

    return stats;
  }

  private analyzeFileChanges(verbose: boolean, staged: boolean): string {
    try {
      const command = staged ? 'git diff --cached --name-status' : 'git diff --name-status';
      const output = this.execForAnalysis(command);

      if (!output.trim()) {
        return '📁 0 files changed';
      }

      const lines = output.split('\n').filter(line => line.trim());
      let detailedInfo = '';
      let versionChanges = '';

      lines.forEach(line => {
        const parts = line.split('\t');
        const status = parts[0];

        if (!status) return;

        // Skip .git directory changes
        if (
          parts.some(
            part => part === '.git' || part.startsWith('.git/') || part.startsWith('.git\\'),
          )
        ) {
          return;
        }

        let action = 'modified';
        let displayPath = '';
        let diffPath = ''; // Path to use for git diff command

        // Handle different git status codes
        if (status.startsWith('R') && parts.length >= 3) {
          // Renamed file: R100	old_path	new_path
          action = 'renamed';
          const oldPath = parts[1] || '';
          const newPath = parts[2] || '';
          displayPath = `${oldPath} → ${newPath}`;
          diffPath = newPath;
        } else if (status.startsWith('C') && parts.length >= 3) {
          // Copied file: C100	original_path	new_path
          action = 'copied';
          const originalPath = parts[1] || '';
          const newPath = parts[2] || '';
          displayPath = `${originalPath} → ${newPath}`;
          diffPath = newPath;
        } else {
          // Regular file operations: A, D, M, etc.
          switch (status.charAt(0)) {
            case 'A':
              action = 'added';
              break;
            case 'D':
              action = 'deleted';
              break;
            case 'M':
              action = 'modified';
              break;
            default:
              action = 'modified';
          }
          displayPath = parts[1] || '';
          diffPath = parts[1] || '';
        }

        let changeSummary = '';
        if (action !== 'deleted' && diffPath) {
          try {
            const fileCommand = staged
              ? `git diff --cached "${diffPath}"`
              : `git diff "${diffPath}"`;
            const fileDiff = this.execForAnalysis(fileCommand);

            if (fileDiff) {
              const additions = (fileDiff.match(/^\+/gm) || []).length;
              const deletions = (fileDiff.match(/^-/gm) || []).length;
              const functionsAdded = (
                fileDiff.match(/^\+.*(function|def |const |let |var |interface |class )/gm) || []
              ).length;

              changeSummary = `(+${additions} -${deletions}`;
              if (functionsAdded > 0) {
                changeSummary += `, ${functionsAdded} new functions/vars`;
              }
              changeSummary += ')';

              // For version extraction, use the display path (might be old path for renames)
              const versionInfo = this.extractVersionChanges(diffPath, fileDiff);
              if (versionInfo) {
                versionChanges += `${versionInfo}\n`;
              }
            }
          } catch (error) {
            // File diff failed, continue without details
            this.logger.debug(`Failed to get diff for ${diffPath}:`, error);
          }
        }

        detailedInfo += `📄 ${displayPath} (${action}) ${changeSummary}\n`;

        if (verbose && action !== 'deleted' && diffPath) {
          try {
            const fileCommand = staged
              ? `git diff --cached "${diffPath}"`
              : `git diff "${diffPath}"`;
            const fileDiff = this.execForAnalysis(fileCommand);

            if (fileDiff) {
              const keyChanges = fileDiff
                .split('\n')
                .filter(line => line.startsWith('+') && !line.startsWith('+++'))
                .slice(0, 3);

              if (keyChanges.length > 0) {
                detailedInfo += '   Key additions:\n';
                keyChanges.forEach(line => {
                  detailedInfo += `   +${line.substring(1)}\n`;
                });
              }
            }
          } catch (error) {
            // Error getting file diff, continue
            this.logger.debug(`Failed to get verbose diff for ${diffPath}:`, error);
          }
        }
      });

      let result = `📁 ${lines.length} files changed:\n${detailedInfo}`;

      if (versionChanges.trim()) {
        result += `\n📦 Version Changes:\n${versionChanges}`;
      }

      return result;
    } catch (error) {
      this.logger.debug('Error analyzing file changes:', error);
      return '📁 Error analyzing file changes';
    }
  }

  private extractVersionChanges(filePath: string, fileDiff: string): string | null {
    if (filePath.endsWith('package.json')) {
      const oldVersion = fileDiff.match(/^[-]+[\s]*"version":\s*"([^"]+)"/m)?.[1];
      const newVersion = fileDiff.match(/^[+]+[\s]*"version":\s*"([^"]+)"/m)?.[1];

      if (oldVersion && newVersion && oldVersion !== newVersion && newVersion !== '..') {
        return `📦 package.json: Bumped version from ${oldVersion} to ${newVersion}`;
      } else if (newVersion && newVersion !== '..') {
        return `📦 package.json: Set version to ${newVersion}`;
      }
      return null;
    }

    if (filePath.endsWith('package-lock.json')) {
      const oldVersion = fileDiff.match(/^[-]+[\s]*"version":\s*"([^"]+)"/m)?.[1];
      const newVersion = fileDiff.match(/^[+]+[\s]*"version":\s*"([^"]+)"/m)?.[1];

      if (oldVersion && newVersion && oldVersion !== newVersion && newVersion !== '..') {
        return `📦 package-lock.json: Updated version from ${oldVersion} to ${newVersion}`;
      }
      if (!oldVersion && newVersion && newVersion !== '..') {
        return `📦 package-lock.json: Set version to ${newVersion}`;
      }
      return null;
    }

    if (filePath.includes('version') || filePath.includes('VERSION')) {
      const oldVersion = fileDiff.match(/^[-]+[\s]*([0-9]+\.[0-9]+\.[0-9]+)/m)?.[1];
      const newVersion = fileDiff.match(/^[+]+[\s]*([0-9]+\.[0-9]+\.[0-9]+)/m)?.[1];

      if (oldVersion && newVersion && oldVersion !== newVersion && newVersion !== '..') {
        return `📦 ${filePath}: Updated version from ${oldVersion} to ${newVersion}`;
      } else if (newVersion && newVersion !== '..') {
        return `📦 ${filePath}: Set version to ${newVersion}`;
      }
      return null;
    }

    return null;
  }

  getBranchName(): string {
    try {
      return this.execForAnalysis('git branch --show-current');
    } catch {
      return 'unknown';
    }
  }

  getLastCommitHash(): string {
    try {
      return this.execForAnalysis('git rev-parse HEAD');
    } catch {
      return '';
    }
  }

  getRepositoryRoot(): string {
    try {
      return this.execForAnalysis('git rev-parse --show-toplevel');
    } catch {
      return process.cwd();
    }
  }
}
