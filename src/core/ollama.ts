import { Logger } from '../utils/logger';
import { Spinner } from '../utils/spinner';
import { getConfig } from './config';
import type { ModelInfo } from '../types';
import { normalizeHost } from '../utils/url';
import { IOllamaService, ILogger } from './interfaces';

export class OllamaService implements IOllamaService {
  private config = getConfig();
  private logger: ILogger;
  private spinner: Spinner;

  constructor(logger: ILogger = Logger.getDefault(), spinner: Spinner = new Spinner()) {
    this.logger = logger;
    this.spinner = spinner;
  }

  async generateCommitMessage(
    _model: string,
    host: string,
    prompt: string,
    verbose = false,
  ): Promise<string> {
    const config = await this.config;

    const formattedHost = normalizeHost(host);

    if (verbose) {
      this.logger.info(`Generating commit message with ${_model}...`);
      this.logger.info(`Ollama host: ${formattedHost}`);
      this.logger.info(`Prompt length: ${prompt.length} characters`);
    }

    // Show spinner for non-verbose mode
    if (!verbose) {
      this.spinner.start('🤖 Generating commit message');
    }

    try {
      const payload = {
        model: _model,
        prompt,
        stream: false,
      };

      if (verbose) {
        this.logger.debug(`JSON payload size: ${JSON.stringify(payload).length} bytes`);
      }

      const url = `${formattedHost}/api/generate`;
      const headers = { 'Content-Type': 'application/json' };
      const body = JSON.stringify(payload);

      if (verbose) {
        this.logger.debug(`Full URL: ${url}`);
        this.logger.debug(`Headers: ${JSON.stringify(headers)}`);
        this.logger.debug(`Payload: ${body}`);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(config.timeouts.generation),
      });

      if (!verbose) {
        this.spinner.stop();
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();

      if (verbose) {
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
      if (!verbose) {
        this.spinner.stop();
      }

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
    // More comprehensive emoji and symbol removal
    return text
      .replace(/[\p{Emoji}\u{1F3FB}-\u{1F3FF}\u{1F9B0}-\u{1F9B3}]/gu, '') // Remove emojis and skin tone modifiers
      .replace(/[\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Remove additional symbols
      .replace(/️/g, '') // Remove variation selector (invisible character that follows some emojis)
      .replace(/^\s+|\s+$/gm, '') // Trim whitespace from each line
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
  }

  private cleanMessage(text: string): string {
    // properly format the message
    return text
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
    const config = await this.config;
    const ollamaHost = normalizeHost(host || config.host);
    const timeouts = config.timeouts;

    if (verbose) {
      this.logger.info(`Testing Ollama connection to ${ollamaHost}`);
      this.logger.debug(`Connection timeout: ${timeouts.connection}ms`);
    }

    try {
      const response = await fetch(`${ollamaHost}/api/tags`, {
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
      // Provide helpful troubleshooting
      console.log('\n🔧 Troubleshooting steps:');
      console.log('   1. Check if Ollama is running:');
      console.log('      ollama serve');
      console.log('\n   2. Verify the host configuration:');
      console.log('      ollama-commit --config-show');
      console.log('\n   3. Try different host formats:');
      console.log('      http://localhost:11434 (local)');
      console.log('      http://127.0.0.1:11434 (local IP)');
      console.log('      http://your-server:11434 (remote)');
      console.log('\n   4. Check firewall and network:');
      console.log('      curl http://localhost:11434/api/tags');
      if (
        typeof error === 'object' &&
        error &&
        'name' in error &&
        (error as { name: string }).name === 'TimeoutError'
      ) {
        console.log('\n   5. Increase timeout in config file');
      }
      return false;
    }
  }

  async isModelAvailable(host: string, model: string): Promise<boolean> {
    const config = await this.config;
    const formattedHost = normalizeHost(host || config.host);

    try {
      const response = await fetch(`${formattedHost}/api/tags`, {
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
    const config = await this.config;
    const formattedHost = normalizeHost(_host || config.host);

    this.logger.info(`⏳ Pulling model: ${_model} from ${formattedHost}`);

    try {
      const response = await fetch(`${formattedHost}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: _model, stream: true }),
        signal: AbortSignal.timeout(config.timeouts.modelPull),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}. Details: ${errorText}`);
      }

      // TODO: Implement progress tracking for streaming response
      // For now, just consume the stream
      const reader = (response.body as ReadableStream<Uint8Array>).getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }

      this.logger.success(`✅ Model '${_model}' pulled successfully.`);
    } catch (error: unknown) {
      this.logger.error(`❌ Failed to pull model '${_model}':`);
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
    const config = await this.config;
    const formattedHost = normalizeHost(_host || config.host);

    try {
      const response = await fetch(`${formattedHost}/api/tags`, {
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

  async getModels(host: string): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${normalizeHost(host)}/api/tags`);
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
