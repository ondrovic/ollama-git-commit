import { Command } from 'commander';
import { ConfigManager } from '../../../core/config';
import { Logger } from '../../../utils/logger';
import { getConfigSourceInfo, getConfigFileInfo } from '../../utils/get-friendly-source';

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
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
        console.log('');

        // Core Settings
        console.log('Core Settings:');
        console.log(`   Model: ${config.model} (from ${sourceInfo.model})`);
        console.log(`   Host: ${config.host} (from ${sourceInfo.host})`);
        console.log(`   Prompt File: ${config.promptFile} (from ${sourceInfo.promptFile})`);
        console.log(`   Prompt Template: ${config.promptTemplate} (from ${sourceInfo.promptTemplate})`);
        console.log('');

        // Behavior Settings
        console.log('Behavior Settings:');
        console.log(`   Verbose: ${config.verbose} (from ${sourceInfo.verbose})`);
        console.log(`   Interactive: ${config.interactive} (from ${sourceInfo.interactive})`);
        console.log(`   Debug: ${config.debug} (from ${sourceInfo.debug})`);
        console.log(`   Auto Stage: ${config.autoStage} (from ${sourceInfo.autoStage})`);
        console.log(`   Auto Model: ${config.autoModel} (from ${sourceInfo.autoModel})`);
        console.log(`   Use Emojis: ${config.useEmojis} (from ${sourceInfo.useEmojis})`);
        console.log('');

        // Timeouts
        console.log('Timeouts (ms):');
        console.log(`   Connection: ${config.timeouts.connection}ms (from ${sourceInfo.timeouts.connection})`);
        console.log(`   Generation: ${config.timeouts.generation}ms (from ${sourceInfo.timeouts.generation})`);
        console.log(`   Model Pull: ${config.timeouts.modelPull}ms (from ${sourceInfo.timeouts.modelPull})`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
