import { Logger } from '../utils/logger';
import { Spinner } from '../utils/spinner';
import { ModelsCommand } from '../commands/models';
import type { OllamaResponse } from '../index';

export class OllamaService {
  private modelsCommand: ModelsCommand;

  constructor() {
    this.modelsCommand = new ModelsCommand();
  }

  async generateCommitMessage(
    model: string,
    host: string,
    prompt: string,
    verbose: boolean
  ): Promise<string> {
    if (verbose) {
      Logger.info(`Generating commit message with ${model}...`);
      Logger.info(`Ollama host: ${host}`);
      Logger.info(`Prompt length: ${prompt.length} characters`);
    }

    // Show spinner for non-verbose mode
    const spinner = new Spinner();
    if (!verbose) {
      spinner.start('🤖 Generating commit message');
    }

    try {
      const payload = {
        model,
        prompt,
        stream: false,
      };

      if (verbose) {
        Logger.debug(`JSON payload size: ${JSON.stringify(payload).length} bytes`);
      }

      const response = await fetch(`${host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(120000), // 2 minute timeout
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

      return responseText;
    } catch (error: any) {
      if (!verbose) {
        spinner.stop();
      }

      if (error.name === 'TimeoutError') {
        throw new Error('❌ Request timed out - Ollama may be busy or the model is too large');
      }

      throw new Error(`❌ Failed to connect to Ollama: ${error.message}`);
    }
  }

  // parseResponse(response: string, verbose: boolean, model: string, host: string): string {
  //   try {
  //     const data: OllamaResponse = JSON.parse(response);

  //     if (data.error) {
  //       const errorStr = data.error.toString();
  //       if (errorStr.toLowerCase().includes('not found')) {
  //         this.modelsCommand.handleModelError(model, host);
  //         throw new Error('Model not found');
  //       } else {
  //         throw new Error(`Ollama error: ${data.error}`);
  //       }
  //     }

  //     if (!data.response) {
  //       throw new Error('No response field in JSON');
  //     }

  //     const message = data.response.trim();
  //     if (!message) {
  //       throw new Error('Empty response from model');
  //     }

  //     return message;
  //   } catch (error: any) {
  //     if (error.message === 'Model not found') {
  //       throw error;
  //     }

  //     // Try to extract useful error information from malformed JSON
  //     if (response.includes('error') && response.includes('not found')) {
  //       this.modelsCommand.handleModelError(model, host);
  //       throw new Error('Model not found');
  //     }

  //     Logger.error(`Failed to parse response: ${error.message}`);
  //     if (verbose) {
  //       Logger.error(`Raw response (first 500 chars): ${response.substring(0, 500)}`);
  //     } else {
  //       Logger.info('Use --verbose flag for full response details');
  //     }
  //     throw new Error('Failed to parse Ollama response');
  //   }
  // }

  parseResponse(response: string, verbose: boolean, model: string, host: string): string {
    try {
      const data: OllamaResponse = JSON.parse(response);

      if (data.error) {
        const errorStr = data.error.toString();
        if (errorStr.toLowerCase().includes('not found')) {
          this.modelsCommand.handleModelError(model, host);
          throw new Error('Model not found');
        } else {
          throw new Error(`Ollama error: ${data.error}`);
        }
      }

      if (!data.response) {
        throw new Error('No response field in JSON');
      }

      let message = data.response.trim();

      // Remove emojis using regex
      message = this.removeEmojis(message);

      if (!message) {
        throw new Error('Empty response from model');
      }

      return message;
    } catch (error: any) {
      if (error.message === 'Model not found') {
        throw error;
      }

      // Try to extract useful error information from malformed JSON
      if (response.includes('error') && response.includes('not found')) {
        this.modelsCommand.handleModelError(model, host);
        throw new Error('Model not found');
      }

      Logger.error(`Failed to parse response: ${error.message}`);
      if (verbose) {
        Logger.error(`Raw response (first 500 chars): ${response.substring(0, 500)}`);
      } else {
        Logger.info('Use --verbose flag for full response details');
      }
      throw new Error('Failed to parse Ollama response');
    }
  }

  private removeEmojis(text: string): string {
    // Remove emojis but preserve line breaks and formatting
    return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F251}]/gu, '')
      .replace(/^\s+|\s+$/gm, '') // Trim whitespace from each line
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
  }

  async testConnection(host: string): Promise<boolean> {
    try {
      const response = await fetch(`${host}/api/tags`, {
        signal: AbortSignal.timeout(10000),
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async isModelAvailable(host: string, model: string): Promise<boolean> {
    try {
      const response = await fetch(`${host}/api/tags`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (!data.models || !Array.isArray(data.models)) {
        return false;
      }

      return data.models.some((m: any) => m.name === model);
    } catch {
      return false;
    }
  }

  async pullModel(host: string, model: string): Promise<boolean> {
    try {
      Logger.info(`Pulling model ${model}...`);

      const response = await fetch(`${host}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model }),
        signal: AbortSignal.timeout(300000), // 5 minute timeout for pulling
      });

      return response.ok;
    } catch (error: any) {
      Logger.error(`Failed to pull model: ${error.message}`);
      return false;
    }
  }

  formatModelSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}