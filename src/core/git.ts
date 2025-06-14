import { execSync } from 'child_process';
import { Logger } from '../utils/logger';
import type { GitChanges } from '../types';
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

  constructor(directory: string = process.cwd(), logger: ILogger = Logger.getDefault()) {
    this.directory = directory;
    this.logger = logger;
  }

  private execCommand(command: string, options: { encoding?: BufferEncoding; cwd?: string } = {}): string {
    try {
      return execSync(command, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.directory,
        ...options,
      }).toString().trim();
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'message' in error) {
        throw new GitCommandError(`Git command failed: ${command}\n${(error as { message: string }).message}`);
      } else {
        throw new GitCommandError(`Git command failed: ${command}\n${String(error)}`);
      }
    }
  }

  isGitRepository(): boolean {
    try {
      this.execCommand('git rev-parse --git-dir');
      this.logger.debug(`Git repository check for ${this.directory}: Success`);
      return true;
    } catch (error) {
      this.logger.debug(`Git repository check for ${this.directory}: Failed`);
      this.logger.debug(`Error: ${error}`);
      return false;
    }
  }

  getChanges(verbose: boolean, autoStage: boolean): GitChanges {
    if (!this.isGitRepository()) {
      throw new GitRepositoryError('Not a git repository');
    }

    let diff = '';
    let staged = true;

    // First check for staged changes
    try {
      diff = this.execCommand('git diff --cached');
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'message' in error) {
        throw new GitCommandError(`Failed to get staged changes: ${(error as { message: string }).message}`);
      } else {
        throw new GitCommandError(`Failed to get staged changes: ${String(error)}`);
      }
    }

    if (!diff.trim()) {
      // No staged changes, check for unstaged changes
      let unstagedDiff = '';
      try {
        unstagedDiff = this.execCommand('git diff');
      } catch (error: unknown) {
        if (typeof error === 'object' && error && 'message' in error) {
          throw new GitCommandError(`Failed to check unstaged changes: ${(error as { message: string }).message}`);
        } else {
          throw new GitCommandError(`Failed to check unstaged changes: ${String(error)}`);
        }
      }

      if (!unstagedDiff.trim()) {
        // No staged or unstaged changes found - this is NOT a retryable error
        throw new GitNoChangesError('No changes found (staged or unstaged).');
      }

      // We have unstaged changes - decide what to do with them
      if (autoStage) {
        if (verbose) {
          this.logger.info('No staged changes found, staging all changes...');
        }
        try {
          this.execCommand('git add -A');
          diff = this.execCommand('git diff --cached');
          staged = true;
        } catch (error: unknown) {
          if (typeof error === 'object' && error && 'message' in error) {
            throw new GitCommandError(`Failed to stage changes: ${(error as { message: string }).message}`);
          } else {
            throw new GitCommandError(`Failed to stage changes: ${String(error)}`);
          }
        }
      } else {
        diff = unstagedDiff;
        staged = false;
        if (verbose) {
          Logger.info('Using unstaged changes for commit message generation');
          Logger.warn('Note: You\'ll need to stage these changes before committing');
        }
      }
    } else if (verbose) {
      Logger.info('Using staged changes for commit message generation');
    }

    // Final check - this should not happen but just in case
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

  private getChangeStats(staged: boolean): { files: number; insertions: number; deletions: number } {
    const stats = { files: 0, insertions: 0, deletions: 0 };

    try {
      const statsCommand = staged ? 'git diff --cached --stat' : 'git diff --stat';
      const statsOutput = this.execCommand(statsCommand);

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
      const output = this.execCommand(command);

      if (!output.trim()) {
        return '📁 0 files changed';
      }

      const lines = output.split('\n').filter(line => line.trim());
      let detailedInfo = '';

      lines.forEach(line => {
        const [status, ...pathParts] = line.split('\t');
        const path = pathParts.join('\t'); // Handle paths with tabs

        let action = 'modified';
        if (status) {
          switch (status.charAt(0)) {
            case 'A': action = 'added'; break;
            case 'D': action = 'deleted'; break;
            case 'M': action = 'modified'; break;
            case 'R': action = 'renamed'; break;
            case 'C': action = 'copied'; break;
          }
        }

        // Get change details for this file
        let changeSummary = '';
        if (action !== 'deleted') {
          try {
            const fileCommand = staged ? `git diff --cached "${path}"` : `git diff "${path}"`;
            const fileDiff = this.execCommand(fileCommand);

            if (fileDiff) {
              const additions = (fileDiff.match(/^\+/gm) || []).length;
              const deletions = (fileDiff.match(/^-/gm) || []).length;
              const functionsAdded = (fileDiff.match(/^\+.*(function|def |const |let |var |interface |class )/gm) || []).length;

              changeSummary = `(+${additions} -${deletions}`;
              if (functionsAdded > 0) {
                changeSummary += `, ${functionsAdded} new functions/vars`;
              }
              changeSummary += ')';
            }
          } catch {
            // File diff failed, continue without details
          }
        }

        detailedInfo += `📄 ${path} (${action}) ${changeSummary}\n`;

        // Show key changes for verbose mode
        if (verbose && action !== 'deleted') {
          try {
            const fileCommand = staged ? `git diff --cached "${path}"` : `git diff "${path}"`;
            const fileDiff = this.execCommand(fileCommand);

            if (fileDiff) {
              const keyChanges = fileDiff.split('\n')
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

      return `📁 ${lines.length} files changed:\n${detailedInfo}`;
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'message' in error) {
        return `📁 Unable to analyze file changes: ${(error as { message: string }).message}`;
      } else {
        return `📁 Unable to analyze file changes: ${String(error)}`;
      }
    }
  }

  getBranchName(): string {
    try {
      return this.execCommand('git branch --show-current');
    } catch {
      return 'unknown';
    }
  }

  getLastCommitHash(): string {
    try {
      return this.execCommand('git rev-parse HEAD');
    } catch {
      return '';
    }
  }

  getRepositoryRoot(): string {
    try {
      return this.execCommand('git rev-parse --show-toplevel');
    } catch {
      return process.cwd();
    }
  }
}
