import { TROUBLE_SHOOTING } from '@/constants/troubleshooting';
import * as configModule from '../core/config';
import { ILogger, IOllamaService } from '../core/interfaces';
import { normalizeHost } from '../utils/url';

// Add type for getConfig function
export type GetConfigFn = typeof configModule.getConfig;

/**
 * TestCommand is used for manual testing of the Ollama Git Commit Message Generator.
 * It provides methods to test connection, model availability, and prompt generation.
 * Note: Automated tests use mocks (MockedConfigManager, mockFs, mockGit, etc.) to isolate tests from real filesystem/network.
 */

// TODO: non of the verbose is working
export class TestCommand {
  private ollamaService: IOllamaService;
  private logger: ILogger;
  private getConfig: GetConfigFn;

  constructor(
    ollamaService: IOllamaService,
    logger: ILogger,
    getConfig: GetConfigFn = configModule.getConfig,
  ) {
    this.logger = logger;
    this.ollamaService = ollamaService;
    this.getConfig = getConfig;
  }

  // QUESTION: does this to get called when doing test connection?
  async testConnection(host?: string, verbose = false): Promise<boolean> {
    try {
      const config = await this.getConfig();
      const serverHost = normalizeHost(host || config.host);
      const timeouts = config.timeouts;

      if (verbose) {
        this.logger.plain(`Testing connection to ${serverHost}...`);
        this.logger.plain(`Connection timeout: ${timeouts.connection}ms`);
        this.logger.plain('Sending GET request to /api/tags');
        this.logger.plain('Headers: { "Content-Type": "application/json" }');
      }

      const startTime = Date.now();
      const success = await this.ollamaService.testConnection(serverHost, verbose);
      const duration = Date.now() - startTime;

      if (!success) {
        throw new Error('Connection test failed');
      }

      // why is this not displaying when verbose
      if (verbose) {
        this.logger.success('Response: HTTP 200 OK');
        this.logger.clock(`Connection established in ${duration}ms`);
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error('Connection test failed:', errorMessage);
      return false;
    }
  }

  async testModel(model?: string, host?: string, verbose = false): Promise<boolean> {
    try {
      const config = await this.getConfig();
      const ollamaHost = normalizeHost(host || config.host);
      const testModel = model || config.model;

      if (verbose) {
        this.logger.test(`Testing model '${testModel}' on ${ollamaHost}...`);
      }

      // First test connection
      const connectionOk = await this.testConnection(ollamaHost, verbose);
      if (!connectionOk) {
        this.logger.error('Connection test failed');
        return false;
      }

      // Then test model availability
      const modelOk = await this.testModelAvailability(testModel, ollamaHost, verbose);
      if (!modelOk) {
        this.logger.error('Model test failed');
        return false;
      }

      return true;
    } catch (error: unknown) {
      this.logger.error('Test model failed:', error);
      if (typeof error === 'object' && error && 'message' in error) {
        this.logger.error(`Error: ${(error as { message: string }).message}`);
      } else {
        this.logger.error(`Error: ${String(error)}`);
      }
      return false;
    }
  }

  async testAll(model?: string, host?: string, verbose = false): Promise<boolean> {
    try {
      const config = await this.getConfig();
      const ollamaHost = normalizeHost(host || config.host);
      const testModel = model || config.model;

      if (verbose) {
        this.logger.test(`Running all tests with model '${testModel}' on ${ollamaHost}...`);
      }

      // Test 1: Connection
      this.logger.test('Testing connection...');
      const connectionOk = await this.testConnection(ollamaHost, verbose);
      if (!connectionOk) {
        this.logger.error('Connection test failed');
        return false;
      }

      // Test 2: Model
      this.logger.plain('');
      this.logger.test('Testing model...');
      const modelOk = await this.testModel(testModel, ollamaHost, verbose);
      if (!modelOk) {
        this.logger.error('Model test failed');
        return false;
      }

      // Test 3: Simple Prompt
      this.logger.plain('');
      this.logger.test('Testing simple prompt...');
      const promptOk = await this.testSimplePrompt(ollamaHost, testModel, verbose);
      if (!promptOk) {
        this.logger.error('Simple prompt test failed');
        return false;
      }

      // Test 4: Benchmark
      this.logger.plain('');
      this.logger.test('Running benchmark...');
      await this.benchmarkModel(testModel, ollamaHost, 3);

      this.logger.success('All tests passed!');
      return true;
    } catch (error: unknown) {
      this.logger.error('Test all failed:', error);
      if (typeof error === 'object' && error && 'message' in error) {
        this.logger.error(`Error: ${(error as { message: string }).message}`);
      } else {
        this.logger.error(`Error: ${String(error)}`);
      }
      return false;
    }
  }

  async testSimplePrompt(host?: string, model?: string, verbose = false): Promise<boolean> {
    const config = await this.getConfig();
    const ollamaHost = normalizeHost(host || config.host);
    const testModel = model || config.model;
    const timeouts = config.timeouts;

    if (verbose) {
      this.logger.test(`Testing simple prompt with model: ${testModel}`);
      this.logger.plain(`Host: ${ollamaHost}`);
      this.logger.debug(`Generation timeout: ${timeouts.generation}ms`);
    }

    const payload = {
      model: testModel,
      prompt: 'Hello, please respond with: Test successful',
      stream: false,
    };

    if (verbose) {
      this.logger.debug('Test payload:', JSON.stringify(payload, null, 2));
    }

    try {
      if (verbose) {
        this.logger.plain('Sending test request...');
      }

      const response = await fetch(`${ollamaHost}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeouts.generation),
      });

      const responseText = await response.text();

      if (verbose) {
        this.logger.success(`Response received (${responseText.length} characters)`);
        this.logger.debug(`First 500 chars: ${responseText.substring(0, 500)}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Test JSON validity
      try {
        const data = JSON.parse(responseText);

        if (verbose) {
          this.logger.success('Valid JSON response');
          this.logger.success('Response field exists:', 'response' in data);

          if (data.response) {
            this.logger.success('Response preview:', `${data.response.substring(0, 100)}...`);
          }

          if (data.model) {
            this.logger.success('Model used:', data.model);
          }

          if (data.total_duration) {
            this.logger.success(
              'Generation time:',
              `${(data.total_duration / 1000000).toFixed(0)}ms`,
            );
          }
        } else {
          this.logger.success('Simple prompt test passed');
        }

        // Check for error in response
        if (data.error) {
          this.logger.error('Model returned error:', data.error);

          if (data.error.toString().toLowerCase().includes('not found')) {
            this.logger.error(TROUBLE_SHOOTING.MODEL_NOT_FOUND(testModel));
          }

          return false;
        }

        // Check if we got a reasonable response
        if (!data.response || data.response.trim().length === 0) {
          this.logger.warn('Model returned empty response');
          return false;
        }

        return true;
      } catch (parseError: unknown) {
        if (typeof parseError === 'object' && parseError && 'message' in parseError) {
          this.logger.error('JSON parsing failed:', (parseError as { message: string }).message);
        } else {
          this.logger.error('JSON parsing failed:', String(parseError));
        }

        if (verbose) {
          this.logger.debug('Raw response that failed to parse:');
          this.logger.error(responseText);
        }

        // Try to extract useful information from malformed response
        if (responseText.includes('error')) {
          this.logger.error('Response contains error information');

          if (responseText.toLowerCase().includes('not found')) {
            this.logger.error(TROUBLE_SHOOTING.MODEL_NOT_FOUND(testModel));
          }
        }

        return false;
      }
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error &&
        'name' in error &&
        (error as { name: string }).name === 'TimeoutError'
      ) {
        this.logger.error('Request timed out');
        if (verbose) {
          this.logger.error(TROUBLE_SHOOTING.TIMEOUT(timeouts.generation));
        }
      } else if (
        typeof error === 'object' &&
        error &&
        'message' in error &&
        (error as { message: string }).message.includes('fetch')
      ) {
        this.logger.error('Network request failed:', (error as { message: string }).message);
        if (verbose) {
          this.logger.info(TROUBLE_SHOOTING.GENERAL);
        }
      } else {
        if (typeof error === 'object' && error && 'message' in error) {
          this.logger.error('Request failed:', (error as { message: string }).message);
        } else {
          this.logger.error('Request failed:', String(error));
        }
      }

      return false;
    }
  }

  async testModelAvailability(model: string, host: string, verbose = false): Promise<boolean> {
    try {
      const available = await this.ollamaService.isModelAvailable(host, model);
      if (available) {
        this.logger.success(`Model '${model}' is available`);
      } else {
        if (!verbose) {
          this.logger.warn(`Model '${model}' is not available`);
        } else {
          this.logger.error(TROUBLE_SHOOTING.MODEL_NOT_FOUND(model));
        }
      }
      return available;
    } catch (error: unknown) {
      this.logger.error('Failed to check model availability:', error);
      if (typeof error === 'object' && error && 'message' in error) {
        this.logger.error(`Error: ${(error as { message: string }).message}`);
      } else {
        this.logger.error(`Error: ${String(error)}`);
      }
      return false;
    }
  }

  async testFullWorkflow(host?: string, model?: string, verbose = false): Promise<boolean> {
    const config = await this.getConfig();
    const ollamaHost = normalizeHost(host || config.host);
    const testModel = model || config.model;

    this.logger.test('Running full workflow test...');
    this.logger.table([
      {
        header: 'Full Workflow Test',
        separator: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      },
    ]);

    // Test 1: Connection
    this.logger.test('Testing connection...');
    const connectionOk = await this.testConnection(ollamaHost, verbose);
    if (!connectionOk) {
      this.logger.error('Connection test failed');
      return false;
    }

    // Test 2: Model availability
    this.logger.plain('');
    this.logger.test('Testing model availability...');
    const modelOk = await this.testModelAvailability(testModel, ollamaHost, verbose);
    if (!modelOk) {
      this.logger.error('Model availability test failed');
      return false;
    }

    // Test 3: Simple prompt generation
    this.logger.plain('');
    this.logger.test('Testing simple prompt generation...');
    const promptOk = await this.testSimplePrompt(ollamaHost, testModel, verbose);
    if (!promptOk) {
      this.logger.error('Simple prompt generation test failed');
      return false;
    }

    // Summary
    this.logger.table([
      {
        header: 'Test Summary',
        separator: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      },
    ]);

    this.logger.group('Test summary:', () => {
      this.logger.success(`Connection to ${ollamaHost}`);
      this.logger.success(`Model '${testModel}' available`);
      this.logger.success('Simple prompt generation working');
      this.logger.plain('');
    });

    this.logger.rocket('Ready to generate commit messages!');
    this.logger.info('Try: ollama-commit -d /path/to/your/repo');

    return true;
  }

  async benchmarkModel(model?: string, host?: string, iterations = 3): Promise<void> {
    const config = await this.getConfig();
    const ollamaHost = normalizeHost(host || config.host);
    const testModel = model || config.model;

    this.logger.test(`Benchmarking model: ${testModel}`);
    this.logger.test(`Running ${iterations} iterations...`);
    this.logger.table([
      {
        header: 'Benchmark Test',
        separator: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      },
    ]);

    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      this.logger.plain('');
      this.logger.info(`Run ${i + 1}/${iterations}:`);

      try {
        const startTime = Date.now();
        const success = await this.testSimplePrompt(ollamaHost, testModel, false);
        const duration = Date.now() - startTime;

        if (success) {
          times.push(duration);
          this.logger.success(`Completed in ${duration}ms`);
        } else {
          this.logger.error('Failed');
        }
      } catch (error) {
        this.logger.error(`Error: ${error}`);
      }
    }

    if (times.length > 0) {
      const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      this.logger.table([
        {
          header: 'Benchmark Results',
          separator:
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        },
      ]);

      this.logger.info(`Average time: ${avgTime}ms`);
      this.logger.info(`Fastest time: ${minTime}ms`);
      this.logger.info(`Slowest time: ${maxTime}ms`);

      // Performance rating
      if (avgTime < 2000) {
        this.logger.rocket('Performance: Excellent (< 2s)');
      } else if (avgTime < 5000) {
        this.logger.success('Performance: Good (< 5s)');
      } else if (avgTime < 10000) {
        this.logger.warn('Performance: Slow (< 10s)');
      } else {
        this.logger.error('Performance: Very Slow (> 10s)');
      }
    } else {
      this.logger.error('No successful runs completed');
    }
  }

