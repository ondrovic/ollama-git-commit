import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { Logger } from '../../src/utils/logger';

// Mock console methods to avoid real side effects
const mockConsole = {
  info: mock(() => {}),
  log: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
  table: mock(() => {}),
  group: mock(() => {}),
  groupEnd: mock(() => {}),
  time: mock(() => {}),
  timeEnd: mock(() => {}),
};

// Store original console methods
const originalConsole = { ...console };

beforeEach(() => {
  // Replace console methods with mocks
  Object.assign(console, mockConsole);
  // Reset all mocks
  Object.values(mockConsole).forEach(mockFn => {
    if (mockFn.mockReset) mockFn.mockReset();
  });
});

afterEach(() => {
  // Restore original console methods
  Object.assign(console, originalConsole);
});

describe('Logger Instance Methods', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  describe('Configuration', () => {
    test('should set verbose mode', () => {
      logger.setVerbose(true);
      expect(logger.isVerbose()).toBe(true);

      logger.setVerbose(false);
      expect(logger.isVerbose()).toBe(false);
    });

    test('should set debug mode', () => {
      logger.setDebug(true);
      expect(logger.isDebug()).toBe(true);
      expect(logger.isVerbose()).toBe(true); // Debug should enable verbose

      logger.setDebug(false);
      expect(logger.isDebug()).toBe(false);
    });

    test('should return correct verbose state', () => {
      expect(logger.isVerbose()).toBe(false);
      logger.setVerbose(true);
      expect(logger.isVerbose()).toBe(true);
    });

    test('should return correct debug state', () => {
      expect(logger.isDebug()).toBe(false);
      logger.setDebug(true);
      expect(logger.isDebug()).toBe(true);
    });
  });

  describe('Basic Logging Methods', () => {
    test('should log info messages', () => {
      logger.info('Test info message');
      expect(mockConsole.info).toHaveBeenCalledWith('ℹ️ Test info message');
    });

    test('should log success messages', () => {
      logger.success('Test success message');
      expect(mockConsole.log).toHaveBeenCalledWith('✅ Test success message');
    });

    test('should log warning messages', () => {
      logger.warn('Test warning message');
      expect(mockConsole.warn).toHaveBeenCalledWith('⚠️ Test warning message');
    });

    test('should log error messages', () => {
      logger.error('Test error message');
      expect(mockConsole.error).toHaveBeenCalledWith('❌ Test error message');
    });

    test('should log debug messages only when debug mode is enabled', () => {
      // Debug mode disabled
      logger.debug('Test debug message');
      expect(mockConsole.log).not.toHaveBeenCalled();

      // Enable debug mode
      logger.setDebug(true);
      logger.debug('Test debug message');
      expect(mockConsole.log).toHaveBeenCalledWith('🐛 Test debug message');
    });

    test('should log messages with additional arguments', () => {
      logger.info('Test message', 'arg1', 'arg2');
      expect(mockConsole.info).toHaveBeenCalledWith('ℹ️ Test message', 'arg1', 'arg2');
    });
  });

  describe('Log Level Method', () => {
    test('should log info level', () => {
      logger.log('info', 'Test message');
      expect(mockConsole.info).toHaveBeenCalledWith('ℹ️ Test message');
    });

    test('should log warn level', () => {
      logger.log('warn', 'Test message');
      expect(mockConsole.warn).toHaveBeenCalledWith('⚠️ Test message');
    });

    test('should log error level', () => {
      logger.log('error', 'Test message');
      expect(mockConsole.error).toHaveBeenCalledWith('❌ Test message');
    });

    test('should log success level', () => {
      logger.log('success', 'Test message');
      expect(mockConsole.log).toHaveBeenCalledWith('✅ Test message');
    });

    test('should log debug level', () => {
      logger.setDebug(true);
      logger.log('debug', 'Test message');
      expect(mockConsole.log).toHaveBeenCalledWith('🐛 Test message');
    });

    test('should handle unknown log level', () => {
      logger.log('unknown' as any, 'Test message');
      expect(mockConsole.log).toHaveBeenCalledWith('Test message');
    });
  });

  describe('Formatting Methods', () => {
    test('should format bytes correctly', () => {
      expect(logger.formatBytes(0)).toBe('0 B');
      expect(logger.formatBytes(1024)).toBe('1.0 KB');
      expect(logger.formatBytes(1024 * 1024)).toBe('1.0 MB');
      expect(logger.formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
      expect(logger.formatBytes(1536)).toBe('1.5 KB');
      expect(logger.formatBytes(1500)).toBe('1.5 KB');
    });

    test('should format duration correctly', () => {
      expect(logger.formatDuration(500)).toBe('500ms');
      expect(logger.formatDuration(1000)).toBe('1s');
      expect(logger.formatDuration(65000)).toBe('1m 5s');
      expect(logger.formatDuration(120000)).toBe('2m 0s');
    });
  });

  describe('Table Method', () => {
    test('should call console.table when verbose is enabled', () => {
      logger.setVerbose(true);
      const data = [{ name: 'test', value: 123 }];
      logger.table(data);
      expect(mockConsole.table).toHaveBeenCalledWith(data);
    });

    test('should not call console.table when verbose is disabled', () => {
      logger.setVerbose(false);
      const data = [{ name: 'test', value: 123 }];
      logger.table(data);
      expect(mockConsole.table).not.toHaveBeenCalled();
    });
  });

  describe('Group Method', () => {
    test('should use console.group when verbose is enabled', () => {
      logger.setVerbose(true);
      const mockFn = mock(() => {});
      logger.group('Test Group', mockFn);
      expect(mockConsole.group).toHaveBeenCalledWith('📋 Test Group');
      expect(mockConsole.groupEnd).toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalled();
    });

    test('should not use console.group when verbose is disabled', () => {
      logger.setVerbose(false);
      const mockFn = mock(() => {});
      logger.group('Test Group', mockFn);
      expect(mockConsole.group).not.toHaveBeenCalled();
      expect(mockConsole.groupEnd).not.toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalled();
    });
  });

  describe('Time Methods', () => {
    test('should call console.time when debug is enabled', () => {
      logger.setDebug(true);
      logger.time('test-label');
      expect(mockConsole.time).toHaveBeenCalledWith('test-label');
    });

    test('should call console.timeEnd when debug is enabled', () => {
      logger.setDebug(true);
      logger.timeEnd('test-label');
      expect(mockConsole.timeEnd).toHaveBeenCalledWith('test-label');
    });

    test('should not call console.time when debug is disabled', () => {
      logger.setDebug(false);
      logger.time('test-label');
      expect(mockConsole.time).not.toHaveBeenCalled();
    });

    test('should not call console.timeEnd when debug is disabled', () => {
      logger.setDebug(false);
      logger.timeEnd('test-label');
      expect(mockConsole.timeEnd).not.toHaveBeenCalled();
    });
  });

  describe('Specialized Logging Methods', () => {
    test('should log version messages', () => {
      logger.version('Test version');
      expect(mockConsole.log).toHaveBeenCalledWith('🆚 Test version');
    });

    test('should log increment messages', () => {
      logger.increment('Test increment');
      expect(mockConsole.log).toHaveBeenCalledWith('🔄 Test increment');
    });

    test('should log changelog messages', () => {
      logger.changelog('Test changelog');
      expect(mockConsole.log).toHaveBeenCalledWith('📝 Test changelog');
    });

    test('should log tag messages', () => {
      logger.tag('Test tag');
      expect(mockConsole.log).toHaveBeenCalledWith('🏷️ Test tag');
    });

    test('should log rocket messages', () => {
      logger.rocket('Test rocket');
      expect(mockConsole.log).toHaveBeenCalledWith('🚀 Test rocket');
    });

    test('should log package messages', () => {
      logger.package('Test package');
      expect(mockConsole.log).toHaveBeenCalledWith('📦 Test package');
    });

    test('should log floppy messages', () => {
      logger.floppy('Test floppy');
      expect(mockConsole.log).toHaveBeenCalledWith('💾 Test floppy');
    });

    test('should log test messages', () => {
      logger.test('Test test');
      expect(mockConsole.log).toHaveBeenCalledWith('🧪 Test test');
    });

    test('should log house messages', () => {
      logger.house('Test house');
      expect(mockConsole.log).toHaveBeenCalledWith('🏠 Test house');
    });

    test('should log magnifier messages', () => {
      logger.magnifier('Test magnifier');
      expect(mockConsole.log).toHaveBeenCalledWith('🔍 Test magnifier');
    });

    test('should log hammer messages', () => {
      logger.hammer('Test hammer');
      expect(mockConsole.log).toHaveBeenCalledWith('🔨 Test hammer');
    });

    test('should log memo messages', () => {
      logger.memo('Test memo');
      expect(mockConsole.log).toHaveBeenCalledWith('📝 Test memo');
    });

    test('should log settings messages', () => {
      logger.settings('Test settings');
      expect(mockConsole.log).toHaveBeenCalledWith('⚙️ Test settings');
    });

    test('should log current messages', () => {
      logger.current('Test current');
      expect(mockConsole.log).toHaveBeenCalledWith('⭐ Test current');
    });

    test('should log tableInfo messages', () => {
      logger.tableInfo('Test table info');
      expect(mockConsole.log).toHaveBeenCalledWith('📊 Test table info');
    });
  });

  describe('Text Methods', () => {
    test('should log text messages when verbose is enabled', () => {
      logger.setVerbose(true);
      logger.text('Test text');
      expect(mockConsole.log).toHaveBeenCalledWith('Test text');
    });

    test('should not log text messages when verbose is disabled', () => {
      logger.setVerbose(false);
      logger.text('Test text');
      expect(mockConsole.log).not.toHaveBeenCalled();
    });

    test('should always log plain messages', () => {
      logger.plain('Test plain');
      expect(mockConsole.log).toHaveBeenCalledWith('Test plain');
    });
  });

  describe('Box Utility Methods', () => {
    test('should create box with content', () => {
      logger.box('Test content');
      expect(mockConsole.log).toHaveBeenCalled();
    });

    test('should create section box with title and content', () => {
      logger.sectionBox('Test Title', 'Test content');
      expect(mockConsole.log).toHaveBeenCalled();
    });

    test('should create bordered line', () => {
      logger.borderedLine('Test content');
      expect(mockConsole.log).toHaveBeenCalled();
    });

    test('should create divider', () => {
      logger.divider();
      expect(mockConsole.log).toHaveBeenCalled();
    });

    test('should create divider with custom width and style', () => {
      logger.divider(50, 'double');
      expect(mockConsole.log).toHaveBeenCalled();
    });
  });
});

