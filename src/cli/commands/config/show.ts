import { Command } from 'commander';
import { ConfigManager } from '../../../core/config';
import { Logger } from '../../../utils/logger';
import { getFriendlySource } from '../../utils/get-friendly-source';

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

        console.log('Current Configuration:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Show active config files
        console.log('Config Files (in order of precedence):');

        // Filter active files based on their type and existence, and sort by precedence
        const sortedActiveFiles: { path: string; label: string }[] = [];

        if (files.active.includes(files.local)) {
          sortedActiveFiles.push({ path: files.local, label: 'Local' });
        }
        if (files.active.includes(files.global)) {
          sortedActiveFiles.push({ path: files.global, label: 'Global User' });
        }
        if (files.active.includes(files.default)) {
          sortedActiveFiles.push({ path: files.default, label: 'Default User' });
        }

        sortedActiveFiles.forEach((fileInfo, index) => {
          const prefix = index === 0 ? '   → ' : '     ';
          console.log(`${prefix}${fileInfo.label} - ${fileInfo.path}`);
        });
        console.log('');

        // Core Settings
        console.log('Core Settings:');
        console.log(`   Model: ${config.model} (from ${getFriendlySource(configSources.model)})`);
        console.log(`   Host: ${config.host} (from ${getFriendlySource(configSources.host)})`);
        console.log(`   Prompt File: ${config.promptFile} (from ${getFriendlySource(configSources.promptFile)})`);
        console.log(`   Prompt Template: ${config.promptTemplate} (from ${getFriendlySource(configSources.promptTemplate)})`);
        console.log('');

        // Behavior Settings
        console.log('Behavior Settings:');
        console.log(`   Verbose: ${config.verbose} (from ${getFriendlySource(configSources.verbose)})`);
        console.log(`   Interactive: ${config.interactive} (from ${getFriendlySource(configSources.interactive)})`);
        console.log(`   Debug: ${config.debug} (from ${getFriendlySource(configSources.debug)})`);
        console.log(`   Auto Stage: ${config.autoStage} (from ${getFriendlySource(configSources.autoStage)})`);
        console.log(`   Auto Model: ${config.autoModel} (from ${getFriendlySource(configSources.autoModel)})`);
        console.log(`   Use Emojis: ${config.useEmojis} (from ${getFriendlySource(configSources.useEmojis)})`);
        console.log('');

        // Timeouts
        console.log('Timeouts (ms):');
        console.log(`   Connection: ${config.timeouts.connection}ms (from ${getFriendlySource(configSources.timeouts.connection)})`);
        console.log(`   Generation: ${config.timeouts.generation}ms (from ${getFriendlySource(configSources.timeouts.generation)})`);
        console.log(`   Model Pull: ${config.timeouts.modelPull}ms (from ${getFriendlySource(configSources.timeouts.modelPull)})`);
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
