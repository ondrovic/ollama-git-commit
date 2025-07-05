import { MODELS } from '../constants/models';
import { TROUBLE_SHOOTING } from '../constants/troubleshooting';
import { getConfig } from '../core/config';
import { ILogger, IOllamaService } from '../core/interfaces';
import { OllamaService } from '../core/ollama';
import type { ModelInfo } from '../types';
import { formatFileSize } from '../utils/formatFileSize';
import { Logger } from '../utils/logger';
import { normalizeHost } from '../utils/url';

export class ModelsCommand {
  private logger: ILogger;
  private ollamaService: IOllamaService;

  constructor(ollamaService?: IOllamaService, logger: ILogger = Logger.getDefault()) {
    this.logger = logger;
    this.ollamaService = ollamaService || new OllamaService(this.logger, undefined, false);
  }

  async listModels(host?: string, verbose = false): Promise<void> {
    const config = await getConfig();
    const ollamaHost = normalizeHost(host || config.host);
    const timeouts = config.timeouts;

    try {
      const response = await fetch(`${ollamaHost}/api/tags`, {
        signal: AbortSignal.timeout(timeouts.connection),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.models || !Array.isArray(data.models)) {
        throw new Error('Invalid response from Ollama server');
      }

      // Pretty output: table with model name, size, family, and star for current model
      if (verbose) {
        console.log(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );
        console.log(`🔧 Current configured model: ${config.model}`);
        console.log(`🌐 Ollama host: ${config.host}`);
        console.log(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );
      } else {
        console.log(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );
      }
      console.log('Available models:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      data.models.forEach((model: ModelInfo) => {
        const size = model.size ? formatFileSize(model.size) : 'n/a';
        const family = model.details?.family ? ` [${model.details.family}]` : '';
        const currentModel = model.name === config.model ? ' ⭐ (current)' : '';
        console.log(`  📦 ${model.name} ${size}${family}${currentModel}`);
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📊 Total: ${data.models.length} models available`);
    } catch (error: unknown) {
      this.logger.error(`Cannot fetch models from ${ollamaHost}`);
      if (typeof error === 'object' && error && 'message' in error) {
        this.logger.error(`Error: ${(error as { message: string }).message}`);
      } else {
        this.logger.error(`Error: ${String(error)}`);
      }
      // Provide helpful troubleshooting
      this.logger.info(TROUBLE_SHOOTING.GENERAL);
      if (
        typeof error === 'object' &&
        error &&
        'name' in error &&
        (error as { name: string }).name === 'TimeoutError'
      ) {
        console.log('   5. Increase timeout in config file');
      }
    }
  }

  async getDefaultModel(host?: string, verbose = false): Promise<string | null> {
    const config = await getConfig();
    const ollamaHost = normalizeHost(host || config.host);
    const timeouts = config.timeouts;

    try {
      const response = await fetch(`${ollamaHost}/api/tags`, {
        signal: AbortSignal.timeout(timeouts.connection),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.models || !Array.isArray(data.models)) {
        return null;
      }

      // Get preferred models from config or use sensible defaults
      const preferred = this.getPreferredModels();
      const modelNames = data.models.map((m: ModelInfo) => m.name);

      if (verbose) {
        this.logger.debug(`Available models: ${modelNames.join(', ')}`);
        this.logger.debug(`Preferred models (in order): ${preferred.join(', ')}`);
      }

      // Try to find a preferred model (exact match first)
      for (const pref of preferred) {
        if (modelNames.includes(pref)) {
          if (verbose) {
            this.logger.info(`Auto-selected model (exact match): ${pref}`);
          }
          return pref;
        }
      }

      // Try partial matches
      for (const pref of preferred) {
        for (const name of modelNames) {
          const prefBase = pref.split(':')[0];
          if (
            prefBase &&
            (name.toLowerCase().includes(pref.toLowerCase()) ||
              name.toLowerCase().includes(prefBase.toLowerCase()))
          ) {
            if (verbose) {
              this.logger.info(`Auto-selected model (partial match): ${name}`);
            }
            return name;
          }
        }
      }

      // If no preferred model found, use the first available
      if (modelNames.length > 0) {
        if (verbose) {
          this.logger.info(`Auto-selected model (first available): ${modelNames[0]}`);
        }
        return modelNames[0];
      }

      return null;
    } catch (error: unknown) {
      if (verbose) {
        if (typeof error === 'object' && error && 'message' in error) {
          this.logger.error(
            `Error getting default model: ${(error as { message: string }).message}`,
          );
        } else {
          this.logger.error(`Error getting default model: ${String(error)}`);
        }
      }
      return null;
    }
  }

  private getPreferredModels(): string[] {
    return [...MODELS.PREFERRED] as string[];
  }

  async handleModelError(model: string, host?: string): Promise<void> {
    const config = await getConfig();
    const ollamaHost = normalizeHost(host || config.host);

    this.logger.error(`Model '${model}' not found on Ollama server`);
    this.logger.info(TROUBLE_SHOOTING.MODEL_NOT_FOUND(model));

    await this.listModels(ollamaHost, true);

    console.log('');
    console.log('   3. Or let the script auto-select a model:');
    const autoModel = await this.getDefaultModel(ollamaHost);
    if (autoModel) {
      console.log(`      💡 Suggested: ollama-git-commit --model ${autoModel} -d /path/to/repo`);
      console.log('      💡 Or set in config: ollama-git-commit --config-show');
    }

    // Popular models
    console.log(MODELS.POPULAR);

    // Configuration options
    console.log(MODELS.CONFIGURATION);
  }

  async validateModel(model: string, host?: string): Promise<boolean> {
    const config = await getConfig();
    const ollamaHost = normalizeHost(host || config.host);
    const timeouts = config.timeouts;

    try {
      const response = await fetch(`${ollamaHost}/api/tags`, {
        signal: AbortSignal.timeout(timeouts.connection),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();

      if (!data.models || !Array.isArray(data.models)) {
        return false;
      }

      return data.models.some((m: ModelInfo) => m.name === model);
    } catch {
      return false;
    }
  }

  async getModelInfo(model: string, host?: string): Promise<ModelInfo | null> {
    const config = await getConfig();
    const ollamaHost = normalizeHost(host || config.host);
    const timeouts = config.timeouts;

    try {
      const response = await fetch(`${ollamaHost}/api/tags`, {
        signal: AbortSignal.timeout(timeouts.connection),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (!data.models || !Array.isArray(data.models)) {
        return null;
      }

      return data.models.find((m: ModelInfo) => m.name === model) || null;
    } catch {
      return null;
    }
  }

  async suggestModel(
    useCase: 'speed' | 'quality' | 'balanced' = 'balanced',
    host?: string,
  ): Promise<string | null> {
    const config = await getConfig();
    const ollamaHost = normalizeHost(host || config.host);

    try {
      const response = await fetch(`${ollamaHost}/api/tags`, {
        signal: AbortSignal.timeout(config.timeouts.connection),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (!data.models || !Array.isArray(data.models)) {
        return null;
      }

      const availableModels = data.models.map((m: ModelInfo) => m.name);

      // Model recommendations based on use case
      const recommendations = {
        speed: ['llama3.2:1b', 'phi3:mini', 'gemma2:2b', 'qwen2.5:1.5b'],
        quality: ['llama3.2:70b', 'codellama:34b', 'qwen2.5:72b', 'mistral:8x7b'],
        balanced: ['llama3.2:latest', 'llama3.2:8b', 'codellama:7b', 'qwen2.5:7b', 'mistral:7b'],
      };

      // Find the first available model for the use case
      for (const model of recommendations[useCase]) {
        if (availableModels.includes(model)) {
          return model;
        }
      }

      // Fallback to any available model
      return availableModels[0] || null;
    } catch {
      return null;
    }
  }

  async getModelStats(
    host?: string,
  ): Promise<{ total: number; byFamily: Record<string, number>; totalSize: number }> {
    const config = await getConfig();
    const ollamaHost = normalizeHost(host || config.host);
    const timeouts = config.timeouts;

    const stats = {
      total: 0,
      byFamily: {} as Record<string, number>,
      totalSize: 0,
    };

    try {
      const response = await fetch(`${ollamaHost}/api/tags`, {
        signal: AbortSignal.timeout(timeouts.connection),
      });

      if (!response.ok) {
        return stats;
      }

      const data = await response.json();

      if (!data.models || !Array.isArray(data.models)) {
        return stats;
      }

      stats.total = data.models.length;

      data.models.forEach((model: ModelInfo) => {
        if (model.details?.family) {
          stats.byFamily[model.details.family] = (stats.byFamily[model.details.family] || 0) + 1;
        }

        if (model.size) {
          stats.totalSize += model.size;
        }
      });

      return stats;
    } catch {
      return stats;
    }
  }
}