describe('Logger Static Methods', () => {
  describe('Configuration Static Methods', () => {
    test('should set verbose mode via static method', () => {
      Logger.setVerbose(true);
      expect(Logger.isVerbose()).toBe(true);

      Logger.setVerbose(false);
      expect(Logger.isVerbose()).toBe(false);
    });

    test('should set debug mode via static method', () => {
      Logger.setDebug(true);
      expect(Logger.isDebug()).toBe(true);
      expect(Logger.isVerbose()).toBe(true);

      Logger.setDebug(false);
      expect(Logger.isDebug()).toBe(false);
    });

    test('should return verbose state via static method', () => {
      Logger.setVerbose(true);
      expect(Logger.isVerbose()).toBe(true);
    });

    test('should return debug state via static method', () => {
      Logger.setDebug(true);
      expect(Logger.isDebug()).toBe(true);
    });
  });

  describe('Static Logging Methods', () => {
    test('should log info via static method', () => {
      Logger.info('Test info');
      expect(mockConsole.info).toHaveBeenCalledWith('ℹ️ Test info');
    });

    test('should log success via static method', () => {
      Logger.success('Test success');
      expect(mockConsole.log).toHaveBeenCalledWith('✅ Test success');
    });

    test('should log warning via static method', () => {
      Logger.warn('Test warning');
      expect(mockConsole.warn).toHaveBeenCalledWith('⚠️ Test warning');
    });

    test('should log error via static method', () => {
      Logger.error('Test error');
      expect(mockConsole.error).toHaveBeenCalledWith('❌ Test error');
    });

    test('should log debug via static method', () => {
      Logger.setDebug(true);
      Logger.debug('Test debug');
      expect(mockConsole.log).toHaveBeenCalledWith('🐛 Test debug');
    });

    test('should log with level via static method', () => {
      Logger.log('info', 'Test message');
      expect(mockConsole.info).toHaveBeenCalledWith('ℹ️ Test message');
    });
  });

  describe('Static Formatting Methods', () => {
    test('should format bytes via static method', () => {
      expect(Logger.formatBytes(1024)).toBe('1.0 KB');
    });

    test('should format duration via static method', () => {
      expect(Logger.formatDuration(1000)).toBe('1s');
    });
  });

  describe('Static Utility Methods', () => {
    test('should call table via static method', () => {
      Logger.setVerbose(true);
      const data = [{ test: 'data' }];
      Logger.table(data);
      expect(mockConsole.table).toHaveBeenCalledWith(data);
    });

    test('should call group via static method', () => {
      Logger.setVerbose(true);
      const mockFn = mock(() => {});
      Logger.group('Test Group', mockFn);
      expect(mockConsole.group).toHaveBeenCalledWith('📋 Test Group');
      expect(mockConsole.groupEnd).toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalled();
    });

    test('should call time via static method', () => {
      Logger.setDebug(true);
      Logger.time('test-label');
      expect(mockConsole.time).toHaveBeenCalledWith('test-label');
    });

    test('should call timeEnd via static method', () => {
      Logger.setDebug(true);
      Logger.timeEnd('test-label');
      expect(mockConsole.timeEnd).toHaveBeenCalledWith('test-label');
    });
  });

  describe('Static Specialized Methods', () => {
    test('should log version via static method', () => {
      Logger.version('Test version');
      expect(mockConsole.log).toHaveBeenCalledWith('🆚 Test version');
    });

    test('should log increment via static method', () => {
      Logger.increment('Test increment');
      expect(mockConsole.log).toHaveBeenCalledWith('🔄 Test increment');
    });

    test('should log changelog via static method', () => {
      Logger.changelog('Test changelog');
      expect(mockConsole.log).toHaveBeenCalledWith('📝 Test changelog');
    });

    test('should log tag via static method', () => {
      Logger.tag('Test tag');
      expect(mockConsole.log).toHaveBeenCalledWith('🏷️ Test tag');
    });

    test('should log rocket via static method', () => {
      Logger.rocket('Test rocket');
      expect(mockConsole.log).toHaveBeenCalledWith('🚀 Test rocket');
    });

    test('should log package via static method', () => {
      Logger.package('Test package');
      expect(mockConsole.log).toHaveBeenCalledWith('📦 Test package');
    });

    test('should log floppy via static method', () => {
      Logger.floppy('Test floppy');
      expect(mockConsole.log).toHaveBeenCalledWith('💾 Test floppy');
    });

    test('should log test via static method', () => {
      Logger.test('Test test');
      expect(mockConsole.log).toHaveBeenCalledWith('🧪 Test test');
    });

    test('should log house via static method', () => {
      Logger.house('Test house');
      expect(mockConsole.log).toHaveBeenCalledWith('🏠 Test house');
    });

    test('should log magnifier via static method', () => {
      Logger.magnifier('Test magnifier');
      expect(mockConsole.log).toHaveBeenCalledWith('🔍 Test magnifier');
    });

    test('should log hammer via static method', () => {
      Logger.hammer('Test hammer');
      expect(mockConsole.log).toHaveBeenCalledWith('🔨 Test hammer');
    });

    test('should log memo via static method', () => {
      Logger.memo('Test memo');
      expect(mockConsole.log).toHaveBeenCalledWith('📝 Test memo');
    });

    test('should log text via static method', () => {
      Logger.setVerbose(true);
      Logger.text('Test text');
      expect(mockConsole.log).toHaveBeenCalledWith('Test text');
    });

    test('should log plain via static method', () => {
      Logger.plain('Test plain');
      expect(mockConsole.log).toHaveBeenCalledWith('Test plain');
    });

    test('should log settings via static method', () => {
      Logger.settings('Test settings');
      expect(mockConsole.log).toHaveBeenCalledWith('⚙️ Test settings');
    });

    test('should log current via static method', () => {
      Logger.current('Test current');
      expect(mockConsole.log).toHaveBeenCalledWith('⭐ Test current');
    });

    test('should log tableInfo via static method', () => {
      Logger.tableInfo('Test table info');
      expect(mockConsole.log).toHaveBeenCalledWith('📊 Test table info');
    });
  });

  describe('Static Box Methods', () => {
    test('should create box via static method', () => {
      Logger.box('Test content');
      expect(mockConsole.log).toHaveBeenCalled();
    });

    test('should create section box via static method', () => {
      Logger.sectionBox('Test Title', 'Test content');
      expect(mockConsole.log).toHaveBeenCalled();
    });

    test('should create bordered line via static method', () => {
      Logger.borderedLine('Test content');
      expect(mockConsole.log).toHaveBeenCalled();
    });

    test('should create divider via static method', () => {
      Logger.divider();
      expect(mockConsole.log).toHaveBeenCalled();
    });
  });
});

