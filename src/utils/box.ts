/**
 * Box drawing utility for creating bordered text outputs
 */

import stringWidth from 'string-width';

export interface BoxOptions {
  width?: number;
  padding?: number;
  style?: 'single' | 'double' | 'rounded' | 'bold';
  align?: 'left' | 'center' | 'right';
}

export interface BoxStyle {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
  topTee: string;
  bottomTee: string;
  leftTee: string;
  rightTee: string;
}

const BOX_STYLES: Record<string, BoxStyle> = {
  single: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    topTee: '┬',
    bottomTee: '┴',
    leftTee: '├',
    rightTee: '┤',
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
    topTee: '╦',
    bottomTee: '╩',
    leftTee: '╠',
    rightTee: '╣',
  },
  rounded: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
    topTee: '┬',
    bottomTee: '┴',
    leftTee: '├',
    rightTee: '┤',
  },
  bold: {
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
    horizontal: '━',
    vertical: '┃',
    topTee: '┳',
    bottomTee: '┻',
    leftTee: '┣',
    rightTee: '┫',
  },
};

/**
 * Creates a boxed text output with the specified content and style
 */
export function createBox(content: string | string[], options: BoxOptions = {}): string[] {
  const { width = 80, padding = 1, style = 'single', align = 'left' } = options;

  const boxStyle = BOX_STYLES[style];
  if (!boxStyle) {
    throw new Error(`Invalid box style: ${style}`);
  }

  const lines = Array.isArray(content) ? content : content.split('\n');
  const maxLineLength = Math.max(...lines.map(line => stringWidth(line)));
  const boxWidth = Math.max(width, maxLineLength + padding * 2 + 2);

  const result: string[] = [];
  const horizontalLine = boxStyle.horizontal.repeat(boxWidth - 2);

  // Top border
  result.push(`${boxStyle.topLeft}${horizontalLine}${boxStyle.topRight}`);

  // Content lines
  for (const line of lines) {
    const paddedLine = padLine(line, boxWidth - 2, padding, align);
    result.push(`${boxStyle.vertical}${paddedLine}${boxStyle.vertical}`);
  }

  // Bottom border
  result.push(`${boxStyle.bottomLeft}${horizontalLine}${boxStyle.bottomRight}`);

  return result;
}

/**
 * Creates a section box with a title
 */
export function createSectionBox(
  title: string,
  content: string | string[],
  options: BoxOptions = {},
): string[] {
  const { width = 80, padding = 1, style = 'single', align = 'left' } = options;

  const boxStyle = BOX_STYLES[style];
  if (!boxStyle) {
    throw new Error(`Invalid box style: ${style}`);
  }

  const lines = Array.isArray(content) ? content : content.split('\n');
  const maxLineLength = Math.max(stringWidth(title), ...lines.map(line => stringWidth(line)));
  const boxWidth = Math.max(width, maxLineLength + padding * 2 + 2);

  const result: string[] = [];
  const horizontalLine = boxStyle.horizontal.repeat(boxWidth - 2);

  // Top border with title
  const titlePadding = Math.max(0, boxWidth - 2 - stringWidth(title) - 2);
  const leftPadding = Math.floor(titlePadding / 2);
  const rightPadding = titlePadding - leftPadding;

  const topLine = `${boxStyle.topLeft}${boxStyle.horizontal.repeat(leftPadding)} ${title} ${boxStyle.horizontal.repeat(rightPadding)}${boxStyle.topRight}`;
  result.push(topLine);

  // Content lines
  for (const line of lines) {
    const paddedLine = padLine(line, boxWidth - 2, padding, align);
    result.push(`${boxStyle.vertical}${paddedLine}${boxStyle.vertical}`);
  }

  // Bottom border
  result.push(`${boxStyle.bottomLeft}${horizontalLine}${boxStyle.bottomRight}`);

  return result;
}

/**
 * Creates a simple bordered line
 */
export function createBorderedLine(content: string, options: BoxOptions = {}): string {
  const { style = 'single' } = options;
  const boxStyle = BOX_STYLES[style];

  if (!boxStyle) {
    throw new Error(`Invalid box style: ${style}`);
  }

  return `${boxStyle.leftTee}─ ${content} ─${boxStyle.rightTee}`;
}

/**
 * Creates a horizontal divider
 */
export function createDivider(width = 80, style = 'single'): string {
  const boxStyle = BOX_STYLES[style];
  if (!boxStyle) {
    throw new Error(`Invalid box style: ${style}`);
  }

  return boxStyle.horizontal.repeat(width);
}

/**
 * Helper function to pad a line with proper alignment
 */
function padLine(
  line: string,
  totalWidth: number,
  padding: number,
  align: 'left' | 'center' | 'right',
): string {
  const contentWidth = totalWidth - padding * 2;
  const trimmedLine = line.slice(0, contentWidth);

  let paddedLine: string;
  let leftPadding: number;
  let rightPadding: number;
  let rightPad: number;
  let leftPad: number;

  switch (align) {
    case 'center':
      leftPadding = Math.floor((contentWidth - stringWidth(trimmedLine)) / 2);
      rightPadding = contentWidth - stringWidth(trimmedLine) - leftPadding;
      paddedLine = ' '.repeat(leftPadding) + trimmedLine + ' '.repeat(rightPadding);
      break;
    case 'right':
      rightPad = contentWidth - stringWidth(trimmedLine);
      paddedLine = ' '.repeat(rightPad) + trimmedLine;
      break;
    case 'left':
    default:
      leftPad = contentWidth - stringWidth(trimmedLine);
      paddedLine = trimmedLine + ' '.repeat(leftPad);
      break;
  }

  return ' '.repeat(padding) + paddedLine + ' '.repeat(padding);
}

/**
 * Utility to create a box with multiple sections
 */
export function createMultiSectionBox(
  sections: Array<{ title?: string; content: string | string[] }>,
  options: BoxOptions = {},
): string[] {
  const { style = 'single' } = options;
  const boxStyle = BOX_STYLES[style];

  if (!boxStyle) {
    throw new Error(`Invalid box style: ${style}`);
  }

  const result: string[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    if (!section) {
      continue;
    }

    if (i > 0) {
      // Add separator between sections
      result.push(createBorderedLine('', { style }));
    }

    if (section.title) {
      const sectionBox = createSectionBox(section.title, section.content, options);
      result.push(...sectionBox);
    } else {
      const box = createBox(section.content, options);
      result.push(...box);
    }
  }

  return result;
}
