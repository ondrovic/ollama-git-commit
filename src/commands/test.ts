import { TROUBLE_SHOOTING } from '@/constants/troubleshooting';
import { getConfig } from '../core/config';
import { ILogger } from '../core/interfaces';
import { OllamaService } from '../core/ollama';
import { Logger } from '../utils/logger';
import { normalizeHost } from '../utils/url';

/**
 * TestCommand is used for manual testing of the Ollama Git Commit Message Generator.
 * It provides methods to test connection, model availability, and prompt generation.
 * Note: Automated tests use mocks (MockedConfigManager, mockFs, mockGit, etc.) to isolate tests from real filesystem/network.
 */
export class TestCommand {
  private ollamaService: OllamaService;
  private logger: ILogger;

  constructor(ollamaService?: OllamaService, logger?: ILogger) {
    this.ollamaService = ollamaService || new OllamaService();
    this.logger = logger || Logger.getDefault();
  }

  async testConnection(host?: string, verbose = false): Promise<boolean> {
    try {
      const config = await getConfig();
      const serverHost = normalizeHost(host || config.host);
      const timeouts = config.timeouts;

      if (verbose) {
        this.logger.info(`Testing connection to ${serverHost}...`);
        this.logger.info(`Connection timeout: ${timeouts.connection}ms`);
        this.logger.info('Sending GET request to /api/tags');
        this.logger.info('Headers: { "Content-Type": "application/json" }');
      }

      const startTime = Date.now();
      const success = await this.ollamaService.testConnection(serverHost, verbose);
      const duration = Date.now() - startTime;

      if (!success) {
        throw new Error('Connection test failed');
      }

      if (verbose) {
        this.logger.info('Response: HTTP 200 OK');
        this.logger.info(`⏱️ Connection established in ${duration}ms`);
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
      const config = await getConfig();
      const ollamaHost = normalizeHost(host || config.host);
      const testModel = model || config.model;

      if (verbose) {
        this.logger.info(`Testing model '${testModel}' on ${ollamaHost}...`);
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
      const config = await getConfig();
      const ollamaHost = normalizeHost(host || config.host);
      const testModel = model || config.model;

      if (verbose) {
        this.logger.info(`Running all tests with model '${testModel}' on ${ollamaHost}...`);
      }

      // Test 1: Connection
      console.log('1️⃣  Testing connection...');
      const connectionOk = await this.testConnection(ollamaHost, verbose);
      if (!connectionOk) {
        this.logger.error('Connection test failed');
        return false;
      }

      // Test 2: Model
      console.log('\n2️⃣  Testing model...');
      const modelOk = await this.testModel(testModel, ollamaHost, verbose);
      if (!modelOk) {
        this.logger.error('Model test failed');
        return false;
      }

      // Test 3: Simple Prompt
      console.log('\n3️⃣  Testing simple prompt...');
      const promptOk = await this.testSimplePrompt(ollamaHost, testModel, verbose);
      if (!promptOk) {
        this.logger.error('Simple prompt test failed');
        return false;
      }

      // Test 4: Benchmark
      console.log('\n4️⃣  Running benchmark...');
      await this.benchmarkModel(testModel, ollamaHost, 3);

      console.log('\n✅ All tests passed!');
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
    const config = await getConfig();
    const ollamaHost = normalizeHost(host || config.host);
    const testModel = model || config.model;
    const timeouts = config.timeouts;

    if (verbose) {
      this.logger.info(`Testing simple prompt with model: ${testModel}`);
      this.logger.info(`Host: ${ollamaHost}`);
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
        this.logger.info('Sending test request...');
      }

      const response = await fetch(`${ollamaHost}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeouts.generation),
      });

      const responseText = await response.text();

      if (verbose) {
        this.logger.info(`Response received (${responseText.length} characters)`);
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
          this.logger.info('Response field exists:', 'response' in data);

          if (data.response) {
            this.logger.info('Response preview:', `${data.response.substring(0, 100)}...`);
          }

          if (data.model) {
            this.logger.info('Model used:', data.model);
          }

          if (data.total_duration) {
            this.logger.info('Generation time:', `${(data.total_duration / 1000000).toFixed(0)}ms`);
          }
        } else {
          this.logger.success('Simple prompt test passed');
        }

        // Check for error in response
        if (data.error) {
          this.logger.error('Model returned error:', data.error);

          if (data.error.toString().toLowerCase().includes('not found')) {
            this.logger.info(TROUBLE_SHOOTING.MODEL_NOT_FOUND(testModel));
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
          console.log(responseText);
        }

        // Try to extract useful information from malformed response
        if (responseText.includes('error')) {
          this.logger.error('Response contains error information');

          if (responseText.toLowerCase().includes('not found')) {
            this.logger.info(TROUBLE_SHOOTING.MODEL_NOT_FOUND(testModel));
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
          this.logger.info(TROUBLE_SHOOTING.TIMEOUT(timeouts.generation));
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
      const ollama = new OllamaService(this.logger);
      const available = await ollama.isModelAvailable(host, model);
      if (available) {
        this.logger.success(`Model '${model}' is available`);
      } else {
        if (!verbose) {
          this.logger.warn(`Model '${model}' is not available`);
        } else {
          this.logger.info(TROUBLE_SHOOTING.MODEL_NOT_FOUND(model));
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
    const config = await getConfig();
    const ollamaHost = normalizeHost(host || config.host);
    const testModel = model || config.model;

    console.log('🧪 Running full workflow test...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Test 1: Connection
    console.log('1️⃣  Testing connection...');
    const connectionOk = await this.testConnection(ollamaHost, verbose);
    if (!connectionOk) {
      this.logger.error('❌ Connection test failed');
      return false;
    }

    // Test 2: Model availability
    console.log('\n2️⃣  Testing model availability...');
    const modelOk = await this.testModelAvailability(testModel, ollamaHost, verbose);
    if (!modelOk) {
      this.logger.error('❌ Model availability test failed');
      return false;
    }

    // Test 3: Simple prompt
    console.log('\n3️⃣  Testing simple prompt generation...');
    const promptOk = await this.testSimplePrompt(ollamaHost, testModel, verbose);
    if (!promptOk) {
      this.logger.error('❌ Simple prompt test failed');
      return false;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    this.logger.success('All tests passed! Your setup is working correctly.');

    console.log('');
    console.log('📋 Test summary:');
    console.log(`   ✅ Connection to ${ollamaHost}`);
    console.log(`   ✅ Model '${testModel}' available`);
    console.log('   ✅ Simple prompt generation working');

    console.log('');
    console.log('🚀 Ready to generate commit messages!');
    console.log('   Try: ollama-commit -d /path/to/your/repo');

    return true;
  }

  async benchmarkModel(model?: string, host?: string, iterations = 3): Promise<void> {
    const config = await getConfig();
    const ollamaHost = normalizeHost(host || config.host);
    const testModel = model || config.model;

    console.log(`⏱️  Benchmarking model: ${testModel}`);
    console.log(`🎯 Running ${iterations} iterations...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      console.log(`\n📊 Run ${i + 1}/${iterations}:`);

      const startTime = Date.now();

      try {
        const success = await this.testSimplePrompt(ollamaHost, testModel, false);
        const duration = Date.now() - startTime;

        if (success) {
          results.push(duration);
          console.log(`   ✅ Completed in ${duration}ms`);
        } else {
          console.log('   ❌ Failed');
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error}`);
      }
    }

    if (results.length > 0) {
      const avgTime = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
      const minTime = Math.min(...results);
      const maxTime = Math.max(...results);

      console.log(
        '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      );
      console.log('📈 Benchmark Results:');
      console.log(`   Average time: ${avgTime}ms`);
      console.log(`   Fastest time: ${minTime}ms`);
      console.log(`   Slowest time: ${maxTime}ms`);
      console.log(
        `   Success rate: ${results.length}/${iterations} (${Math.round((results.length / iterations) * 100)}%)`,
      );

      // Performance rating
      if (avgTime < 2000) {
        console.log('   🚀 Performance: Excellent (< 2s)');
      } else if (avgTime < 5000) {
        console.log('   ⚡ Performance: Good (< 5s)');
      } else if (avgTime < 10000) {
        console.log('   🐌 Performance: Slow (< 10s)');
      } else {
        console.log('   🦴 Performance: Very Slow (> 10s)');
      }
    } else {
      console.log('\n❌ No successful runs completed');
    }
  }

  async testPrompt(
    host?: string,
    model?: string,
    prompt?: string,
    verbose = false,
  ): Promise<boolean> {
    const config = await getConfig();
    const ollamaHost = normalizeHost(host || config.host);
    const testModel = model || config.model;
    const testPrompt = prompt || 'Test prompt';
    const timeouts = config.timeouts;

    if (verbose) {
      this.logger.info(`Testing prompt with model '${testModel}' on ${ollamaHost}...`);
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
        this.logger.info(`Response received (${responseText.length} characters)`);
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
          this.logger.info('Response field exists:', 'response' in data);

          if (data.response) {
            this.logger.info('Response preview:', `${data.response.substring(0, 100)}...`);
          }

          if (data.model) {
            this.logger.info('Model used:', data.model);
          }

          if (data.total_duration) {
            this.logger.info('Generation time:', `${(data.total_duration / 1000000).toFixed(0)}ms`);
          }
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
          console.log(responseText);
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
          this.logger.info(TROUBLE_SHOOTING.TIMEOUT(timeouts.generation));
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
}
