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

export class GitService implements IGitService {
  private directory: string;
  private logger: ILogger;
  private quiet: boolean;
  private execSyncFn: typeof realExecSync;

  constructor(
    directory: string = process.cwd(),
    logger: ILogger = Logger.getDefault(),
    quiet = false,
    execSyncFn: typeof realExecSync = realExecSync,
  ) {
    this.directory = directory;
    this.logger = logger;
    this.quiet = quiet;
    this.execSyncFn = execSyncFn;
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
      if (verbose) {
        Logger.info('Using unstaged changes for commit message generation');
        Logger.warn("Note: You'll need to stage these changes before committing");
      }
    } else if (verbose) {
      Logger.info('Using staged changes for commit message generation');
    }

    if (!diff.trim()) {
      throw new GitNoChangesError('No changes to commit.');
    }

    // Get stats
    const stats = this.getChangeStats(staged);

    if (verbose && stats.files > 0) {
      Logger.info('Change Statistics:');
      console.log(`   Files changed: ${stats.files}`);
      console.log(`   Insertions: ${stats.insertions}`);
      console.log(`   Deletions: ${stats.deletions}`);
      console.log('');
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
        const [status, ...pathParts] = line.split('\t');
        const path = pathParts.join('\t');

        if (path === '.git' || path.startsWith('.git/') || path.startsWith('.git\\')) {
          return;
        }

        let action = 'modified';
        if (status) {
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
            case 'R':
              action = 'renamed';
              break;
            case 'C':
              action = 'copied';
              break;
          }
        }

        let changeSummary = '';
        if (action !== 'deleted') {
          try {
            const fileCommand = staged ? `git diff --cached "${path}"` : `git diff "${path}"`;
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

              const versionInfo = this.extractVersionChanges(path, fileDiff);
              if (versionInfo) {
                versionChanges += `${versionInfo}\n`;
              }
            }
          } catch {
            // File diff failed, continue without details
          }
        }

        detailedInfo += `📄 ${path} (${action}) ${changeSummary}\n`;

        if (verbose && action !== 'deleted') {
          try {
            const fileCommand = staged ? `git diff --cached "${path}"` : `git diff "${path}"`;
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
          } catch {
            // Error getting file diff, continue
          }
        }
      });

      let result = `📁 ${lines.length} files changed:\n${detailedInfo}`;

      if (versionChanges.trim()) {
        result += `\n📦 Version Changes:\n${versionChanges}`;
      }

      return result;
    } catch {
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
