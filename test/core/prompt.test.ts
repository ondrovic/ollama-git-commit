import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { PromptService } from '../../src/core/prompt';
import { Logger } from '../../src/utils/logger';
import { mockFs } from '../setup';
import { PROMPTS } from '../../src/constants/prompts';

describe('PromptService', () => {
  let promptService: PromptService;
  let logger: Logger;

  beforeAll(() => {
    logger = new Logger();
    logger.setVerbose(true);
    promptService = new PromptService(logger);
  });

  test('getPromptTemplates should return all prompt templates', () => {
    const templates = promptService.getPromptTemplates();
    expect(templates).toHaveProperty('default');
    expect(templates).toHaveProperty('conventional');
    expect(templates).toHaveProperty('simple');
    expect(templates).toHaveProperty('detailed');
  });

  test('default prompt template should match the imported default prompt', () => {
    const templates = promptService.getPromptTemplates();
    expect(templates.default).toBe(PROMPTS.DEFAULT);
  });

  test('conventional prompt template should match the imported conventional prompt', () => {
    const templates = promptService.getPromptTemplates();
    expect(templates.conventional).toBe(PROMPTS.CONVENTIONAL);
  });

  test('simple prompt template should match the imported simple prompt', () => {
    const templates = promptService.getPromptTemplates();
    expect(templates.simple).toBe(PROMPTS.SIMPLE);
  });

  test('detailed prompt template should match the imported detailed prompt', () => {
    const templates = promptService.getPromptTemplates();
    expect(templates.detailed).toBe(PROMPTS.DETAILED);
  });

  test('createPromptFromTemplate should return the correct template', () => {
    expect(promptService.createPromptFromTemplate('default')).toBe(PROMPTS.DEFAULT);
    expect(promptService.createPromptFromTemplate('conventional')).toBe(PROMPTS.CONVENTIONAL);
    expect(promptService.createPromptFromTemplate('simple')).toBe(PROMPTS.SIMPLE);
    expect(promptService.createPromptFromTemplate('detailed')).toBe(PROMPTS.DETAILED);
  });

  test('createPromptFromTemplate should throw error for invalid template', () => {
    expect(() => promptService.createPromptFromTemplate('invalid')).toThrow();
  });

  test('validatePrompt should validate prompts correctly', () => {
    const validResult = promptService.validatePrompt(PROMPTS.DEFAULT);
    expect(validResult.valid).toBe(true);
    expect(validResult.errors).toHaveLength(0);

    const invalidResult = promptService.validatePrompt('');
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors).toContain('Prompt cannot be empty');
  });

  test('buildCommitPrompt should format the prompt correctly', () => {
    const filesInfo = 'test files';
    const diff = 'test diff';
    const systemPrompt = 'test system prompt';

    const result = promptService.buildCommitPrompt(filesInfo, diff, systemPrompt);
    expect(result).toContain(systemPrompt);
    expect(result).toContain(filesInfo);
    expect(result).toContain(diff);
  });

  test('buildCommitPrompt should truncate large diffs', () => {
    const filesInfo = 'test files';
    const largeDiff = Array(5000).fill('a').join('\n'); // 5000 lines
    const systemPrompt = 'test system prompt';

    const result = promptService.buildCommitPrompt(filesInfo, largeDiff, systemPrompt);

    // Extract the GIT DIFF section
    const diffSection = result.split('GIT DIFF:')[1];
    // Get the lines before the truncation message
    const truncatedLines = diffSection.split('[... diff truncated')[0].split('\n').filter(Boolean);
    // Should be 100 lines
    expect(truncatedLines.length).toBe(100);
    expect(result).toContain('[... diff truncated');
    expect(result).toContain('Total files changed');
  });
});
