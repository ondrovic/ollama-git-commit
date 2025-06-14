import { ConfigFileInfo, ConfigSourceInfo, ConfigSources } from '../../types';

type ConfigType = 'local' | 'global' | 'default';

interface ConfigLabel {
  label: string;
  type: ConfigType;
}

const CONFIG_LABELS = {
  LOCAL: {
    label: 'Local',
    type: 'local' as const,
  },
  USER: {
    label: 'User',
    type: 'global' as const,
  },
  BUILT_IN: {
    label: 'Built-in Defaults',
    type: 'default' as const,
  },
  ENV: {
    label: 'ENV',
    type: 'default' as const,
  },
} as const;

const getConfigLabel = (path: string): ConfigLabel => {
  const normalizedPath = path.replace(/\\/g, '/');
  const currentDir = process.cwd().replace(/\\/g, '/');
  const homeDir = (process.env.HOME || process.env.USERPROFILE)?.replace(/\\/g, '/');

  if (normalizedPath.includes('.ollama-git-commit.json') || normalizedPath.includes(currentDir)) {
    return CONFIG_LABELS.LOCAL;
  }

  if (normalizedPath.includes('.config/ollama-git-commit')) {
    if (homeDir && normalizedPath.includes(homeDir)) {
      return CONFIG_LABELS.USER;
    }
  }

  return CONFIG_LABELS.BUILT_IN;
};

export const getConfigFileInfo = (path: string): ConfigFileInfo => {
  const { label, type } = getConfigLabel(path);
  return { path, label, type };
};

const getSourceLabel = (source: string | undefined): string => {
  if (!source) return CONFIG_LABELS.BUILT_IN.label;
  if (source === 'environment variable') return CONFIG_LABELS.ENV.label;
  if (source === 'project') return CONFIG_LABELS.LOCAL.label;
  if (source === 'user' || source === 'global') return CONFIG_LABELS.USER.label;
  if (source === 'default' || source === 'built-in') return CONFIG_LABELS.BUILT_IN.label;

  const normalizedSource = String(source).replace(/\\/g, '/');
  const currentDir = process.cwd().replace(/\\/g, '/');
  const homeDir = (process.env.HOME || process.env.USERPROFILE)?.replace(/\\/g, '/');

  if (
    normalizedSource.includes('.ollama-git-commit.json') ||
    normalizedSource.includes(currentDir)
  ) {
    return CONFIG_LABELS.LOCAL.label;
  }

  if (normalizedSource.includes('.config/ollama-git-commit')) {
    if (homeDir && normalizedSource.includes(homeDir)) {
      return CONFIG_LABELS.USER.label;
    }
  }

  return CONFIG_LABELS.BUILT_IN.label;
};

export const getConfigSourceInfo = (sources: ConfigSources): ConfigSourceInfo => {
  return {
    model: getSourceLabel(sources.model),
    host: getSourceLabel(sources.host),
    promptFile: getSourceLabel(sources.promptFile),
    promptTemplate: getSourceLabel(sources.promptTemplate),
    verbose: getSourceLabel(sources.verbose),
    interactive: getSourceLabel(sources.interactive),
    debug: getSourceLabel(sources.debug),
    autoStage: getSourceLabel(sources.autoStage),
    autoModel: getSourceLabel(sources.autoModel),
    useEmojis: getSourceLabel(sources.useEmojis),
    timeouts: {
      connection: getSourceLabel(sources.timeouts?.connection),
      generation: getSourceLabel(sources.timeouts?.generation),
      modelPull: getSourceLabel(sources.timeouts?.modelPull),
    },
  };
};
