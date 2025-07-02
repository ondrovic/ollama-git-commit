import { Command } from 'commander';
import { ConfigManager } from '../../../core/config';
import { Logger } from '../../../utils/logger';

export const registerSetCommands = (configCommand: Command) => {
  configCommand
    .command('set <key> <value>')
    .description('Set a configuration value')
    .option('-t, --type <type>', 'Config type (user|local)', 'user')
    .option('--all', 'Update all active configs (user and local if both exist)')
    .action(
      async (key: string, value: string, options: { type: 'user' | 'local'; all?: boolean }) => {
        try {
          const configManager = ConfigManager.getInstance();
          await configManager.initialize();

          // Parse the value based on the key
          const parsedValue = parseValue(key, value);

          // Get current config files to determine which ones to update
          const configFiles = await configManager.getConfigFiles();
          const activeConfigs = configFiles.active;

          if (options.all && activeConfigs.length > 1) {
            // Update all active configs
            console.log(`🔧 Updating ${activeConfigs.length} active configuration files...`);

            for (const configFile of activeConfigs) {
              try {
                const configToUpdate = createConfigUpdate(key, parsedValue);
                await configManager.saveConfig(configToUpdate, configFile.type);
                console.log(`✅ Updated ${configFile.type} config (${configFile.path})`);
              } catch (error) {
                Logger.error(`Failed to update ${configFile.type} config:`, error);
              }
            }
          } else {
            // Update single config
            const configToUpdate = createConfigUpdate(key, parsedValue);
            await configManager.saveConfig(configToUpdate, options.type);
          }

          // Show the updated configuration
          console.log('\n📋 Updated configuration:');
          const updatedConfig = await configManager.getConfig();
          const sourceInfo = await configManager.getConfigSources();

          // Display the specific key that was updated
          displayUpdatedKey(key, updatedConfig, sourceInfo);
        } catch (error) {
          Logger.error('Failed to set configuration:', error);
          process.exit(1);
        }
      },
    );
};

export function parseValue(key: string, value: string): unknown {
  // Handle boolean values
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;

  // Handle numeric values
  if (!isNaN(Number(value)) && value.trim() !== '') {
    return Number(value);
  }

  // Handle arrays (comma-separated values)
  if (value.includes(',') && !value.includes('"') && !value.includes("'")) {
    return value
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);
  }

  // Default to string
  return value;
}

export function createConfigUpdate(key: string, value: unknown): Record<string, unknown> {
  const keyParts = key.split('.');

  if (keyParts.length === 1) {
    // Simple key
    return { [key]: value };
  } else {
    // Nested key
    const result: Record<string, unknown> = {};
    let current = result;

    for (let i = 0; i < keyParts.length - 1; i++) {
      current[keyParts[i]] = {};
      current = current[keyParts[i]] as Record<string, unknown>;
    }

    current[keyParts[keyParts.length - 1]] = value;
    return result;
  }
}

export function displayUpdatedKey(
  key: string,
  config: Record<string, unknown>,
  sourceInfo: Record<string, unknown>,
): void {
  const keyParts = key.split('.');
  let currentValue: unknown = config;
  let currentSource: unknown = sourceInfo;

  // Navigate to the nested value
  for (const part of keyParts) {
    if (currentValue && typeof currentValue === 'object' && part in currentValue) {
      currentValue = (currentValue as Record<string, unknown>)[part];
    } else {
      currentValue = undefined;
    }

    if (currentSource && typeof currentSource === 'object' && part in currentSource) {
      currentSource = (currentSource as Record<string, unknown>)[part];
    } else {
      currentSource = undefined;
    }
  }

  const source = typeof currentSource === 'string' ? currentSource : 'unknown';
  console.log(`  ${key}: ${JSON.stringify(currentValue)} (from ${source})`);
}
