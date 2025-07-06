import { Command } from 'commander';
import { ConfigManager } from '../../../core/config';
import { ModelConfig, ModelRole } from '../../../types';
import { formatFileSize } from '../../../utils/formatFileSize';
import { Logger } from '../../../utils/logger';
import { normalizeHost } from '../../../utils/url';

interface OllamaModelResponse {
  name: string;
  size?: number;
  details?: {
    family?: string;
  };
}

export const registerModelsCommands = (configCommand: Command) => {
  const modelsCommand = configCommand.command('models').description('Manage model configurations');

  modelsCommand
    .command('add')
    .description('Add a new model configuration')
    .argument('<name>', 'Model name')
    .argument('<provider>', 'Provider (ollama, openai, anthropic)')
    .argument('<model>', 'Model identifier')
    .option(
      '-r, --roles <roles>',
      'Comma-separated roles (chat,edit,autocomplete,apply,summarize,embed)',
      'chat',
    )
    .option('-t, --type <type>', 'Configuration type (user, local)', 'user')
    .action(async (name, provider, model, options) => {
      try {
        const configManager = ConfigManager.getInstance();
        await configManager.initialize();

        const roles = options.roles.split(',').map((r: string) => r.trim()) as ModelRole[];

        const newModel: ModelConfig = {
          name,
          provider: provider as 'ollama' | 'openai' | 'anthropic',
          model,
          roles,
        };

        const config = await configManager.getConfig();
        const models = config.models || [];
        models.push(newModel);

        await configManager.saveConfig({ models }, options.type as 'user' | 'local');

        Logger.success(`Model '${name}' added successfully`);
        Logger.info(`  Provider: ${provider}`);
        Logger.info(`  Model: ${model}`);
        Logger.info(`  Roles: ${roles.join(', ')}`);
      } catch (error) {
        Logger.error('Failed to add model:', error);
        process.exit(1);
      }
    });

  modelsCommand
    .command('remove')
    .description('Remove a model configuration')
    .argument('<name>', 'Model name')
    .option('-t, --type <type>', 'Configuration type (user, local)', 'user')
    .action(async (name, _options) => {
      try {
        const configManager = ConfigManager.getInstance();
        await configManager.initialize();

        const config = await configManager.getConfig();
        const models = config.models || [];
        const filteredModels = models.filter(m => m.name !== name);

        if (filteredModels.length === models.length) {
          Logger.error(`Model '${name}' not found`);
          process.exit(1);
        }

        await configManager.saveConfig(
          { models: filteredModels },
          _options.type as 'user' | 'local',
        );
        Logger.success(`Model '${name}' removed successfully`);
      } catch (error) {
        Logger.error('Failed to remove model:', error);
        process.exit(1);
      }
    });

  modelsCommand
    .command('list')
    .description('List all available models from Ollama server')
    .option('-t, --type <type>', 'Configuration type (user, local)', 'user')
    .action(async _options => {
      try {
        const configManager = ConfigManager.getInstance();
        await configManager.initialize();
        const config = await configManager.getConfig();

        // Get available models from Ollama server
        const ollamaHost = normalizeHost(config.host);
        const response = await fetch(`${ollamaHost}/api/tags`, {
          signal: AbortSignal.timeout(config.timeouts.connection),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.models || !Array.isArray(data.models)) {
          throw new Error('Invalid response from Ollama server');
        }

        // Banner
        Logger.plain(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );
        Logger.plain('Available models:');
        Logger.plain(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );

        // List models with size, family, and current indicator
        data.models.forEach((model: OllamaModelResponse) => {
          const size = model.size ? formatFileSize(model.size) : 'n/a';
          const family = model.details?.family ? ` [${model.details.family}]` : '';
          const currentIndicator = model.name === config.model ? ' ⭐ (current)' : '';
          Logger.package(`  ${model.name} (${size})${family}${currentIndicator}`);
        });

        // Bottom banner and total
        Logger.plain(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );
        Logger.tableInfo(`Total: ${data.models.length} models available`);
      } catch (error) {
        Logger.error('Failed to list models:', error);
        process.exit(1);
      }
    });

  modelsCommand
    .command('set-primary')
    .description('Set the primary model for commit generation')
    .argument('<name>', 'Model name (must have chat role)')
    .option('-t, --type <type>', 'Configuration type (user, local)', 'user')
    .action(async (name, options) => {
      try {
        const configManager = ConfigManager.getInstance();
        await configManager.initialize();

        const config = await configManager.getConfig();
        const models = config.models || [];
        const targetModel = models.find(m => m.name === name);

        if (!targetModel) {
          Logger.error(`Model '${name}' not found`);
          process.exit(1);
        }

        if (!targetModel.roles.includes('chat')) {
          Logger.error(`Model '${name}' does not have chat role`);
          process.exit(1);
        }

        await configManager.saveConfig(
          { model: targetModel.model },
          options.type as 'user' | 'local',
        );
        Logger.success(`Primary model set to '${name}' (${targetModel.model})`);
      } catch (error) {
        Logger.error('Failed to set primary model:', error);
        process.exit(1);
      }
    });

  modelsCommand
    .command('set-embeddings')
    .description('Set the embeddings provider model')
    .argument('<name>', 'Model name (must have embed role)')
    .option('-t, --type <type>', 'Configuration type (user, local)', 'user')
    .action(async (name, options) => {
      try {
        const configManager = ConfigManager.getInstance();
        await configManager.initialize();

        const config = await configManager.getConfig();
        const models = config.models || [];
        const targetModel = models.find(m => m.name === name);

        if (!targetModel) {
          Logger.error(`Model '${name}' not found`);
          process.exit(1);
        }

        if (!targetModel.roles.includes('embed')) {
          Logger.error(`Model '${name}' does not have embed role`);
          process.exit(1);
        }

        await configManager.saveConfig(
          { embeddingsProvider: name },
          options.type as 'user' | 'local',
        );
        Logger.success(`Embeddings provider set to '${name}'`);
      } catch (error) {
        Logger.error('Failed to set embeddings provider:', error);
        process.exit(1);
      }
    });
};
