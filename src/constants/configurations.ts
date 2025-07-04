import * as os from 'os';
import path from 'path';
import { ConfigSourceInfo, ContextProvider, ModelConfig } from '../types';
import { MODELS } from './models';

export const CONFIGURATIONS = {
  EMPTY: {
    model: undefined,
    host: undefined,
    verbose: undefined,
    interactive: undefined,
    debug: undefined,
    autoStage: undefined,
    autoModel: undefined,
    autoCommit: undefined,
    quiet: undefined,
    promptFile: undefined,
    promptTemplate: undefined,
    useEmojis: undefined,
    timeouts: {
      connection: undefined,
      generation: undefined,
      modelPull: undefined,
    },
    models: undefined,
    embeddingsProvider: undefined,
    context: undefined,
  },
  DEFAULT: {
    model: MODELS.DEFAULT,
    host: 'http://localhost:11434',
    verbose: false,
    interactive: true,
    debug: false,
    autoStage: false,
    autoModel: false,
    autoCommit: false,
    quiet: false,
    promptFile: path.join(os.homedir(), '.config', 'ollama-git-commit', 'prompt.txt'),
    configFile: path.join(os.homedir(), '.config', 'ollama-git-commit', 'config.json'),
    timeouts: {
      connection: 10000,
      generation: 120000,
      modelPull: 300000,
    },
    useEmojis: false,
    promptTemplate: 'default',
    // New multi-model defaults
    models: [
      {
        name: MODELS.DEFAULT,
        provider: 'ollama',
        model: MODELS.DEFAULT,
        roles: ['chat', 'edit', 'autocomplete', 'apply', 'summarize'],
      } as ModelConfig,
      {
        name: 'embeddingsProvider',
        provider: 'ollama',
        model: MODELS.EMBEDDINGS,
        roles: ['embed'],
      } as ModelConfig,
    ],
    embeddingsProvider: 'embeddingsProvider',
    context: [...MODELS.CONTEXTS] as ContextProvider[],
  },
  MESSAGES: {
    CORE_SETTINGS: (
      model: string,
      host: string,
      promptFile: string,
      promptTemplate: string,
      sourceInfo: ConfigSourceInfo,
    ) => `Core Settings:
        Model: ${model} (from ${sourceInfo.model})
        Host: ${host} (from ${sourceInfo.host})
        Prompt File: ${promptFile} (from ${sourceInfo.promptFile})
        Prompt Template: ${promptTemplate} (from ${sourceInfo.promptTemplate})
        `,
    BEHAVIOR_SETTINGS: (
      verbose: boolean,
      interactive: boolean,
      debug: boolean,
      autoStage: boolean,
      autoModel: boolean,
      autoCommit: boolean,
      useEmojis: boolean,
      quiet: boolean,
      sourceInfo: ConfigSourceInfo,
    ) => `Behavior Settings:
        Verbose: ${verbose} (from ${sourceInfo.verbose})
        Interactive: ${interactive} (from ${sourceInfo.interactive})
        Debug: ${debug} (from ${sourceInfo.debug})
        Auto Stage: ${autoStage} (from ${sourceInfo.autoStage})
        Auto Model: ${autoModel} (from ${sourceInfo.autoModel})
        Auto Commit: ${autoCommit} (from ${sourceInfo.autoCommit})
        Use Emojis: ${useEmojis} (from ${sourceInfo.useEmojis})
        Quiet: ${quiet} (from ${sourceInfo.quiet})
        `,
    TIMEOUTS: (
      connection: number,
      generation: number,
      modelPull: number,
      sourceInfo: ConfigSourceInfo,
    ) => `Timeouts (ms):
        Connection: ${connection}ms (from ${sourceInfo.timeouts.connection})
        Generation: ${generation}ms (from ${sourceInfo.timeouts.generation})
        Model Pull: ${modelPull}ms (from ${sourceInfo.timeouts.modelPull})
        `,
    MODELS: (models: ModelConfig[], embeddingsProvider: string) => `Models:
        ${models.map(m => `  ${m.name} - Roles: ${m.roles.join(', ')}`).join('\n        ')}
        Embeddings Provider: ${embeddingsProvider}
        `,
    CONTEXT: (context: ContextProvider[]) => `Context Providers:
        ${context.map(c => `  ${c.provider}: ${c.enabled ? 'enabled' : 'disabled'}`).join('\n        ')}
        `,
  },
  /**
   * Mock configuration used for testing with MockedConfigManager.
   * This configuration is used in tests to simulate configuration loading and environment variable overrides
   * without touching real files. It should not be used in production.
   */
  MOCK: {
    model: 'mock-model',
    host: 'mock-host',
    verbose: false,
    interactive: true,
    debug: false,
    autoStage: false,
    autoModel: false,
    autoCommit: false,
    quiet: false,
    promptFile: '/mock/mock-prompt-file.txt',
    configFile: '/mock/mock-config-file.json',
    timeouts: {
      connection: 10000,
      generation: 120000,
      modelPull: 300000,
    },
    useEmojis: true,
    promptTemplate: 'default',
    models: [
      {
        name: 'mock-chat-model',
        provider: 'ollama',
        model: 'mock-chat',
        roles: ['chat', 'edit'],
      } as ModelConfig,
      {
        name: 'mock-embeddings',
        provider: 'ollama',
        model: 'mock-embed',
        roles: ['embed'],
      } as ModelConfig,
    ],
    embeddingsProvider: 'mock-embeddings',
    context: MODELS.CONTEXTS.filter(c =>
      ['code', 'diff'].includes(c.provider),
    ) as ContextProvider[],
  },
} as const;
