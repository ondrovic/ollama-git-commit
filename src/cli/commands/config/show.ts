import { Command } from 'commander';
import { CONFIGURATIONS } from '../../../constants/configurations';
import { ConfigManager } from '../../../core/config';
import { ConfigSourceInfo, ModelConfig } from '../../../types';
import { Logger } from '../../../utils/logger';

export const registerShowCommands = (configCommand: Command) => {
  configCommand
    .command('show')
    .description('Show current configuration')
    .action(async () => {
      try {
        const configManager = ConfigManager.getInstance();
        await configManager.initialize();
        const config = await configManager.getConfig();
        const sourceInfo = await configManager.getConfigSources();
        const primaryModel = await configManager.getPrimaryModel();

        // If multi-model config exists, try to find the primary model in the models array
        let effectiveModelDetails: ModelConfig | undefined = undefined;
        if (config.models && config.models.length > 0) {
          effectiveModelDetails = config.models.find(
            m => m.model === primaryModel || m.name === primaryModel,
          );
        }

        // Convert ConfigSources to ConfigSourceInfo
        const sourceInfoObj: ConfigSourceInfo = {
          model: sourceInfo.model || 'built-in',
          host: sourceInfo.host || 'built-in',
          promptFile: sourceInfo.promptFile || 'built-in',
          promptTemplate: sourceInfo.promptTemplate || 'built-in',
          verbose: sourceInfo.verbose || 'built-in',
          interactive: sourceInfo.interactive || 'built-in',
          debug: sourceInfo.debug || 'built-in',
          autoStage: sourceInfo.autoStage || 'built-in',
          autoModel: sourceInfo.autoModel || 'built-in',
          autoCommit: sourceInfo.autoCommit || 'built-in',
          useEmojis: sourceInfo.useEmojis || 'built-in',
          models: sourceInfo.models || 'built-in',
          embeddingsProvider: sourceInfo.embeddingsProvider || 'built-in',
          embeddingsModel: sourceInfo.embeddingsModel || 'built-in',
          context: sourceInfo.context || 'built-in',
          timeouts: {
            connection: sourceInfo.timeouts?.connection || 'built-in',
            generation: sourceInfo.timeouts?.generation || 'built-in',
            modelPull: sourceInfo.timeouts?.modelPull || 'built-in',
          },
        };

        console.log(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );
        console.log('🔧 Configuration');
        console.log(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );

        // Show config file locations
        const configFiles = await configManager.getConfigFiles();
        if (configFiles.active.length > 0) {
          console.log('Config Files:');
          configFiles.active.forEach(file => {
            console.log(`  ${file.type}: ${file.path}`);
          });
          console.log('');
        }

        // Core Settings
        let modelDisplay = primaryModel;
        if (effectiveModelDetails) {
          modelDisplay = effectiveModelDetails.model;
        }
        console.log(
          CONFIGURATIONS.MESSAGES.CORE_SETTINGS(
            modelDisplay,
            config.host,
            config.promptFile,
            config.promptTemplate,
            sourceInfoObj,
          ),
        );

        // Behavior Settings
        console.log(
          CONFIGURATIONS.MESSAGES.BEHAVIOR_SETTINGS(
            config.verbose,
            config.interactive,
            config.debug,
            config.autoStage,
            config.autoModel,
            config.autoCommit,
            config.useEmojis,
            sourceInfoObj,
          ),
        );

        // Timeouts
        console.log(
          CONFIGURATIONS.MESSAGES.TIMEOUTS(
            config.timeouts.connection,
            config.timeouts.generation,
            config.timeouts.modelPull,
            sourceInfoObj,
          ),
        );

        // Models (if available)
        if (config.models && config.models.length > 0) {
          console.log(
            CONFIGURATIONS.MESSAGES.MODELS(config.models, config.embeddingsProvider || 'none'),
          );
        }

        // Context Providers (if available)
        if (config.context && config.context.length > 0) {
          console.log(CONFIGURATIONS.MESSAGES.CONTEXT(config.context));
        }

        // Embeddings Model (if available)
        if (config.embeddingsModel) {
          console.log(
            `Embeddings Model: ${config.embeddingsModel} (from ${sourceInfoObj.embeddingsModel || 'user'})`,
          );
        }
      } catch (error) {
        Logger.error('Failed to show configuration:', error);
        process.exit(1);
      }
    });

  configCommand
    .command('debug')
    .description('Show detailed configuration debug information')
    .action(async () => {
      try {
        const configManager = ConfigManager.getInstance();
        await configManager.initialize();
        const debugInfo = await configManager.getDebugInfo();
        console.log('Debug info retrieved');
        console.log(JSON.stringify(debugInfo, null, 2));
      } catch (error) {
        Logger.error('Failed to get debug information:', error);
        process.exit(1);
      }
    });
};
