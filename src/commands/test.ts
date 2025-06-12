import { OllamaService } from '../core/ollama';
import { Logger } from '../utils/logger';

export class TestCommand {
  private ollamaService: OllamaService;
  constructor() {
    this.ollamaService = new OllamaService();
  }

  async testConnection(host?: string, verbose: boolean = false): Promise<boolean> {
    const ollamaHost = host || process.env.OLLAMA_HOST || 'http://192.168.0.3:11434';
    if (verbose) {
      Logger.info(`Testing Ollama connection to ${ollamaHost}`);
    }

    try {
      const response = await fetch(`${ollamaHost}/api/tags`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (verbose) {
        Logger.success('Ollama connection successful');
        if (data.models && Array.isArray(data.models)) {
          console.log('Available models:');
          data.models.forEach((model: any) => {
            const size = model.size ? `(${(model.size / (1024 * 1024 * 1024)).toFixed(1)} GB)` : '';
            console.log(`  - ${model.name} ${size}`);
          });
        }
      } else {
        Logger.success('OK')
      }
      return true;
    } catch (error: any) {
      Logger.error(`Cannot connect to Ollama at ${ollamaHost}`);
      Logger.error('Make sure Ollama is running and accessible');
      if (verbose) {
        Logger.error(`Error: ${error.message}`);
      }
      return false;
    }
  }

  async testSimplePrompt(host?: string, model: string = 'mistral:7b-instruct', verbose: boolean = false): Promise<boolean> {
    const ollamaHost = host || process.env.OLLAMA_HOST || 'http://192.168.0.3:11434';

    if (verbose) Logger.info(`Testing with simple prompt for ${ollamaHost}`);

    const payload = {
      model,
      prompt: 'Hello, please respond with: Test successful',
      stream: false,
    };

    if (verbose) Logger.debug('Test payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${ollamaHost}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });

      const responseText = await response.text();

      if (verbose) Logger.info(`Raw response length: ${responseText.length}`);
      if (verbose) Logger.debug(`First 500 chars: ${responseText.substring(0, 500)}`);

      // Test JSON validity
      try {
        const data = JSON.parse(responseText);
        Logger.success('Valid JSON');
        if (verbose) Logger.info('Response field exists:', 'response' in data);

        if (verbose && data.response) {
          Logger.info('Response content:', data.response.substring(0, 100));
        }
        return true;
      } catch {
        Logger.error('JSON parsing failed');
        return false;
      }
    } catch (error: any) {
      Logger.error('Request failed:', error.message);
      return false;
    }
  }
}