import { Logger } from '../utils/logger';
import { OllamaService } from '../core/ollama';
import { getConfig } from '../core/config';
import { normalizeHost } from '../utils/url';

export class TestCommand {
  private ollamaService: OllamaService;

  constructor() {
    this.ollamaService = new OllamaService();
  }

  async testConnection(host?: string, verbose = false): Promise<boolean> {
    try {
      const config = await getConfig();
      const serverHost = normalizeHost(host || config.host);

      const success = await this.ollamaService.testConnection(serverHost, verbose);
      if (!success) {
        throw new Error('Connection test failed');
      }
      
      Logger.success(`Successfully connected to Ollama server at ${serverHost}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Logger.error('Connection test failed:', errorMessage);
      return false;
    }
  }

  async testModel(model?: string, host?: string, verbose = false): Promise<boolean> {
    try {
      const config = await getConfig();
      const ollamaHost = normalizeHost(host || config.host);
      const testModel = model || config.model;

      if (verbose) {
        Logger.info(`Testing model '${testModel}' on ${ollamaHost}...`);
      }

      const connectionOk = await this.testConnection(ollamaHost, verbose);
      if (!connectionOk) {
        Logger.error('❌ Model test failed');
        return false;
      }

      return true;
    } catch (error: unknown) {
      Logger.error('Test model failed:', error);
      if (typeof error === 'object' && error && 'message' in error) {
        Logger.error(`Error: ${(error as { message: string }).message}`);
      } else {
        Logger.error(`Error: ${String(error)}`);
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
        Logger.info(`Running all tests with model '${testModel}' on ${ollamaHost}...`);
      }

      // Test 1: Connection
      console.log('1️⃣  Testing connection...');
      const connectionOk = await this.testConnection(ollamaHost, verbose);
      if (!connectionOk) {
        Logger.error('Connection test failed');
        return false;
      }

      // Test 2: Model
      console.log('\n2️⃣  Testing model...');
      const modelOk = await this.testModel(testModel, ollamaHost, verbose);
      if (!modelOk) {
        Logger.error('Model test failed');
        return false;
      }

      // Test 3: Simple Prompt
      console.log('\n3️⃣  Testing simple prompt...');
      const promptOk = await this.testSimplePrompt(ollamaHost, testModel, verbose);
      if (!promptOk) {
        Logger.error('Simple prompt test failed');
        return false;
      }

      // Test 4: Benchmark
      console.log('\n4️⃣  Running benchmark...');
      await this.benchmarkModel(testModel, ollamaHost, 3);

      console.log('\n✅ All tests passed!');
      return true;
    } catch (error: unknown) {
      Logger.error('Test all failed:', error);
      if (typeof error === 'object' && error && 'message' in error) {
        Logger.error(`Error: ${(error as { message: string }).message}`);
      } else {
        Logger.error(`Error: ${String(error)}`);
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
      Logger.info(`Testing simple prompt with model: ${testModel}`);
      Logger.info(`Host: ${ollamaHost}`);
      Logger.debug(`Generation timeout: ${timeouts.generation}ms`);
    }

    const payload = {
      model: testModel,
      prompt: 'Hello, please respond with: Test successful',
      stream: false,
    };

    if (verbose) {
      Logger.debug('Test payload:', JSON.stringify(payload, null, 2));
    }

    try {
      if (verbose) {
        Logger.info('Sending test request...');
      }

      const response = await fetch(`${ollamaHost}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeouts.generation),
      });

      const responseText = await response.text();

