import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { PROMPTS } from '../constants/prompts';
import { ContextProvider } from '../types';
import { Logger } from '../utils/logger';
import { ContextData, ContextService } from './context';
import { ILogger, IOllamaService, IPromptService } from './interfaces';

export class PromptService implements IPromptService {
  private readonly defaultPrompt = PROMPTS.DEFAULT;
  private logger: ILogger;

  constructor(logger: ILogger = Logger.getDefault()) {
    this.logger = logger;
  }

  getSystemPrompt(promptFile: string, verbose: boolean, promptTemplate?: string): string {
    // Create prompt directory if it doesn't exist
    const promptDir = dirname(promptFile);
    if (!existsSync(promptDir)) {
      mkdirSync(promptDir, { recursive: true });
    }

    // Create default prompt if file doesn't exist
    if (!existsSync(promptFile)) {
      if (verbose) {
        this.logger.info(`Creating prompt file at ${promptFile}`);
      }

      try {
        // Use the specified template or fall back to default
        const template = promptTemplate
          ? this.createPromptFromTemplate(promptTemplate)
          : this.defaultPrompt;
        writeFileSync(promptFile, template, 'utf8');
      } catch (error: unknown) {
        if (typeof error === 'object' && error && 'message' in error) {
          throw new Error(
            `❌ Failed to create prompt file at ${promptFile}: ${(error as { message: string }).message}`,
          );
        } else {
          throw new Error(`❌ Failed to create prompt file at ${promptFile}: ${String(error)}`);
        }
      }
    }

    if (verbose) {
      this.logger.info(`Using prompt file: ${promptFile}`);
    }

    // Verify the file exists and is readable
    if (!existsSync(promptFile)) {
      throw new Error(`❌ Cannot read prompt file: ${promptFile}`);
    }

    try {
      return readFileSync(promptFile, 'utf8');
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'message' in error) {
        throw new Error(`❌ Failed to read prompt file: ${(error as { message: string }).message}`);
      } else {
        throw new Error(`❌ Failed to read prompt file: ${String(error)}`);
      }
    }
  }

  buildCommitPrompt(filesInfo: string, diff: string, systemPrompt: string): string {
    // Truncate diff if too large to avoid API limits
    let truncatedDiff = diff;
    const maxDiffLength = 4000;

    if (diff.length > maxDiffLength) {
      const lines = diff.split('\n');
      const truncatedLines = lines.slice(0, 100);
      truncatedDiff = truncatedLines.join('\n');

      truncatedDiff += `\n\n[... diff truncated - showing first 100 lines of ${lines.length} total lines ...]`;

      const fileCount = (diff.match(/^diff --git/gm) || []).length;
      truncatedDiff += `\n[Total files changed: ${fileCount}]`;
    }

    // Clean up any problematic characters that might break the prompt
    truncatedDiff = truncatedDiff.replace(/\r/g, '');

    return `${systemPrompt}

CONTEXT:
${filesInfo}

GIT DIFF:
${truncatedDiff}

Please analyze these changes and create a meaningful commit message following the format specified above.

IMPORTANT: Maintain a professional, factual tone throughout. Focus on what was changed and why it was necessary. Avoid humor, commentary, or unnecessary text.`;
  }

  async buildCommitPromptWithEmbeddings(
    filesInfo: string,
    diff: string,
    systemPrompt: string,
    ollamaService: IOllamaService,
    embeddingsModel: string,
    host: string,
  ): Promise<string> {
    // First build the basic prompt
    const basicPrompt = this.buildCommitPrompt(filesInfo, diff, systemPrompt);

    try {
      // Generate embeddings for the diff to provide additional context
      await ollamaService.generateEmbeddings(embeddingsModel, diff, host);

      // For now, we'll just add a note that embeddings were used
      // In a more sophisticated implementation, you could use these embeddings
      // to find similar commits or provide semantic context
      const embeddingNote = `\n[Embeddings generated using ${embeddingsModel} for enhanced context analysis]

IMPORTANT: Maintain a professional, factual tone throughout. Focus on what was changed and why it was necessary. Avoid humor, commentary, or unnecessary text.`;

      return basicPrompt + embeddingNote;
    } catch (error) {
      // If embeddings fail, fall back to basic prompt
      this.logger.warn(`Failed to generate embeddings: ${error}. Using basic prompt.`);
      return basicPrompt;
    }
  }

  async buildCommitPromptWithContext(
    filesInfo: string,
    diff: string,
    systemPrompt: string,
    contextProviders: ContextProvider[],
    directory: string,
    verbose?: boolean,
  ): Promise<string> {
    // First build the basic prompt
    const basicPrompt = this.buildCommitPrompt(filesInfo, diff, systemPrompt);

    if (!contextProviders || contextProviders.length === 0) {
      return basicPrompt;
    }

    try {
      const contextService = new ContextService(this.logger);
      const contextData = await contextService.gatherContext(contextProviders, {
        directory,
        diff,
        verbose,
      });

      if (contextData.length === 0) {
        return basicPrompt;
      }

      // Build context section
      const contextSection = this.buildContextSection(contextData);

      return `${basicPrompt}

ADDITIONAL CONTEXT:
${contextSection}

IMPORTANT: Maintain a professional, factual tone throughout. Focus on what was changed and why it was necessary. Avoid humor, commentary, or unnecessary text.`;
    } catch (error) {
      if (verbose) {
        this.logger.warn(`Failed to gather context: ${error}. Using basic prompt.`);
      }
      return basicPrompt;
    }
  }

  private buildContextSection(contextData: ContextData[]): string {
    const sections: string[] = [];

    for (const data of contextData) {
      if (data.content && data.content.trim()) {
        sections.push(`[${data.provider.toUpperCase()} CONTEXT]
${data.content}
`);
      }
    }

    return sections.join('\n');
  }

  validatePrompt(prompt: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!prompt || prompt.trim().length === 0) {
      errors.push('Prompt cannot be empty');
    }

    if (prompt.length < 50) {
      errors.push('Prompt seems too short (less than 50 characters)');
    }

    if (prompt.length > 10000) {
      errors.push('Prompt is too long (more than 10,000 characters)');
    }

    // Check for common prompt issues
    if (!prompt.includes('commit')) {
      errors.push('Prompt should mention "commit" to provide context');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getPromptTemplates(): Record<string, string> {
    return {
      default: PROMPTS.DEFAULT,
      conventional: PROMPTS.CONVENTIONAL,
      simple: PROMPTS.SIMPLE,
      detailed: PROMPTS.DETAILED,
    };
  }

  createPromptFromTemplate(templateName: string): string {
    const templates = this.getPromptTemplates();

    if (!templates[templateName]) {
      throw new Error(
        `Template '${templateName}' not found. Available templates: ${Object.keys(templates).join(', ')}`,
      );
    }

    return templates[templateName];
  }
}
