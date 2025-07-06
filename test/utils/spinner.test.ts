import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { SPINNER_FRAMES } from '../../src/constants/ui';
import { ILogger, IProcessOutput, ITimer, MultiSpinner, Spinner } from '../../src/utils/spinner';

describe('Spinner', () => {
  let mockProcessOutput: IProcessOutput;
  let mockTimer: ITimer;
  let mockLogger: ILogger;
  let mockInterval: NodeJS.Timeout;

  beforeEach(() => {
    mockProcessOutput = {
      write: mock(() => true),
    };
    mockInterval = {} as NodeJS.Timeout;
    mockTimer = {
      setInterval: mock(() => mockInterval),
      clearInterval: mock(() => {}),
    };
    mockLogger = {
      info: mock(() => {}),
      success: mock(() => {}),
      error: mock(() => {}),
      warn: mock(() => {}),
    };
  });

  // Bun automatically cleans up mocks between tests

  describe('constructor', () => {
    it('should create spinner with default dependencies', () => {
      const spinner = new Spinner();
      expect(spinner).toBeInstanceOf(Spinner);
    });

    it('should create spinner with injected dependencies', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);
      expect(spinner).toBeInstanceOf(Spinner);
    });
  });

  describe('start', () => {
    it('should start spinner with default message', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start();

      expect(mockProcessOutput.write).toHaveBeenCalledWith('\x1B[?25l');
      expect(mockTimer.setInterval).toHaveBeenCalledWith(expect.any(Function), 100);
    });

    it('should start spinner with custom message', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('Custom message');

      expect(mockProcessOutput.write).toHaveBeenCalledWith('\x1B[?25l');
      expect(mockTimer.setInterval).toHaveBeenCalledWith(expect.any(Function), 100);
    });

    it('should stop existing spinner before starting new one', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('First message');
      spinner.start('Second message');

      expect(mockTimer.clearInterval).toHaveBeenCalledWith(mockInterval);
      expect(mockProcessOutput.write).toHaveBeenCalledWith('\r\x1B[K');
      expect(mockProcessOutput.write).toHaveBeenCalledWith('\x1B[?25h');
    });

    it('should call interval callback with correct frame and message', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('Test message');

      const setIntervalCall = mockTimer.setInterval.mock.calls[0];
      const callback = setIntervalCall[0];

      // Call the callback to test the frame update logic
      callback();

      expect(mockProcessOutput.write).toHaveBeenCalledWith(`\r${SPINNER_FRAMES[0]} Test message`);
    });

    it('should cycle through frames correctly', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('Test message');

      const setIntervalCall = mockTimer.setInterval.mock.calls[0];
      const callback = setIntervalCall[0];

      // Call callback multiple times to test frame cycling
      callback(); // frame 0
      callback(); // frame 1
      callback(); // frame 2

      expect(mockProcessOutput.write).toHaveBeenCalledWith(`\r${SPINNER_FRAMES[0]} Test message`);
      expect(mockProcessOutput.write).toHaveBeenCalledWith(`\r${SPINNER_FRAMES[1]} Test message`);
      expect(mockProcessOutput.write).toHaveBeenCalledWith(`\r${SPINNER_FRAMES[2]} Test message`);
    });

    it('should wrap frame index when reaching end', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('Test message');

      const setIntervalCall = mockTimer.setInterval.mock.calls[0];
      const callback = setIntervalCall[0];

      // Call callback enough times to wrap around
      for (let i = 0; i < SPINNER_FRAMES.length + 1; i++) {
        callback();
      }

      // Should have called with frame 0 again after wrapping
      expect(mockProcessOutput.write).toHaveBeenCalledWith(`\r${SPINNER_FRAMES[0]} Test message`);
    });
  });

  describe('updateMessage', () => {
    it('should update the message', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('Initial message');
      spinner.updateMessage('Updated message');

      const setIntervalCall = mockTimer.setInterval.mock.calls[0];
      const callback = setIntervalCall[0];

      // Call the callback to verify updated message is used
      callback();

      expect(mockProcessOutput.write).toHaveBeenCalledWith(
        `\r${SPINNER_FRAMES[0]} Updated message`,
      );
    });
  });

  describe('stop', () => {
    it('should do nothing if not spinning', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.stop();

      expect(mockTimer.clearInterval).not.toHaveBeenCalled();
      expect(mockProcessOutput.write).not.toHaveBeenCalled();
    });

    it('should stop spinner and clear interval', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('Test message');
      spinner.stop();

      expect(mockTimer.clearInterval).toHaveBeenCalledWith(mockInterval);
      expect(mockProcessOutput.write).toHaveBeenCalledWith('\r\x1B[K');
      expect(mockProcessOutput.write).toHaveBeenCalledWith('\x1B[?25h');
    });

    it('should call logger.info with final message', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('Test message');
      spinner.stop('Final message');

      expect(mockLogger.info).toHaveBeenCalledWith('Final message');
    });

    it('should not call logger.info without final message', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('Test message');
      spinner.stop();

      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('succeed', () => {
    it('should stop spinner and call logger.success with message', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('Test message');
      spinner.succeed('Success message');

      expect(mockTimer.clearInterval).toHaveBeenCalledWith(mockInterval);
      expect(mockLogger.success).toHaveBeenCalledWith('Success message');
    });

    it('should not call logger.success without message', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('Test message');
      spinner.succeed();

      expect(mockLogger.success).not.toHaveBeenCalled();
    });
  });

  describe('fail', () => {
    it('should stop spinner and call logger.error with message', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('Test message');
      spinner.fail('Error message');

      expect(mockTimer.clearInterval).toHaveBeenCalledWith(mockInterval);
      expect(mockLogger.error).toHaveBeenCalledWith('Error message');
    });

    it('should not call logger.error without message', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('Test message');
      spinner.fail();

      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should stop spinner and call logger.warn with message', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('Test message');
      spinner.warn('Warning message');

      expect(mockTimer.clearInterval).toHaveBeenCalledWith(mockInterval);
      expect(mockLogger.warn).toHaveBeenCalledWith('Warning message');
    });

    it('should not call logger.warn without message', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('Test message');
      spinner.warn();

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should stop spinner and call logger.info with message', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('Test message');
      spinner.info('Info message');

      expect(mockTimer.clearInterval).toHaveBeenCalledWith(mockInterval);
      expect(mockLogger.info).toHaveBeenCalledWith('Info message');
    });

    it('should not call logger.info without message', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);

      spinner.start('Test message');
      spinner.info();

      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('edge cases and no-ops', () => {
    it('should call stopAll when all spinners are already stopped', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);
      multiSpinner.add('spinner1', 'Message 1');
      multiSpinner.succeed('spinner1', 'Success');
      // spinner1 is now stopped
      multiSpinner.stopAll(); // should be a no-op
      expect(mockTimer.clearInterval).toHaveBeenCalledTimes(1); // only from succeed
    });

    it('should call succeed/fail/warn/update on already completed spinner and do nothing', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);
      multiSpinner.add('spinner1', 'Message 1');
      multiSpinner.succeed('spinner1', 'Success');
      multiSpinner.succeed('spinner1', 'Another Success');
      multiSpinner.fail('spinner1', 'Should not log');
      multiSpinner.warn('spinner1', 'Should not log');
      multiSpinner.update('spinner1', 'Should not update');
      expect(mockLogger.success).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalledWith('Should not log');
      expect(mockLogger.warn).not.toHaveBeenCalledWith('Should not log');
    });

    it('should call stopAll on MultiSpinner with no spinners', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);
      multiSpinner.stopAll(); // should be a no-op
      expect(mockTimer.clearInterval).not.toHaveBeenCalled();
    });

    it('should call updateMessage on Spinner before start (no error)', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);
      spinner.updateMessage('Should not throw');
      // No assertion needed, just ensure no error
    });

    it('should call stop on Spinner before start (no error)', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);
      spinner.stop();
      // No assertion needed, just ensure no error
    });

    it('should call succeed/fail/warn/info on Spinner before start (no error)', () => {
      const spinner = new Spinner(mockProcessOutput, mockTimer, mockLogger);
      spinner.succeed('Should not throw');
      spinner.fail('Should not throw');
      spinner.warn('Should not throw');
      spinner.info('Should not throw');
      // No assertion needed, just ensure no error
    });
  });
});

