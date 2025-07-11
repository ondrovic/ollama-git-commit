import { TROUBLE_SHOOTING } from '@/constants/troubleshooting';
import { EMOJIS } from '@/constants/ui';
import type { ModelInfo, OllamaCommitConfig } from '../types';
import { Logger } from '../utils/logger';
import { Spinner } from '../utils/spinner';
import { normalizeHost } from '../utils/url';
import { getConfig } from './config';
import { ILogger, IOllamaService } from './interfaces';

export interface OllamaServiceDeps {
  fetch?: typeof fetch;
  config?: OllamaCommitConfig;
  logger?: ILogger;
  spinner?: Spinner;
}

export class OllamaService implements IOllamaService {
  private configPromise: Promise<OllamaCommitConfig>;
  private logger: ILogger;
  private spinner: Spinner;
  private quiet: boolean;
  private fetchFn: typeof fetch;

  constructor(
    logger: ILogger = Logger.getDefault(),
    spinner: Spinner = new Spinner(),
    quiet = false,
    deps: OllamaServiceDeps = {},
  ) {
    this.logger = deps.logger || logger;
    this.spinner = deps.spinner || spinner;
    this.quiet = quiet;
    this.fetchFn = deps.fetch || fetch;
    this.configPromise = deps.config ? Promise.resolve(deps.config) : getConfig();
  }

  public setQuiet(quiet: boolean): void {
    this.quiet = quiet;
  }

  generateEmbeddings(_model: string, _text: string, _host?: string): Promise<number[]> {
    throw new Error('Method not implemented.');
  }
  generateEmbeddingsBatch(_model: string, _texts: string[], _host?: string): Promise<number[][]> {
    throw new Error('Method not implemented.');
  }

