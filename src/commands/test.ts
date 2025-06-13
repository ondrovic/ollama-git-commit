import { OllamaService } from '../core/ollama';
import { Logger } from '../utils/logger';
import { formatFileSize } from '../utils/formatFileSize';
import { getConfig } from '../core/config';

export class TestCommand {
  private ollamaService: OllamaService;
  
  constructor() {
    this.ollamaService = new OllamaService();
  }

  async testConnection(host?: string, verbose: boolean = false): Promise<boolean> {
    const config = getConfig();
    const ollamaHost = host || config.host; // Use config default instead of hardcoded
    const timeouts = config.timeouts;
    
    if (verbose) {
      Logger.info(`Testing Ollama connection to ${ollamaHost}`);
      Logger.debug(`Connection timeout: ${timeouts.connection}ms`);
    }

    try {
      const response = await fetch(`${ollamaHost}/api/tags`, {
        signal: AbortSignal.timeout(timeouts.connection), // Use config timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (verbose) {
        Logger.success('Ollama connection successful');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (data.models && Array.isArray(data.models)) {
          console.log(`📦 Available models (${data.models.length}):`);
          
          let totalSize = 0;
          const modelFamilies: Record<string, number> = {};
          
          data.models.forEach((model: any) => {
            const size = model.size ? formatFileSize(model.size) : 'unknown size';
            const family = model.details?.family ? ` [${model.details.family}]` : '';
            const currentModel = model.name === config.model ? ' ⭐ (current)' : '';
            
            console.log(`   📄 ${model.name} ${size}${family}${currentModel}`);
            
            // Collect stats
            if (model.size) totalSize += model.size;
            if (model.details?.family) {
              modelFamilies[model.details.family] = (modelFamilies[model.details.family] || 0) + 1;
            }
          });
          
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`📊 Summary:`);
          console.log(`   Total models: ${data.models.length}`);
          console.log(`   Total size: ${formatFileSize(totalSize)}`);
          console.log(`   Current configured model: ${config.model}`);
          
          if (Object.keys(modelFamilies).length > 0) {
            console.log(`   Model families: ${Object.entries(modelFamilies)
              .map(([family, count]) => `${family} (${count})`)
              .join(', ')}`);
          }
        } else {
          console.log('⚠️  No models found on server');
          console.log('');
          console.log('💡 Install some models:');
          console.log('   ollama pull llama3.2');
          console.log('   ollama pull codellama');
          console.log('   ollama pull mistral');
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      } else {
        Logger.success(`Connection OK - ${ollamaHost}`);
      }
      
      return true;
    } catch (error: any) {
      Logger.error(`Cannot connect to Ollama at ${ollamaHost}`);
      
      if (verbose) {
        Logger.error(`Detailed error: ${error.message}`);
        console.log('');
        console.log('🔧 Troubleshooting steps:');
        console.log('   1. Check if Ollama is running:');
        console.log('      ollama serve');
        console.log('');
        console.log('   2. Verify the host configuration:');
        console.log('      ollama-commit --config-show');
        console.log('');
        console.log('   3. Try different host formats:');
        console.log('      http://localhost:11434 (local)');
        console.log('      http://127.0.0.1:11434 (local IP)');
        console.log('      http://your-server:11434 (remote)');
        console.log('');
        console.log('   4. Check firewall and network:');
        console.log('      curl http://localhost:11434/api/tags');
        
        if (error.name === 'TimeoutError') {
          console.log('');
          console.log('   5. Increase connection timeout in config file:');
          console.log('      "timeouts": { "connection": 30000 }');
        }
        
        console.log('');
        console.log('   6. Verify Ollama installation:');
        console.log('      ollama --version');
      } else {
        Logger.error('Make sure Ollama is running and accessible');
        Logger.info('Use --verbose for detailed troubleshooting information');
      }
      
      return false;
    }
  }

  async testSimplePrompt(host?: string, model?: string, verbose: boolean = false): Promise<boolean> {
    const config = getConfig();
    const ollamaHost = host || config.host; // Use config default
    const testModel = model || config.model; // Use config default model
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
        signal: AbortSignal.timeout(timeouts.generation), // Use config timeout
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
          Logger.success('✅ Valid JSON response');
          Logger.info('Response field exists:', 'response' in data);
          
          if (data.response) {
            Logger.info('Response preview:', data.response.substring(0, 100) + '...');
          }
          
          if (data.model) {
            Logger.info('Model used:', data.model);
          }
          
          if (data.total_duration) {
            Logger.info('Generation time:', `${(data.total_duration / 1000000).toFixed(0)}ms`);
          }
        } else {
          Logger.success('✅ Simple prompt test passed');
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
          Logger.warn('⚠️  Model returned empty response');
          return false;
        }
        
        return true;
      } catch (parseError: any) {
        Logger.error('❌ JSON parsing failed:', parseError.message);
        
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
    } catch (error: any) {
      if (error.name === 'TimeoutError') {
        Logger.error('❌ Request timed out');
        if (verbose) {
          console.log('');
          console.log('🔧 Timeout troubleshooting:');
          console.log(`   • Current timeout: ${timeouts.generation}ms`);
          console.log('   • Try a smaller model for faster response');
          console.log('   • Increase timeout in config file:');
          console.log('     "timeouts": { "generation": 300000 }');
          console.log('   • Check system resources (CPU/Memory/GPU)');
        }
      } else if (error.message.includes('fetch')) {
        Logger.error('❌ Network request failed:', error.message);
        if (verbose) {
          console.log('');
          console.log('🔧 Network troubleshooting:');
          console.log('   • Verify Ollama is running: ollama serve');
          console.log('   • Check host configuration: ollama-commit --config-show');
          console.log('   • Test basic connection: ollama-commit --test');
        }
      } else {
        Logger.error('❌ Request failed:', error.message);
      }
      
      return false;
    }
  }

  async testModelAvailability(model: string, host?: string): Promise<boolean> {
    const config = getConfig();
    const ollamaHost = host || config.host;
    
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
    } catch (error: any) {
      Logger.error(`Failed to check model availability: ${error.message}`);
      return false;
    }
  }

  async testFullWorkflow(host?: string, model?: string, verbose: boolean = false): Promise<boolean> {
    const config = getConfig();
    const ollamaHost = host || config.host;
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
    console.log(`   ✅ Simple prompt generation working`);
    
    console.log('');
    console.log('🚀 Ready to generate commit messages!');
    console.log('   Try: ollama-commit -d /path/to/your/repo');
    
    return true;
  }

  async benchmarkModel(model?: string, host?: string, iterations: number = 3): Promise<void> {
    const config = getConfig();
    const ollamaHost = host || config.host;
    const testModel = model || config.model;
    
    console.log(`⏱️  Benchmarking model: ${testModel}`);
    console.log(`🎯 Running ${iterations} iterations...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const results: number[] = [];
    const testPrompt = 'Write a short commit message for adding a new feature to handle user authentication.';
    
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
          console.log(`   ❌ Failed`);
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
// import { OllamaService } from '../core/ollama';
// import { Logger } from '../utils/logger';
// import { getConfigValue, getConfig } from '../core/config';

// export class TestCommand {
//   private ollamaService: OllamaService;
//   constructor() {
//     this.ollamaService = new OllamaService();
//   }

//   async testConnection(host?: string, verbose: boolean = false): Promise<boolean> {
//     // const ollamaHost = host || process.env.OLLAMA_HOST || 'http://192.168.0.3:11434';
//     const config = getConfig();
//     const ollamaHost = host || config.host;
//     const timeouts = getConfigValue('timeouts');
    
//     if (verbose) {
//       Logger.info(`Testing Ollama connection to ${ollamaHost}`);
//     }

//     try {
//       const response = await fetch(`${ollamaHost}/api/tags`, {
//         signal: AbortSignal.timeout(10000),
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
//       }

//       const data = await response.json();

//       if (verbose) {
//         Logger.success('Ollama connection successful');
//         if (data.models && Array.isArray(data.models)) {
//           console.log('Available models:');
//           data.models.forEach((model: any) => {
//             const size = model.size ? `(${(model.size / (1024 * 1024 * 1024)).toFixed(1)} GB)` : '';
//             console.log(`  - ${model.name} ${size}`);
//           });
//         }
//       } else {
//         Logger.success('OK')
//       }
//       return true;
//     } catch (error: any) {
//       Logger.error(`Cannot connect to Ollama at ${ollamaHost}`);
//       Logger.error('Make sure Ollama is running and accessible');
//       if (verbose) {
//         Logger.error(`Error: ${error.message}`);
//       }
//       return false;
//     }
//   }

//   async testSimplePrompt(host?: string, model: string = 'mistral:7b-instruct', verbose: boolean = false): Promise<boolean> {
//     const ollamaHost = host || process.env.OLLAMA_HOST || 'http://192.168.0.3:11434';

//     if (verbose) Logger.info(`Testing with simple prompt for ${ollamaHost}`);

//     const payload = {
//       model,
//       prompt: 'Hello, please respond with: Test successful',
//       stream: false,
//     };

//     if (verbose) Logger.debug('Test payload:', JSON.stringify(payload, null, 2));

//     try {
//       const response = await fetch(`${ollamaHost}/api/generate`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//         signal: AbortSignal.timeout(30000),
//       });

//       const responseText = await response.text();

//       if (verbose) Logger.info(`Raw response length: ${responseText.length}`);
//       if (verbose) Logger.debug(`First 500 chars: ${responseText.substring(0, 500)}`);

//       // Test JSON validity
//       try {
//         const data = JSON.parse(responseText);
//         Logger.success('Valid JSON');
//         if (verbose) Logger.info('Response field exists:', 'response' in data);

//         if (verbose && data.response) {
//           Logger.info('Response content:', data.response.substring(0, 100));
//         }
//         return true;
//       } catch {
//         Logger.error('JSON parsing failed');
//         return false;
//       }
//     } catch (error: any) {
//       Logger.error('Request failed:', error.message);
//       return false;
//     }
//   }
// }