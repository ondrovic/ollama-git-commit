import { spawn } from 'child_process';
import { ContextProvider } from '../types';
import { Logger } from '../utils/logger';
import { ILogger } from './interfaces';

export interface ContextData {
  provider: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface IContextService {
  gatherContext(
    providers: ContextProvider[],
    options: {
      directory: string;
      diff?: string;
      verbose?: boolean;
    },
  ): Promise<ContextData[]>;
}

export class ContextService implements IContextService {
  private logger: ILogger;

  constructor(logger: ILogger = Logger.getDefault()) {
    this.logger = logger;
  }

  async gatherContext(
    providers: ContextProvider[],
    options: { directory: string; diff?: string; verbose?: boolean },
  ): Promise<ContextData[]> {
    const contextData: ContextData[] = [];
    const { directory, diff, verbose } = options;

    for (const provider of providers) {
      if (!provider.enabled) continue;

      try {
        switch (provider.provider) {
          case 'code':
            contextData.push(await this.getCodeContext(directory, verbose));
            break;
          case 'docs':
            contextData.push(await this.getDocsContext(directory, verbose));
            break;
          case 'diff':
            if (diff) {
              contextData.push(await this.getDiffContext(diff, verbose));
            }
            break;
          case 'terminal':
            contextData.push(await this.getTerminalContext(directory, verbose));
            break;
          case 'problems':
            contextData.push(await this.getProblemsContext(directory, verbose));
            break;
          case 'folder':
            contextData.push(await this.getFolderContext(directory, verbose));
            break;
          case 'codebase':
            contextData.push(await this.getCodebaseContext(directory, verbose));
            break;
        }
      } catch (error) {
        if (verbose) {
          this.logger.warn(`Failed to gather context from ${provider.provider}: ${error}`);
        }
      }
    }

    return contextData;
  }

  private async getCodeContext(directory: string, verbose?: boolean): Promise<ContextData> {
    if (verbose) this.logger.info(`[Context] getCodeContext called with directory: ${directory}`);
    const changedFiles = await this.getChangedFiles(directory);
    if (verbose)
      this.logger.info(`[Context] getCodeContext found ${changedFiles.length} changed files`);
    const codeContext = changedFiles.map(file => `File: ${file}`).join('\n');
    return {
      provider: 'code',
      content: `Changed Files:\n${codeContext}`,
      metadata: { fileCount: changedFiles.length },
    };
  }

  private async getDocsContext(directory: string, verbose?: boolean): Promise<ContextData> {
    if (verbose) this.logger.info(`[Context] getDocsContext called with directory: ${directory}`);
    const docFiles = await this.findDocFiles(directory);
    if (verbose) this.logger.info(`[Context] getDocsContext found ${docFiles.length} doc files`);
    const docContext = docFiles.map(file => `Doc: ${file}`).join('\n');
    return {
      provider: 'docs',
      content: `Documentation Files:\n${docContext}`,
      metadata: { docCount: docFiles.length },
    };
  }

  private async getDiffContext(diff: string, verbose?: boolean): Promise<ContextData> {
    if (verbose) this.logger.info('[Context] getDiffContext called');
    const diffAnalysis = this.analyzeDiff(diff);
    if (verbose) this.logger.info(`[Context] getDiffContext analysis: ${diffAnalysis}`);
    return {
      provider: 'diff',
      content: `Diff Analysis:\n${diffAnalysis}`,
      metadata: {
        linesChanged: diff.split('\n').length,
        hasAdditions: diff.includes('+'),
        hasDeletions: diff.includes('-'),
      },
    };
  }

  private async getTerminalContext(directory: string, verbose?: boolean): Promise<ContextData> {
    if (verbose)
      this.logger.info(`[Context] getTerminalContext called with directory: ${directory}`);
    const shellInfo = await this.getShellInfo();
    if (verbose) this.logger.info(`[Context] getTerminalContext shellInfo: ${shellInfo}`);
    return {
      provider: 'terminal',
      content: `Shell Context:\n${shellInfo}`,
      metadata: { timestamp: new Date().toISOString() },
    };
  }

  private async getProblemsContext(directory: string, verbose?: boolean): Promise<ContextData> {
    if (verbose)
      this.logger.info(`[Context] getProblemsContext called with directory: ${directory}`);
    const problems = await this.detectProblems(directory);
    if (verbose) this.logger.info(`[Context] getProblemsContext found: ${problems}`);
    return {
      provider: 'problems',
      content: `Detected Issues:\n${problems}`,
      metadata: { problemCount: problems.split('\n').filter(line => line.trim()).length },
    };
  }

  private async getFolderContext(directory: string, verbose?: boolean): Promise<ContextData> {
    if (verbose) this.logger.info(`[Context] getFolderContext called with directory: ${directory}`);
    const folderStructure = await this.getFolderStructure(directory);
    if (verbose) this.logger.info(`[Context] getFolderContext structure: ${folderStructure}`);
    return {
      provider: 'folder',
      content: `Project Structure:\n${folderStructure}`,
      metadata: { directory },
    };
  }

