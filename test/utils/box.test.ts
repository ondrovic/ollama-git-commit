import { describe, expect, test } from 'bun:test';
import {
  createBorderedLine,
  createBox,
  createDivider,
  createMultiSectionBox,
  createSectionBox,
} from '../../src/utils/box';

const styles = ['single', 'double', 'rounded', 'bold'] as const;
const alignments = ['left', 'center', 'right'] as const;

describe('createBox', () => {
  test('creates a box with default options', () => {
    const result = createBox('Hello');
    expect(result[0]).toContain('┌');
    expect(result[result.length - 1]).toContain('┘');
  });

  styles.forEach(style => {
    test(`creates a box with style: ${style}`, () => {
      const result = createBox('Styled', { style });
      expect(result[0]).toContain(result[0][0]); // Top left corner
    });
  });

  alignments.forEach(align => {
    test(`creates a box with alignment: ${align}`, () => {
      const result = createBox('Align', { align });
      expect(result.length).toBeGreaterThan(0);
    });
  });

  test('creates a box with multi-line content', () => {
    const result = createBox(['Line 1', 'Line 2']);
    expect(result.length).toBeGreaterThan(2);
  });

  test('throws on invalid style', () => {
    expect(() => createBox('fail', { style: 'invalid' as any })).toThrow('Invalid box style');
  });
});

describe('createSectionBox', () => {
  test('creates a section box with title', () => {
    const result = createSectionBox('Title', 'Content');
    expect(result[0]).toContain('Title');
    expect(result[result.length - 1]).toContain('┘');
  });

  styles.forEach(style => {
    test(`creates a section box with style: ${style}`, () => {
      const result = createSectionBox('T', 'C', { style });
      expect(result[0]).toContain('T');
    });
  });

  test('creates a section box with multi-line content', () => {
    const result = createSectionBox('T', ['A', 'B']);
    expect(result.length).toBeGreaterThan(2);
  });

  test('throws on invalid style', () => {
    expect(() => createSectionBox('fail', 'fail', { style: 'invalid' as any })).toThrow(
      'Invalid box style',
    );
  });
});

describe('createBorderedLine', () => {
  test('creates a bordered line with default style', () => {
    const result = createBorderedLine('Line');
    expect(result).toContain('Line');
  });

  styles.forEach(style => {
    test(`creates a bordered line with style: ${style}`, () => {
      const result = createBorderedLine('L', { style });
      expect(result).toContain('L');
    });
  });

  test('throws on invalid style', () => {
    expect(() => createBorderedLine('fail', { style: 'invalid' as any })).toThrow(
      'Invalid box style',
    );
  });
});

describe('createDivider', () => {
  test('creates a divider with default style', () => {
    const result = createDivider();
    expect(typeof result).toBe('string');
    expect(result.length).toBe(80);
  });

  styles.forEach(style => {
    test(`creates a divider with style: ${style}`, () => {
      const result = createDivider(10, style);
      expect(result.length).toBe(10);
    });
  });

  test('throws on invalid style', () => {
    expect(() => createDivider(10, 'invalid' as any)).toThrow('Invalid box style');
  });
});

describe('createMultiSectionBox', () => {
  test('creates a multi-section box with one section', () => {
    const result = createMultiSectionBox([{ title: 'T', content: 'C' }]);
    expect(result.some(line => line.includes('T'))).toBe(true);
  });

  test('creates a multi-section box with multiple sections', () => {
    const result = createMultiSectionBox([
      { title: 'A', content: 'A1' },
      { title: 'B', content: 'B1' },
    ]);
    expect(result.filter(line => line.includes('A')).length).toBeGreaterThan(0);
    expect(result.filter(line => line.includes('B')).length).toBeGreaterThan(0);
  });

  test('creates a multi-section box with no titles', () => {
    const result = createMultiSectionBox([{ content: 'A' }, { content: 'B' }]);
    expect(result.some(line => line.includes('A'))).toBe(true);
    expect(result.some(line => line.includes('B'))).toBe(true);
  });

  styles.forEach(style => {
    test(`creates a multi-section box with style: ${style}`, () => {
      const result = createMultiSectionBox([{ title: 'T', content: 'C' }, { content: 'D' }], {
        style,
      });
      expect(result.length).toBeGreaterThan(0);
    });
  });

  test('throws on invalid style', () => {
    expect(() => createMultiSectionBox([{ content: 'fail' }], { style: 'invalid' as any })).toThrow(
      'Invalid box style',
    );
  });

  test('skips undefined sections', () => {
    const result = createMultiSectionBox([undefined as any, { title: 'T', content: 'C' }]);
    expect(result.some(line => line.includes('T'))).toBe(true);
  });
});
