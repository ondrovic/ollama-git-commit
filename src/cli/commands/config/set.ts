import { Command } from 'commander';
import { ConfigManager } from '../../../core/config';
import { Logger } from '../../../utils/logger';
import { getConfigKeys } from './keys';

export interface SetCommandsDeps {
  logger: Logger;
  serviceFactory: import('../../../core/factory').ServiceFactory;
  getConfig: () => Promise<Readonly<import('../../../types').OllamaCommitConfig>>;
}

export const registerSetCommands = (configCommand: Command, deps: SetCommandsDeps) => {
  configCommand
    .command('set <key> <value>')
    .description('Set a configuration value')
    .option('-t, --type <type>', 'Config type (user|local)', 'user')
    .option('-a, --all', 'Update all active configs (user and local if both exist)')
    .action(
      async (key: string, value: string, options: { type: 'user' | 'local'; all?: boolean }) => {
        try {
          const manager = ConfigManager.getInstance(deps.logger);
          await manager.initialize();

          // Validate the key before proceeding
          const validKeys = getConfigKeys().map(k => k.key);
          if (!validKeys.includes(key)) {
            const suggestions = findSimilarKeys(key, validKeys);
            deps.logger.error(`Invalid configuration key: "${key}"`);
            if (suggestions.length > 0) {
              deps.logger.question('Did you mean one of these?');
              suggestions.forEach(suggestion => deps.logger.plain(`   ${suggestion}`));
            }
            deps.logger.plain("Run 'ollama-git-commit config keys' to see all available keys.");
            process.exit(1);
          }

          // Parse the value based on the key
          const parsedValue = parseValue(key, value);

          // Get current config files to determine which ones to update
          const configFiles = await manager.getConfigFiles();
          const activeConfigs = configFiles.active;

          if (options.all && activeConfigs.length > 1) {
            // Update all active configs
            for (const configFile of activeConfigs) {
              const configToUpdate = createConfigUpdate(key, parsedValue);
              await manager.saveConfig(configToUpdate, configFile.type);
              deps.logger.success(
                `Updated ${configFile.type} config: ${key} = ${JSON.stringify(parsedValue)}`,
              );
            }
          } else {
            // Update single config
            const configToUpdate = createConfigUpdate(key, parsedValue);
            await manager.saveConfig(configToUpdate, options.type);
            deps.logger.success(
              `Updated ${options.type} config: ${key} = ${JSON.stringify(parsedValue)}`,
            );
          }

          // Show the updated configuration
          deps.logger.plain('');
          deps.logger.plain('Updated configuration:');
          const updatedConfig = await manager.getConfig();
          const sourceInfo = await manager.getConfigSources();

          // Display the specific key that was updated
          displayUpdatedKey(key, updatedConfig, sourceInfo as Record<string, unknown>, deps.logger);
        } catch (error) {
          deps.logger.error('Failed to set configuration:', error);
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
      const keyPart = keyParts[i];
      if (keyPart === undefined) {
        throw new Error(`Invalid key structure: undefined key part at index ${i}`);
      }
      // Create nested object for each key part, including empty strings
      current[keyPart] = {};
      const next = current[keyPart];
      if (typeof next === 'object' && next !== null) {
        current = next as Record<string, unknown>;
      } else {
        // This should never happen since we just created an empty object
        throw new Error(`Failed to create nested object for key part: ${keyPart}`);
      }
    }

    const lastKey = keyParts[keyParts.length - 1];
    if (lastKey === undefined) {
      throw new Error('Invalid key structure: undefined last key part');
    }
    // Set the value for the last key part, including empty strings
    current[lastKey] = value;
    return result;
  }
}

export function displayUpdatedKey(
  key: string,
  config: Record<string, unknown>,
  sourceInfo: Record<string, unknown>,
  logger: Logger,
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

  // Log the updated key and value, including the config source if available
  if (typeof currentSource === 'string') {
    logger.plain(`  ${key}: ${JSON.stringify(currentValue)} (from ${currentSource})`);
  } else {
    logger.plain(`  ${key}: ${JSON.stringify(currentValue)}`);
  }
}

/**
 * Find similar keys to suggest when an invalid key is provided
 */
export function findSimilarKeys(invalidKey: string, validKeys: string[]): string[] {
  const suggestions: string[] = [];

  // Check for exact substring matches
  for (const validKey of validKeys) {
    if (validKey.includes(invalidKey) || invalidKey.includes(validKey)) {
      suggestions.push(validKey);
    }
  }

  // Check for keys with similar length and common characters
  for (const validKey of validKeys) {
    if (Math.abs(validKey.length - invalidKey.length) <= 2) {
      const commonChars = [...invalidKey].filter(char => validKey.includes(char)).length;
      const similarity = commonChars / Math.max(invalidKey.length, validKey.length);
      if (similarity >= 0.6) {
        suggestions.push(validKey);
      }
    }
  }

  // Remove duplicates and limit to 5 suggestions
  return [...new Set(suggestions)].slice(0, 5);
}