  private async getCodebaseContext(directory: string, verbose?: boolean): Promise<ContextData> {
    if (verbose)
      this.logger.info(`[Context] getCodebaseContext called with directory: ${directory}`);
    const codebaseStats = await this.getCodebaseStats(directory);
    if (verbose) this.logger.info(`[Context] getCodebaseContext stats: ${codebaseStats}`);
    return {
      provider: 'codebase',
      content: `Codebase Overview:\n${codebaseStats}`,
      metadata: { analysis: 'overview' },
    };
  }

  // Helper methods
  private async getChangedFiles(directory: string): Promise<string[]> {
    try {
      const result = await this.execCommand('git', ['diff', '--name-only'], directory);
      return result.split('\n').filter(line => line.trim());
    } catch {
      return [];
    }
  }

  private async findDocFiles(directory: string): Promise<string[]> {
    const docFiles: string[] = [];
    const docPatterns = ['README*', 'docs/**/*', '*.md', '*.txt'];

    for (const pattern of docPatterns) {
      try {
        const result = await this.execCommand(
          'find',
          [directory, '-name', pattern, '-type', 'f'],
          directory,
        );
        docFiles.push(...result.split('\n').filter(line => line.trim()));
      } catch {
        // Pattern not found, continue
      }
    }

    return docFiles.slice(0, 10); // Limit to first 10 docs
  }

  private analyzeDiff(diff: string): string {
    const lines = diff.split('\n');
    const additions = lines.filter(line => line.startsWith('+') && !line.startsWith('+++')).length;
    const deletions = lines.filter(line => line.startsWith('-') && !line.startsWith('---')).length;
    const filesChanged = (diff.match(/^diff --git/gm) || []).length;

    return `Files changed: ${filesChanged}\nLines added: ${additions}\nLines removed: ${deletions}`;
  }

  private async getShellInfo(): Promise<string> {
    try {
      const pwd = await this.execCommand('pwd', []);
      const user = await this.execCommand('whoami', []);
      return `Current directory: ${pwd}\nUser: ${user}`;
    } catch {
      return 'Shell info unavailable';
    }
  }

  private async detectProblems(directory: string): Promise<string> {
    const problems: string[] = [];

    // Check for common problem indicators
    try {
      // Check for lint errors
      const lintResult = await this.execCommand('npm', ['run', 'lint'], directory);
      if (lintResult.includes('error')) {
        problems.push('Lint errors detected');
      }
    } catch {
      // No lint script or other issues
    }

    try {
      // Check for build issues
      const buildResult = await this.execCommand('npm', ['run', 'build'], directory);
      if (buildResult.includes('error')) {
        problems.push('Build errors detected');
      }
    } catch {
      // No build script or other issues
    }

    return problems.length > 0 ? problems.join('\n') : 'No obvious problems detected';
  }

  private async getFolderStructure(directory: string): Promise<string> {
    try {
      const result = await this.execCommand(
        'find',
        [directory, '-type', 'd', '-maxdepth', '3'],
        directory,
      );
      const dirs = result.split('\n').filter(line => line.trim() && line !== directory);
      return dirs.slice(0, 20).join('\n'); // Limit to first 20 directories
    } catch {
      return 'Folder structure unavailable';
    }
  }

  private async getCodebaseStats(directory: string): Promise<string> {
    try {
      const fileCount = await this.execCommand(
        'find',
        [
          directory,
          '-type',
          'f',
          '-name',
          '*.js',
          '-o',
          '-name',
          '*.ts',
          '-o',
          '-name',
          '*.py',
          '-o',
          '-name',
          '*.java',
        ],
        directory,
      );
      const lineCount = await this.execCommand(
        'find',
        [
          directory,
          '-type',
          'f',
          '-name',
          '*.js',
          '-o',
          '-name',
          '*.ts',
          '-o',
          '-name',
          '*.py',
          '-o',
          '-name',
          '*.java',
          '-exec',
          'wc',
          '-l',
          '{}',
          '+',
        ],
        directory,
      );

      const files = fileCount.split('\n').filter(line => line.trim()).length;
      const lines = lineCount.split('\n').filter(line => line.trim()).length;

      return `Files: ${files}\nLines of code: ${lines}`;
    } catch {
      return 'Codebase stats unavailable';
    }
  }

  private execCommand(command: string, args: string[], cwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', data => {
        stdout += data.toString();
      });

      child.stderr.on('data', data => {
        stderr += data.toString();
      });

      child.on('close', code => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Command failed: ${stderr}`));
        }
      });

      child.on('error', error => {
        reject(error);
      });
    });
  }
}
