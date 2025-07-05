import { Command } from 'commander';
import { ConfigManager } from '../../../core/config';
import { ModelConfig, ModelRole } from '../../../types';
import { Logger } from '../../../utils/logger';

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
    .action(async (name, options) => {
      try {
        const configManager = ConfigManager.getInstance();
        await configManager.initialize();

        const config = await configManager.getConfig();
        const models = config.models || [];
        const filteredModels = models.filter(m => m.name !== name);

        if (filteredModels.length === models.length) {
          Logger.error(`❌ Model '${name}' not found`);
          process.exit(1);
        }

        await configManager.saveConfig(
          { models: filteredModels },
          options.type as 'user' | 'local',
        );
        Logger.success(`Model '${name}' removed successfully`);
      } catch (error) {
        Logger.error('Failed to remove model:', error);
        process.exit(1);
      }
    });

  modelsCommand
    .command('list')
    .description('List all model configurations')
    .option('-t, --type <type>', 'Configuration type (user, local)', 'user')
    .action(async options => {
      try {
        const configManager = ConfigManager.getInstance();
        await configManager.initialize();

        const config = await configManager.getConfigByType(options.type as 'user' | 'local');
        const models = config.models || [];

        if (models.length === 0) {
          Logger.info(`No models configured in ${options.type} configuration`);
          return;
        }

        console.log(`📋 Configured Models (${options.type}):`);
        models.forEach(model => {
          console.log(`  ${model.name.padEnd(20)} - ${model.provider}/${model.model}`);
          console.log(`    Roles: ${model.roles.join(', ')}`);
        });
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
          Logger.error(`❌ Model '${name}' not found`);
          process.exit(1);
        }

        if (!targetModel.roles.includes('chat')) {
          Logger.error(`❌ Model '${name}' does not have chat role`);
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
          Logger.error(`❌ Model '${name}' not found`);
          process.exit(1);
        }

        if (!targetModel.roles.includes('embed')) {
          Logger.error(`❌ Model '${name}' does not have embed role`);
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
