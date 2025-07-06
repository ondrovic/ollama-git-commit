import { describe, expect, test } from 'bun:test';
import { CONFIGURATIONS } from '../src/constants/configurations';

describe('Top-level CONFIGURATIONS.MESSAGES coverage', () => {
  test('should call all message functions', () => {
    const sourceInfo = {
      model: 'test',
      host: 'test',
      promptFile: 'test',
      promptTemplate: 'test',
      verbose: 'test',
      interactive: 'test',
      debug: 'test',
      autoStage: 'test',
      autoModel: 'test',
      autoCommit: 'test',
      useEmojis: 'test',
      quiet: 'test',
      timeouts: { connection: 'test', generation: 'test', modelPull: 'test' },
    };
    expect(typeof CONFIGURATIONS.MESSAGES.CORE_SETTINGS('a', 'b', 'c', 'd', sourceInfo)).toBe(
      'string',
    );
    expect(
      typeof CONFIGURATIONS.MESSAGES.BEHAVIOR_SETTINGS(
        true,
        false,
        true,
        false,
        true,
        false,
        true,
        false,
        sourceInfo,
      ),
    ).toBe('string');
    expect(typeof CONFIGURATIONS.MESSAGES.TIMEOUTS(1, 2, 3, sourceInfo)).toBe('string');
    expect(typeof CONFIGURATIONS.MESSAGES.MODELS([], 'test')).toBe('string');
    expect(typeof CONFIGURATIONS.MESSAGES.CONTEXT([])).toBe('string');
  });
});