describe('MultiSpinner', () => {
  let mockProcessOutput: IProcessOutput;
  let mockTimer: ITimer;
  let mockLogger: ILogger;
  let mockInterval: NodeJS.Timeout;

  beforeEach(() => {
    mockProcessOutput = {
      write: mock(() => true),
    };
    mockInterval = {} as NodeJS.Timeout;
    mockTimer = {
      setInterval: mock(() => mockInterval),
      clearInterval: mock(() => {}),
    };
    mockLogger = {
      info: mock(() => {}),
      success: mock(() => {}),
      error: mock(() => {}),
      warn: mock(() => {}),
    };
  });

  // Bun automatically cleans up mocks between tests

  describe('constructor', () => {
    it('should create multi-spinner with default dependencies', () => {
      const multiSpinner = new MultiSpinner();
      expect(multiSpinner).toBeInstanceOf(MultiSpinner);
    });

    it('should create multi-spinner with injected dependencies', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);
      expect(multiSpinner).toBeInstanceOf(MultiSpinner);
    });
  });

  describe('add', () => {
    it('should add spinner and start it', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      multiSpinner.add('test-id', 'Test message');

      expect(mockTimer.setInterval).toHaveBeenCalledWith(expect.any(Function), 100);
      expect(mockProcessOutput.write).toHaveBeenCalledWith('\x1B[?25l');
    });

    it('should increment total count', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      multiSpinner.add('test-id', 'Test message');

      expect(multiSpinner.getProgress().total).toBe(1);
    });
  });

  describe('succeed', () => {
    it('should succeed spinner and update status', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      multiSpinner.add('test-id', 'Test message');
      multiSpinner.succeed('test-id', 'Success message');

      expect(mockLogger.success).toHaveBeenCalledWith('Success message');
      expect(multiSpinner.getProgress().completed).toBe(1);
    });

    it('should not succeed non-existent spinner', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      multiSpinner.succeed('non-existent', 'Success message');

      expect(mockLogger.success).not.toHaveBeenCalled();
      expect(multiSpinner.getProgress().completed).toBe(0);
    });

    it('should not succeed already completed spinner', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      multiSpinner.add('test-id', 'Test message');
      multiSpinner.succeed('test-id', 'Success message');
      multiSpinner.succeed('test-id', 'Another success');

      expect(multiSpinner.getProgress().completed).toBe(1);
    });
  });

  describe('fail', () => {
    it('should fail spinner and update status', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      multiSpinner.add('test-id', 'Test message');
      multiSpinner.fail('test-id', 'Error message');

      expect(mockLogger.error).toHaveBeenCalledWith('Error message');
      expect(multiSpinner.getProgress().completed).toBe(1);
    });

    it('should not fail non-existent spinner', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      multiSpinner.fail('non-existent', 'Error message');

      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(multiSpinner.getProgress().completed).toBe(0);
    });
  });

  describe('warn', () => {
    it('should warn spinner and update status', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      multiSpinner.add('test-id', 'Test message');
      multiSpinner.warn('test-id', 'Warning message');

      expect(mockLogger.warn).toHaveBeenCalledWith('Warning message');
      expect(multiSpinner.getProgress().completed).toBe(1);
    });

    it('should not warn non-existent spinner', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      multiSpinner.warn('non-existent', 'Warning message');

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(multiSpinner.getProgress().completed).toBe(0);
    });
  });

  describe('update', () => {
    it('should update spinner message', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      multiSpinner.add('test-id', 'Initial message');
      multiSpinner.update('test-id', 'Updated message');

      // Get the spinner's interval callback and call it to verify updated message
      const setIntervalCall = mockTimer.setInterval.mock.calls[0];
      const callback = setIntervalCall[0];
      callback();

      expect(mockProcessOutput.write).toHaveBeenCalledWith(
        `\r${SPINNER_FRAMES[0]} Updated message`,
      );
    });

    it('should not update non-existent spinner', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      multiSpinner.update('non-existent', 'Updated message');

      // Should not affect any existing spinners
      expect(multiSpinner.getProgress().total).toBe(0);
    });

    it('should not update completed spinner', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      multiSpinner.add('test-id', 'Initial message');
      multiSpinner.succeed('test-id', 'Success message');
      multiSpinner.update('test-id', 'Updated message');

      // The update should not affect the completed spinner
      expect(multiSpinner.getProgress().completed).toBe(1);
    });
  });

  describe('stopAll', () => {
    it('should stop all spinning spinners', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      multiSpinner.add('spinner1', 'Message 1');
      multiSpinner.add('spinner2', 'Message 2');
      multiSpinner.succeed('spinner1', 'Success'); // This one is already stopped
      multiSpinner.stopAll();

      // Should call clearInterval for the remaining spinning spinner
      expect(mockTimer.clearInterval).toHaveBeenCalledWith(mockInterval);
    });
  });

  describe('isComplete', () => {
    it('should return true when all spinners are complete', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      multiSpinner.add('spinner1', 'Message 1');
      multiSpinner.add('spinner2', 'Message 2');

      expect(multiSpinner.isComplete()).toBe(false);

      multiSpinner.succeed('spinner1', 'Success');
      expect(multiSpinner.isComplete()).toBe(false);

      multiSpinner.fail('spinner2', 'Error');
      expect(multiSpinner.isComplete()).toBe(true);
    });

    it('should return true when no spinners exist', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      expect(multiSpinner.isComplete()).toBe(true);
    });
  });

  describe('getProgress', () => {
    it('should return correct progress for empty multi-spinner', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      const progress = multiSpinner.getProgress();

      expect(progress).toEqual({
        completed: 0,
        total: 0,
        percentage: 0,
      });
    });

    it('should return correct progress for partial completion', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      multiSpinner.add('spinner1', 'Message 1');
      multiSpinner.add('spinner2', 'Message 2');
      multiSpinner.add('spinner3', 'Message 3');

      multiSpinner.succeed('spinner1', 'Success');
      multiSpinner.fail('spinner2', 'Error');

      const progress = multiSpinner.getProgress();

      expect(progress).toEqual({
        completed: 2,
        total: 3,
        percentage: 67,
      });
    });

    it('should return correct progress for full completion', () => {
      const multiSpinner = new MultiSpinner(mockProcessOutput, mockTimer, mockLogger);

      multiSpinner.add('spinner1', 'Message 1');
      multiSpinner.add('spinner2', 'Message 2');

      multiSpinner.succeed('spinner1', 'Success');
      multiSpinner.warn('spinner2', 'Warning');

      const progress = multiSpinner.getProgress();

      expect(progress).toEqual({
        completed: 2,
        total: 2,
        percentage: 100,
      });
    });
  });
});