      if (verbose) {
        Logger.info(`Response received (${responseText.length} characters)`);
        Logger.debug(`First 500 chars: ${responseText.substring(0, 500)}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Test JSON validity
      try {
        const data = JSON.parse(responseText);

        if (verbose) {
          Logger.success('Valid JSON response');
          Logger.info('Response field exists:', 'response' in data);

          if (data.response) {
            Logger.info('Response preview:', `${data.response.substring(0, 100)}...`);
          }

          if (data.model) {
            Logger.info('Model used:', data.model);
          }

          if (data.total_duration) {
            Logger.info('Generation time:', `${(data.total_duration / 1000000).toFixed(0)}ms`);
          }
        } else {
          Logger.success('Simple prompt test passed');
        }

        // Check for error in response
        if (data.error) {
          Logger.error('Model returned error:', data.error);

          if (data.error.toString().toLowerCase().includes('not found')) {
            console.log('');
            console.log('🔧 Model not found. Try:');
            console.log(`   ollama pull ${testModel}`);
            console.log('   ollama-commit --list-models');
            console.log('   ollama-commit --auto-model -d /path/to/repo');
          }

          return false;
        }

        // Check if we got a reasonable response
        if (!data.response || data.response.trim().length === 0) {
          Logger.warn('Model returned empty response');
          return false;
        }

        return true;
      } catch (parseError: unknown) {
        if (typeof parseError === 'object' && parseError && 'message' in parseError) {
          Logger.error('JSON parsing failed:', (parseError as { message: string }).message);
        } else {
          Logger.error('JSON parsing failed:', String(parseError));
        }

        if (verbose) {
          Logger.debug('Raw response that failed to parse:');
          console.log(responseText);
        }

        // Try to extract useful information from malformed response
        if (responseText.includes('error')) {
          Logger.error('Response contains error information');

          if (responseText.toLowerCase().includes('not found')) {
            console.log('');
            console.log('🔧 Possible model not found. Try:');
            console.log(`   ollama pull ${testModel}`);
          }
        }

        return false;
      }
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'name' in error && (error as { name: string }).name === 'TimeoutError') {
        Logger.error('Request timed out');
        if (verbose) {
          console.log('');
          console.log('🔧 Timeout troubleshooting:');
          console.log(`   • Current timeout: ${timeouts.generation}ms`);
          console.log('   • Try a smaller model for faster response');
          console.log('   • Increase timeout in config file:');
          console.log('     "timeouts": { "generation": 300000 }');
          console.log('   • Check system resources (CPU/Memory/GPU)');
        }
      } else if (typeof error === 'object' && error && 'message' in error && (error as { message: string }).message.includes('fetch')) {
        Logger.error('Network request failed:', (error as { message: string }).message);
        if (verbose) {
          console.log('');
          console.log('🔧 Network troubleshooting:');
          console.log('   • Verify Ollama is running: ollama serve');
          console.log('   • Check host configuration: ollama-commit --config-show');
          console.log('   • Test basic connection: ollama-commit --test');
        }
      } else {
        if (typeof error === 'object' && error && 'message' in error) {
          Logger.error('Request failed:', (error as { message: string }).message);
        } else {
          Logger.error('Request failed:', String(error));
        }
      }

      return false;
    }
  }

  async testModelAvailability(model: string, host?: string): Promise<boolean> {
    const config = await getConfig();
    const ollamaHost = normalizeHost(host || config.host);

    try {
      const available = await this.ollamaService.isModelAvailable(ollamaHost, model);

      if (available) {
        Logger.success(`✅ Model '${model}' is available`);
      } else {
        Logger.warn(`⚠️  Model '${model}' is not available`);
        console.log('');
        console.log('🔧 To install this model:');
        console.log(`   ollama pull ${model}`);
      }

      return available;
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'message' in error) {
        Logger.error(`Failed to check model availability: ${(error as { message: string }).message}`);
      } else {
        Logger.error(`Failed to check model availability: ${String(error)}`);
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
      Logger.error('❌ Connection test failed');
      return false;
    }

    // Test 2: Model availability
    console.log('\n2️⃣  Testing model availability...');
    const modelOk = await this.testModelAvailability(testModel, ollamaHost);
    if (!modelOk) {
      Logger.error('❌ Model availability test failed');
      return false;
    }

    // Test 3: Simple prompt
    console.log('\n3️⃣  Testing simple prompt generation...');
    const promptOk = await this.testSimplePrompt(ollamaHost, testModel, verbose);
    if (!promptOk) {
      Logger.error('❌ Simple prompt test failed');
      return false;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.success('🎉 All tests passed! Your setup is working correctly.');

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

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📈 Benchmark Results:');
      console.log(`   Average time: ${avgTime}ms`);
      console.log(`   Fastest time: ${minTime}ms`);
      console.log(`   Slowest time: ${maxTime}ms`);
      console.log(`   Success rate: ${results.length}/${iterations} (${Math.round(results.length / iterations * 100)}%)`);

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
}