describe('Logger Edge Cases', () => {
  test('should handle empty messages', () => {
    const logger = new Logger();
    logger.info('');
    expect(mockConsole.info).toHaveBeenCalledWith('ℹ️ ');
  });

  test('should handle messages with special characters', () => {
    const logger = new Logger();
    logger.info('Test with 🎉 emoji and "quotes"');
    expect(mockConsole.info).toHaveBeenCalledWith('ℹ️ Test with 🎉 emoji and "quotes"');
  });

  test('should handle formatBytes edge cases', () => {
    const logger = new Logger();
    expect(logger.formatBytes(1)).toBe('1.0 B');
    expect(logger.formatBytes(999)).toBe('999 B');
    expect(logger.formatBytes(1023)).toBe('1023 B');
    expect(logger.formatBytes(1024)).toBe('1.0 KB');
    expect(logger.formatBytes(1024 * 1024 - 1)).toBe('1024 KB');
    expect(logger.formatBytes(1024 * 1024)).toBe('1.0 MB');
  });

  test('should handle formatDuration edge cases', () => {
    const logger = new Logger();
    expect(logger.formatDuration(0)).toBe('0ms');
    expect(logger.formatDuration(999)).toBe('999ms');
    expect(logger.formatDuration(60000)).toBe('1m 0s');
    expect(logger.formatDuration(3600000)).toBe('60m 0s');
  });

  test('should handle multiple arguments in all logging methods', () => {
    const logger = new Logger();
    const args = ['arg1', 123, { key: 'value' }, [1, 2, 3]];

    logger.info('Test', ...args);
    expect(mockConsole.info).toHaveBeenCalledWith('ℹ️ Test', ...args);

    logger.success('Test', ...args);
    expect(mockConsole.log).toHaveBeenCalledWith('✅ Test', ...args);

    logger.warn('Test', ...args);
    expect(mockConsole.warn).toHaveBeenCalledWith('⚠️ Test', ...args);

    logger.error('Test', ...args);
    expect(mockConsole.error).toHaveBeenCalledWith('❌ Test', ...args);
  });
});
