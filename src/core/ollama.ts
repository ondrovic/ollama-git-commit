import { Logger } from '../utils/logger';
import { Spinner } from '../utils/spinner';
import { getConfig } from './config';
import type { ModelInfo } from '../index';
import { normalizeHost } from '../utils/url';

export class OllamaService {
  private config = getConfig();

  constructor() {}

  async generateCommitMessage(_model: string, host: string, prompt: string, verbose = false): Promise<string> {
    const config = await this.config;

    const formattedHost = normalizeHost(host);

    if (verbose) {
      Logger.info(`Generating commit message with ${_model}...`);
      Logger.info(`Ollama host: ${formattedHost}`);
      Logger.info(`Prompt length: ${prompt.length} characters`);
    }

    // Show spinner for non-verbose mode
    const spinner = new Spinner();
    if (!verbose) {
      spinner.start('🤖 Generating commit message');
    }

    try {
      const payload = {
        model: _model,
        prompt,
        stream: false,
      };

      if (verbose) {
        Logger.debug(`JSON payload size: ${JSON.stringify(payload).length} bytes`);
      }

      const url = `${formattedHost}/api/generate`;
      const headers = { 'Content-Type': 'application/json' };
      const body = JSON.stringify(payload);

      if (verbose) {
        Logger.debug(`Full URL: ${url}`);
        Logger.debug(`Headers: ${JSON.stringify(headers)}`);
        Logger.debug(`Payload: ${body}`);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(config.timeouts.generation),
      });

      if (!verbose) {
        spinner.stop();
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();

      if (verbose) {
        Logger.success(`Response received (${responseText.length} characters)`);
        Logger.debug(`First 200 chars of response: ${responseText.substring(0, 200)}...`);
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

      return message;
    } catch (error: unknown) {
      if (!verbose) {
        spinner.stop();
      }

      if (typeof error === 'object' && error && 'name' in error && (error as { name: string }).name === 'TimeoutError') {
        throw new Error('❌ Request timed out - Ollama may be busy or the model is too large');
      }

      if (typeof error === 'object' && error && 'message' in error) {
        throw new Error(`❌ Failed to connect to Ollama: ${(error as { message: string }).message}`);
      } else {
        throw new Error(`❌ Failed to connect to Ollama: ${String(error)}`);
      }
    }
  }

  private removeEmojis(text: string): string {
    // More comprehensive emoji regex pattern
    return text
      .replace(/[\p{Emoji}\u{1F3FB}-\u{1F3FF}\u{1F9B0}-\u{1F9B3}]/gu, '') // Remove emojis and skin tone modifiers
      .replace(/^\s+|\s+$/gm, '') // Trim whitespace from each line
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
  }

  async testConnection(host?: string, verbose = false): Promise<boolean> {
    const config = await this.config;
    const ollamaHost = normalizeHost(host || config.host);
    const timeouts = config.timeouts;

    if (verbose) {
      Logger.info(`Testing Ollama connection to ${ollamaHost}`);
      Logger.debug(`Connection timeout: ${timeouts.connection}ms`);
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
      Logger.error(`Cannot connect to Ollama at ${ollamaHost}`);
      if (typeof error === 'object' && error && 'message' in error) {
        Logger.error(`Detailed error: ${(error as { message: string }).message}`);
      } else {
        Logger.error(`Detailed error: ${String(error)}`);
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
      if (typeof error === 'object' && error && 'name' in error && (error as { name: string }).name === 'TimeoutError') {
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
          Logger.warn(`Ollama server not found at ${formattedHost}. Please ensure Ollama is running.`);
        } else {
          Logger.warn(`Error checking model availability: ${(error as { message: string }).message}`);
        }
      } else {
        Logger.warn(`Error checking model availability: ${String(error)}`);
      }
      return false;
    }
  }

  async pullModel(_model: string, _host?: string): Promise<void> {
    const config = await this.config;
    const formattedHost = normalizeHost(_host || config.host);

    Logger.info(`⏳ Pulling model: ${_model} from ${formattedHost}`);

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

      Logger.success(`✅ Model '${_model}' pulled successfully.`);
    } catch (error: unknown) {
      Logger.error(`❌ Failed to pull model '${_model}':`);
      if (typeof error === 'object' && error && 'message' in error) {
        Logger.error(`Error: ${(error as { message: string }).message}`);
      } else {
        Logger.error(`Error: ${String(error)}`);
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
}