  async testPrompt(
    host?: string,
    model?: string,
    prompt?: string,
    verbose = false,
  ): Promise<boolean> {
    const config = await this.getConfig();
    const ollamaHost = normalizeHost(host || config.host);
    const testModel = model || config.model;
    const testPrompt = prompt || 'Test prompt';
    const timeouts = config.timeouts;

    if (verbose) {
      this.logger.test(`Testing prompt with model '${testModel}' on ${ollamaHost}...`);
      this.logger.debug(`Prompt length: ${testPrompt.length} characters`);
    }

    try {
      const response = await fetch(`${ollamaHost}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: testModel,
          prompt: testPrompt,
          stream: false,
        }),
        signal: AbortSignal.timeout(timeouts.generation),
      });

      const responseText = await response.text();

      if (verbose) {
        this.logger.success(`Response received (${responseText.length} characters)`);
        this.logger.debug(`First 500 chars: ${responseText.substring(0, 500)}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Test JSON validity
      try {
        const data = JSON.parse(responseText);

        if (verbose) {
          this.logger.success('Valid JSON response');
          this.logger.success('Response field exists:', 'response' in data);

          if (data.response) {
            this.logger.success('Response preview:', `${data.response.substring(0, 100)}...`);
          }

          if (data.model) {
            this.logger.success('Model used:', data.model);
          }
        }

        // Show full response in verbose mode
        if (verbose) {
          this.logger.success(responseText);
        }

        // Check for error in response
        if (data.error) {
          this.logger.error('Model returned error:', data.error);
          return false;
        }

        // Check if we got a reasonable response
        if (!data.response || data.response.trim().length === 0) {
          this.logger.warn('Model returned empty response');
          return false;
        }

        return true;
      } catch (parseError: unknown) {
        if (typeof parseError === 'object' && parseError && 'message' in parseError) {
          this.logger.error('JSON parsing failed:', (parseError as { message: string }).message);
        } else {
          this.logger.error('JSON parsing failed:', String(parseError));
        }

        if (verbose) {
          this.logger.debug('Raw response that failed to parse:');
          this.logger.error(responseText);
        }

        return false;
      }
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error &&
        'name' in error &&
        (error as { name: string }).name === 'TimeoutError'
      ) {
        this.logger.error('Request timed out');
        if (verbose) {
          this.logger.error(TROUBLE_SHOOTING.TIMEOUT(timeouts.generation));
        }
      } else if (
        typeof error === 'object' &&
        error &&
        'message' in error &&
        (error as { message: string }).message.includes('fetch')
      ) {
        this.logger.error('Network request failed:', (error as { message: string }).message);
        if (verbose) {
          this.logger.error(TROUBLE_SHOOTING.GENERAL);
        }
      } else {
        if (typeof error === 'object' && error && 'message' in error) {
          this.logger.error('Request failed:', (error as { message: string }).message);
        } else {
          this.logger.error('Request failed:', String(error));
        }
      }

      return false;
    }
  }
}
