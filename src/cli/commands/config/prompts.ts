import { Command } from 'commander';
import { VALID_TEMPLATES } from '../../../constants/prompts';
import { ServiceFactory } from '../../../core/factory';

export const registerPromptsCommands = (configCommand: Command) => {
  configCommand
    .command('list-prompt-templates')
    .description('List available prompt templates')
    .option('-n, --name <template>', 'Show contents of specific template')
    .option('-v, --verbose', 'Show detailed output')
    .action(async options => {
      // Create services using the factory
      const factory = ServiceFactory.getInstance();
      const logger = factory.createLogger({
        verbose: options.verbose,
      });

      try {
        const promptService = factory.createPromptService({
          verbose: options.verbose,
        });

        const templates = promptService.getPromptTemplates();

        if (options.name) {
          // Show specific template contents
          const templateName = options.name.toLowerCase();

          if (!VALID_TEMPLATES.includes(templateName as any)) {
            logger.error(`Template '${templateName}' not found.`);
            logger.info(`Available templates: ${VALID_TEMPLATES.join(', ')}`);
            process.exit(1);
          }

          const templateContent = templates[templateName];

          console.log(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          );
          console.log(`📝 Prompt Template: ${templateName}`);
          console.log(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          );
          console.log(templateContent);
          console.log(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          );
        } else {
          // List all available templates
          console.log(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          );
          console.log('📝 Available Prompt Templates');
          console.log(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          );

          Object.keys(templates).forEach(templateName => {
            console.log(`• ${templateName}`);
          });

          console.log('');
          console.log('To view a specific template, use:');
          console.log('  ollama-git-commit config list-prompt-templates --name <template>');
          console.log('');
          console.log('Example:');
          console.log('  ollama-git-commit config list-prompt-templates --name conventional');
          console.log(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          );
        }
      } catch (error) {
        logger.error('Failed to list prompt templates:', error);
        process.exit(1);
      }
    });
};
