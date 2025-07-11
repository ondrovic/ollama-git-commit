import { Command } from 'commander';
import { CONFIGURATIONS } from '../../../constants/configurations';
import { ConfigManager } from '../../../core/config';
import { Logger } from '../../../utils/logger';

interface ConfigKeyInfo {
  key: string;
  description: string;
  type: string;
  default: unknown;
  example?: string;
}

export interface KeysCommandsDeps {
  logger: Logger;
  serviceFactory: import('../../../core/factory').ServiceFactory;
  getConfig: () => Promise<Readonly<import('../../../types').OllamaCommitConfig>>;
}

export const registerKeysCommands = (configCommand: Command, deps: KeysCommandsDeps) => {
  configCommand
    .command('keys')
    .description('List all available configuration keys')
    .option('-v, --verbose', 'Show detailed information including types and examples')
    .action(async (options: { verbose?: boolean }) => {
      try {
        const manager = ConfigManager.getInstance(deps.logger);
        await manager.initialize();
        const configKeys = await manager.getConfigKeys();

        deps.logger.table([
          {
            header: 'Available Configuration Keys',
            separator:
              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          },
        ]);

        if (options.verbose) {
          // Detailed view with types and examples
          for (const keyInfo of configKeys) {
            await deps.logger.group(keyInfo.key, () => {
              deps.logger.plain(`Description: ${keyInfo.description}`);
              deps.logger.plain(`Type: ${keyInfo.type}`);
              deps.logger.plain(`Default: ${JSON.stringify(keyInfo.default)}`);
              if (keyInfo.example) {
                deps.logger.plain(`Example: ${keyInfo.example}`);
              }
            });
          }
        } else {
          // Simple view with just keys and descriptions
          configKeys.forEach(
            (keyInfo: {
              key: string;
              description: string;
              type: string;
              default: unknown;
              example?: string;
            }) => {
              deps.logger.plain(`${keyInfo.key.padEnd(25)} - ${keyInfo.description}`);
            },
          );
        }

        deps.logger.plain('');
        deps.logger.plain('Usage: ollama-git-commit config set <key> <value>');
        deps.logger.plain('Example: ollama-git-commit config set model llama3');
        deps.logger.plain('Example: ollama-git-commit config set timeouts.connection 5000');
      } catch (error) {
        deps.logger.error('Failed to list configuration keys:', error);
        process.exit(1);
      }
    });
};

export function getConfigKeys(): ConfigKeyInfo[] {
  const defaultConfig = CONFIGURATIONS.DEFAULT;

  return [
    {
      key: 'model',
      description: 'Primary model for commit message generation',
      type: 'string',
      default: defaultConfig.model,
      example: 'llama3',
    },
    {
      key: 'host',
      description: 'Ollama server host URL',
      type: 'string',
      default: defaultConfig.host,
      example: 'http://localhost:11434',
    },
    {
      key: 'verbose',
      description: 'Enable verbose output',
      type: 'boolean',
      default: defaultConfig.verbose,
      example: 'true',
    },
    {
      key: 'interactive',
      description: 'Enable interactive mode',
      type: 'boolean',
      default: defaultConfig.interactive,
      example: 'true',
    },
    {
      key: 'debug',
      description: 'Enable debug mode',
      type: 'boolean',
      default: defaultConfig.debug,
      example: 'false',
    },
    {
      key: 'autoStage',
      description: 'Automatically stage files before commit',
      type: 'boolean',
      default: defaultConfig.autoStage,
      example: 'false',
    },
    {
      key: 'autoModel',
      description: 'Automatically select model',
      type: 'boolean',
      default: defaultConfig.autoModel,
      example: 'false',
    },
    {
      key: 'autoCommit',
      description: 'Automatically commit after generating message',
      type: 'boolean',
      default: defaultConfig.autoCommit,
      example: 'false',
    },
    {
      key: 'quiet',
      description: 'Suppress git command output',
      type: 'boolean',
      default: defaultConfig.quiet,
      example: 'true',
    },
    {
      key: 'promptFile',
      description: 'Path to custom prompt file',
      type: 'string',
      default: defaultConfig.promptFile,
      example: '/path/to/prompt.txt',
    },
    {
      key: 'promptTemplate',
      description: 'Prompt template to use',
      type: 'string',
      default: defaultConfig.promptTemplate,
      example: 'conventional',
    },
    {
      key: 'useEmojis',
      description: 'Use emojis in commit messages',
      type: 'boolean',
      default: defaultConfig.useEmojis,
      example: 'false',
    },
    {
      key: 'timeouts.connection',
      description: 'Connection timeout in milliseconds',
      type: 'number',
      default: defaultConfig.timeouts.connection,
      example: '10000',
    },
    {
      key: 'timeouts.generation',
      description: 'Generation timeout in milliseconds',
      type: 'number',
      default: defaultConfig.timeouts.generation,
      example: '120000',
    },
    {
      key: 'timeouts.modelPull',
      description: 'Model pull timeout in milliseconds',
      type: 'number',
      default: defaultConfig.timeouts.modelPull,
      example: '300000',
    },
    {
      key: 'embeddingsModel',
      description: 'Model for embeddings generation',
      type: 'string',
      default: defaultConfig.models?.[1]?.model || 'nomic-embed-text',
      example: 'nomic-embed-text',
    },
    {
      key: 'embeddingsProvider',
      description: 'Provider for embeddings',
      type: 'string',
      default: defaultConfig.embeddingsProvider,
      example: 'embeddingsProvider',
    },
    {
      key: 'context',
      description: 'Context providers (comma-separated)',
      type: 'array',
      default: defaultConfig.context?.map(c => c.provider) || [],
      example: 'code,diff,terminal',
    },
  ];
}
