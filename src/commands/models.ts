import { Logger } from '../utils/logger';
import { formatFileSize } from '../utils/formatFileSize';
import type { ModelInfo } from '../index';

export class ModelsCommand {
  async listModels(host?: string, verbose: boolean = false): Promise<void> {
    const ollamaHost = host || process.env.OLLAMA_HOST || 'http://192.168.0.3:11434';
    
    if (verbose) {
      Logger.info(`Fetching available models from ${ollamaHost}...`);
    }

    try {
      const response = await fetch(`${ollamaHost}/api/tags`, {
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.models && Array.isArray(data.models)) {
        console.log('Available models:');
        data.models.forEach((model: ModelInfo) => {
          // const size = model.size ? `(${(model.size / (1024 * 1024)).toFixed(1)} MB)` : '';
          const size = model.size ? formatFileSize(model.size) : 'n/a';
          const family = model.details?.family ? ` [${model.details.family}]` : '';
          console.log(`  - ${model.name} ${size}${family}`);
        });
      } else {
        console.log('No models found');
      }
    } catch (error: any) {
      Logger.error(`Cannot fetch models from ${ollamaHost}`);
      Logger.error(`Error: ${error.message}`);
    }
  }

  async getDefaultModel(host?: string, verbose: boolean = false): Promise<string | null> {
    const ollamaHost = host || process.env.OLLAMA_HOST || 'http://192.168.0.3:11434';
    
    try {
      const response = await fetch(`${ollamaHost}/api/tags`, {
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.models || !Array.isArray(data.models)) {
        return null;
      }

      const preferred = ['mistral:7b-instruct','llama3:latest', 'llama3.2', 'llama2', 'codellama', 'mistral', 'qwen'];
      const modelNames = data.models.map((m: ModelInfo) => m.name);

      // Try to find a preferred model
      for (const pref of preferred) {
        for (const name of modelNames) {
          const prefBase = pref.split(':')[0];
          if (prefBase && (name.toLowerCase().includes(pref.toLowerCase()) || 
              name.toLowerCase().includes(prefBase.toLowerCase()))) {
            if (verbose) {
              Logger.info(`Auto-selected model: ${name}`);
            }
            return name;
          }
        }
      }

      // If no preferred model found, use the first available
      if (modelNames.length > 0) {
        if (verbose) {
          Logger.info(`Auto-selected model: ${modelNames[0]}`);
        }
        return modelNames[0];
      }

      return null;
    } catch (error: any) {
      if (verbose) {
        Logger.error(`Error getting default model: ${error.message}`);
      }
      return null;
    }
  }

  async handleModelError(model: string, host?: string): Promise<void> {
    const ollamaHost = host || process.env.OLLAMA_HOST || 'http://192.168.0.3:11434';
    
    Logger.error(`Model '${model}' not found on Ollama server`);
    console.log('');
    console.log('🔧 To fix this issue:');
    console.log(`   1. Install the model: ollama pull ${model}`);
    console.log('   2. Or choose from available models:');
    console.log('');

    await this.listModels(ollamaHost, true);

    console.log('');
    console.log('   3. Or let the script auto-select a model:');
    const autoModel = await this.getDefaultModel(ollamaHost);
    if (autoModel) {
      console.log(`      Suggested: ollama-commit --model ${autoModel}`);
    }

    console.log('');
    console.log('💡 Popular models for code tasks:');
    console.log('   ollama pull llama3.2');
    console.log('   ollama pull codellama');
    console.log('   ollama pull mistral');
  }
}