  async generateCommitMessage(
    _model: string,
    host: string,
    prompt: string,
    verbose = false,
  ): Promise<string> {
    const config = await this.configPromise;

    const formattedHost = normalizeHost(host);

    if (verbose && !this.quiet) {
      this.logger.info(`Generating commit message with ${_model}...`);
      this.logger.info(`Ollama host: ${formattedHost}`);
      this.logger.info(`Prompt length: ${prompt.length} characters`);
    }

    // Show spinner for visual feedback (both verbose and non-verbose modes)
    this.spinner.start('🤖 Generating commit message');

    try {
      const payload = {
        model: _model,
        prompt,
        stream: false,
      };

      if (verbose && !this.quiet) {
        this.logger.debug(`JSON payload size: ${JSON.stringify(payload).length} bytes`);
      }

      const url = `${formattedHost}/api/generate`;
      const headers = { 'Content-Type': 'application/json' };
      const body = JSON.stringify(payload);

      if (verbose && !this.quiet) {
        this.logger.debug(`Full URL: ${url}`);
        this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
        this.logger.debug(`Payload: ${body}`);
      }

      const response = await this.fetchFn(url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(config.timeouts.generation),
      });

      this.spinner.stop();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();

      if (verbose && !this.quiet) {
        this.logger.success(`Response received (${responseText.length} characters)`);
        this.logger.debug(`First 200 chars of response: ${responseText.substring(0, 200)}...`);
      }

      if (!responseText.trim()) {
        throw new Error('❌ Empty response from Ollama');
      }

      // Parse the JSON response
      const responseData = JSON.parse(responseText);

      // Extract just the message from the response
      let message = responseData.response?.trim() || '';

      if (!message) {
        throw new Error('Empty response from model');
      }

      // Only remove emojis if useEmojis is false
      if (!config.useEmojis) {
        message = this.removeEmojis(message);
      }

      // clean the message
      message = this.cleanMessage(message);

      return message;
    } catch (error: unknown) {
      this.spinner.stop();

      if (
        typeof error === 'object' &&
        error &&
        'name' in error &&
        (error as { name: string }).name === 'TimeoutError'
      ) {
        throw new Error('❌ Request timed out - Ollama may be busy or the model is too large');
      }

      if (typeof error === 'object' && error && 'message' in error) {
        throw new Error(
          `❌ Failed to connect to Ollama: ${(error as { message: string }).message}`,
        );
      } else {
        throw new Error(`❌ Failed to connect to Ollama: ${String(error)}`);
      }
    }
  }

  private removeEmojis(text: string): string {
    // Simple and comprehensive emoji removal using Unicode property escapes
    return text
      .replace(/[\p{Emoji}]/gu, '') // Remove all emoji characters
      .replace(/[\u{200D}]/gu, '') // Remove zero width joiner (for composite emojis)
      .replace(/[\u{FE0F}]/gu, '') // Remove variation selector-16 (emoji presentation)
      .replace(/️/g, '') // Remove variation selector (invisible character that follows some emojis)
      .replace(/^\s+|\s+$/gm, '') // Trim whitespace from each line
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
  }

  private cleanMessage(text: string): string {
    // Remove <think></think> content (common in some models)
    const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // properly format the message
    return cleaned
      .replace(/`/g, "'") // replace ` with '
      .replace(/"/g, "'") // replace " with '
      .replace(/'''/g, '') // Remove triple single quotes
      .replace(/\(\s*[^)]*\s*\)/g, '') // Remove parentheses with any content and spaces
      .replace(/\.([A-Z])/g, '. $1') // Add space after period before capital letter
      .replace(/\s+,/g, ',') // Remove spaces before commas
      .replace(/,{2,}/g, ',') // Replace multiple consecutive commas with single comma
      .replace(/,+\s*(and|or)\s*/g, ' and ') // Replace ",,,,, and" with just " and"
      .replace(/lines,+\s*(and|$)/g, 'lines') // Remove trailing commas after "lines"
      .replace(/on\s+lines\s*,*\s*and\s*$/gm, '') // Remove incomplete "on lines,,, and" phrases
      .replace(/-\s{2,}/g, '- ') // Replace multiple dashes with a single dash
      .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase words
      .replace(/^\s+|\s+$/gm, '') // Trim whitespace from each line
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .replace(/([^\n])-\s+/g, '$1\n- ') // Ensure single line breaks after dashes
      .trimEnd(); // trim end
  }

  async testConnection(host?: string, verbose = false): Promise<boolean> {
    const config = await this.configPromise;
    const ollamaHost = normalizeHost(host || config.host);
    const timeouts = config.timeouts;

    if (verbose) {
      this.logger.info(`Testing Ollama connection to ${ollamaHost}`);
      this.logger.debug(`Connection timeout: ${timeouts.connection}ms`);
    }

    try {
      const response = await this.fetchFn(`${ollamaHost}/api/tags`, {
        signal: AbortSignal.timeout(timeouts.connection),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (error: unknown) {
      this.logger.error(`Cannot connect to Ollama at ${ollamaHost}`);
      if (typeof error === 'object' && error && 'message' in error) {
        this.logger.error(`Detailed error: ${(error as { message: string }).message}`);
      } else {
        this.logger.error(`Detailed error: ${String(error)}`);
      }
      // Provide helpful troubleshooting steps
      this.logger.info(TROUBLE_SHOOTING.GENERAL);
      if (
        typeof error === 'object' &&
        error &&
        'name' in error &&
        (error as { name: string }).name === 'TimeoutError'
      ) {
        this.logger.info('   5. Increase timeout in config file');
      }
      return false;
    }
  }

  async isModelAvailable(host: string, model: string): Promise<boolean> {
    const config = await this.configPromise;
    const formattedHost = normalizeHost(host || config.host);

    try {
      const response = await this.fetchFn(`${formattedHost}/api/tags`, {
        signal: AbortSignal.timeout(config.timeouts.connection),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return data.models.some((m: ModelInfo) => m.name === model);
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'message' in error) {
        if ((error as { message: string }).message.includes('not found')) {
          this.logger.error(
            `Ollama server not found at ${formattedHost}. Please ensure Ollama is running.`,
          );
        } else {
          this.logger.error(
            `Error checking model availability: ${(error as { message: string }).message}`,
          );
        }
      } else {
        this.logger.error(`Error checking model availability: ${String(error)}`);
      }
      return false;
    }
  }

  async pullModel(_model: string, _host?: string): Promise<void> {
    const config = await this.configPromise;
    const formattedHost = normalizeHost(_host || config.host);

    this.logger.info(`Pulling model: ${_model} from ${formattedHost}`);

    // Start spinner for progress tracking
    this.spinner.start(`${EMOJIS.PULL} Pulling ${_model}...`);

    try {
      const response = await this.fetchFn(`${formattedHost}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: _model, stream: true }),
        signal: AbortSignal.timeout(config.timeouts.modelPull),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}. Details: ${errorText}`);
      }

      // Implement progress tracking for streaming response with fallback
      const reader = (response.body as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let progressEnabled = true;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          if (progressEnabled) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const progress = JSON.parse(line);
                  const message = this.formatPullProgress(progress, _model);
                  if (message) {
                    this.spinner.updateMessage(message);
                  }
                } catch {
                  // If JSON parsing fails, continue with fallback mode
                  progressEnabled = false;
                  break;
                }
              }
            }
          }
        }
      } catch {
        // Fallback to simple stream consumption if progress tracking fails
        progressEnabled = false;
        this.logger.debug('Progress tracking failed, using fallback mode');

        // Continue reading with the same reader until the stream is complete
        try {
          while (true) {
            const { done } = await reader.read();
            if (done) break;
          }
        } catch (fallbackError) {
          this.logger.debug('Fallback stream reading also failed:', fallbackError);
        }
      }

      this.spinner.succeed(`Model '${_model}' pulled successfully.`);
    } catch (error: unknown) {
      this.spinner.stop();
      this.logger.error(`Failed to pull model '${_model}':`);
      if (typeof error === 'object' && error && 'message' in error) {
        this.logger.error(`Error: ${(error as { message: string }).message}`);
      } else {
        this.logger.error(`Error: ${String(error)}`);
      }
      throw error;
    }
  }

  // Linter: unused arguments are intentionally prefixed with _
  async validateModel(_model: string, _host?: string): Promise<void> {
    const config = await this.configPromise;
    const formattedHost = normalizeHost(_host || config.host);

    try {
      const response = await this.fetchFn(`${formattedHost}/api/tags`, {
        signal: AbortSignal.timeout(config.timeouts.connection),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.models.some((m: ModelInfo) => m.name === _model)) {
        throw new Error(`Model '${_model}' not found on Ollama server`);
      }
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'message' in error) {
        throw new Error(`Model validation failed: ${(error as { message: string }).message}`);
      } else {
        throw new Error(`Model validation failed: ${String(error)}`);
      }
    }
  }

  private buildPrompt(_diff: string): string {
    // Placeholder for actual prompt building logic
    // For now, just return the diff as-is
    return _diff;
  }

  private formatPullProgress(progress: unknown, modelName: string): string | null {
    try {
      // Handle different progress states from Ollama API
      const p = progress as { status?: string; total?: number; completed?: number; size?: number };
      if (p.status === 'pulling') {
        if (p.total && p.completed) {
          const percentage = Math.round((p.completed / p.total) * 100);
          return `${EMOJIS.PULL} Pulling ${modelName}... ${percentage}% (${p.completed}/${p.total})`;
        }
        return `${EMOJIS.PULL} Pulling ${modelName}...`;
      }

      if (p.status === 'verifying') {
        return `${EMOJIS.MAGNIFIER} Verifying ${modelName}...`;
      }

      if (p.status === 'writing') {
        return `${EMOJIS.FLOPPY} Writing ${modelName} to disk...`;
      }

      if (p.status === 'downloading') {
        if (p.size) {
          const sizeMB = Math.round(p.size / (1024 * 1024));
          return `${EMOJIS.DOWNLOAD} Downloading ${modelName}... ${sizeMB}MB`;
        }
        return `${EMOJIS.DOWNLOAD} Downloading ${modelName}...`;
      }

      // Generic status message
      if (p.status) {
        return `${EMOJIS.PROCESSING} ${p.status.charAt(0).toUpperCase() + p.status.slice(1)} ${modelName}...`;
      }

      return null;
    } catch {
      // If formatting fails, return null to use default spinner message
      return null;
    }
  }

  async getModels(host: string): Promise<ModelInfo[]> {
    try {
      const response = await this.fetchFn(`${normalizeHost(host)}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      this.logger.error('Failed to fetch models:', error);
      return [];
    }
  }
}
