import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { Logger } from '../utils/logger';

export class PromptService {
  private readonly defaultPrompt = `Write short commit messages:
- The first line should be a short summary of the changes
- Remember to mention the files that were changed, and what was changed
- Explain the 'why' behind changes
- Use bullet points for multiple changes
- Tone: Use a LOT of emojis, be funny, and expressive. Feel free to be profane, but don't be offensive
- If there are no changes, or the input is blank - then return a blank string

Think carefully before you write your commit message.

The output format should be:

Summary of changes
- changes
- changes

What you write will be passed directly to git commit -m "[message]"`;

  getSystemPrompt(promptFile: string, verbose: boolean): string {
    // Create prompt directory if it doesn't exist
    const promptDir = dirname(promptFile);
    if (!existsSync(promptDir)) {
      mkdirSync(promptDir, { recursive: true });
    }

    // Create default prompt if file doesn't exist
    if (!existsSync(promptFile)) {
      if (verbose) {
        Logger.info(`Creating default prompt file at ${promptFile}`);
      }

      try {
        writeFileSync(promptFile, this.defaultPrompt, 'utf8');
      } catch (error: any) {
        throw new Error(`❌ Failed to create prompt file at ${promptFile}: ${error.message}`);
      }
    }

    if (verbose) {
      Logger.info(`Using prompt file: ${promptFile}`);
    }

    // Verify the file exists and is readable
    if (!existsSync(promptFile)) {
      throw new Error(`❌ Cannot read prompt file: ${promptFile}`);
    }

    try {
      return readFileSync(promptFile, 'utf8');
    } catch (error: any) {
      throw new Error(`❌ Failed to read prompt file: ${error.message}`);
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
      
      const remaining = lines.length - 100;
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

Please analyze these changes and create a meaningful commit message following the format specified above.`;
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
      default: this.defaultPrompt,
      
      conventional: `Generate conventional commit messages following the format: type(scope): description

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert

Rules:
- Use lowercase for type and description
- Keep description under 72 characters
- Add body with bullet points for multiple changes
- Be specific about what changed and why
- Use present tense

Format:
type(scope): short description

- detailed change 1
- detailed change 2`,

      simple: `Create simple, clear commit messages:

- Start with a verb (add, fix, update, remove, etc.)
- Mention what files or features were changed
- Keep it concise but informative
- Use normal capitalization
- No need for emojis or special formatting

Example: "Fix user authentication bug in login component"`,

      detailed: `Generate comprehensive commit messages with full context:

- Start with a clear, descriptive summary (50-72 chars)
- Include the reasoning behind the changes
- List all modified files and their purposes
- Explain any breaking changes or side effects
- Use technical language appropriate for developers
- Include relevant issue numbers if mentioned in diff
- Use emojis sparingly for categorization

Format:
🔧 Summary of the main change

Context:
- Why this change was needed
- What problem it solves

Changes:
- Detailed list of modifications
- File-by-file breakdown when helpful

Impact:
- Any breaking changes
- Performance implications
- Testing considerations`,
    };
  }

  createPromptFromTemplate(templateName: string): string {
    const templates = this.getPromptTemplates();
    
    if (!templates[templateName]) {
      throw new Error(`Template '${templateName}' not found. Available templates: ${Object.keys(templates).join(', ')}`);
    }

    return templates[templateName];
  }
}