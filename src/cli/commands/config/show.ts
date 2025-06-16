import { Command } from 'commander';
import { ConfigManager } from '../../../core/config';
import { Logger } from '../../../utils/logger';
import { getConfigFileInfo, getConfigSourceInfo } from '../../utils/get-friendly-source';
import { CONFIGURATIONS } from '../../../constants/configurations';

export const registerShowCommands = (configCommand: Command) => {
  configCommand
    .command('show')
    .description('Show current configuration')
    .action(async () => {
      try {
        const configManager = ConfigManager.getInstance();
        await configManager.initialize();
        await configManager.reload();
        const config = await configManager.getConfig();
        const files = await configManager.getConfigFiles();
        const configSources = await configManager.getConfigSources();
        const sourceInfo = getConfigSourceInfo(configSources);

        console.log('Current Configuration:');
        console.log(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );

        // Show active config files
        console.log('Config Files (in order of precedence):');

        // Use the new active structure
        const sortedActiveFiles = files.active
          .map(fileObj => {
            // fileObj: { type, path, 'in-use' }
            return getConfigFileInfo(fileObj.path);
          })
          .sort((a, b) => {
            const precedence = { local: 0, global: 1, default: 2 };
            return precedence[a.type] - precedence[b.type];
          });

        sortedActiveFiles.forEach((fileInfo, index) => {
          const prefix = index === 0 ? '   → ' : '     ';
          console.log(`${prefix}${fileInfo.label} - ${fileInfo.path}`);
        });
        // Core Settings
        console.log(
          CONFIGURATIONS.MESSAGES.CORE_SETTINGS(
            config.model,
            config.host,
            config.promptFile,
            config.promptTemplate,
            sourceInfo,
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
            sourceInfo,
          ),
        );

        // Timeouts
        console.log(
          CONFIGURATIONS.MESSAGES.TIMEOUTS(
            config.timeouts.connection,
            config.timeouts.generation,
            config.timeouts.modelPull,
            sourceInfo,
          ),
        );
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
        console.log('Starting config-debug...');
        const configManager = ConfigManager.getInstance();
        console.log('ConfigManager instance created');
        await configManager.initialize();
        console.log('ConfigManager initialized');
        const debugInfo = await configManager.getDebugInfo();
        console.log('Debug info retrieved');
        console.log(JSON.stringify(debugInfo, null, 2));
      } catch (error) {
        Logger.error('Failed to get debug information:', error);
        process.exit(1);
      }
    });
};
