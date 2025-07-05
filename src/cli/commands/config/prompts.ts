import { Command } from 'commander';
import { ServiceFactory } from '../../../core/factory';
import { ILogger } from '../../../core/interfaces';

// Helper function to get template keys from the service
function getTemplateKeys(): string[] {
  const factory = ServiceFactory.getInstance();
  const promptService = factory.createPromptService({ verbose: false });
  const templates = promptService.getPromptTemplates();
  return Object.keys(templates);
}

// Helper function to find similar template names
function findSimilarTemplates(invalidTemplate: string, validTemplates: string[]): string[] {
  const suggestions: string[] = [];

  // Check for exact substring matches
  for (const validTemplate of validTemplates) {
    if (validTemplate.includes(invalidTemplate) || invalidTemplate.includes(validTemplate)) {
      suggestions.push(validTemplate);
    }
  }

  // Check for templates with similar length and common characters
  for (const validTemplate of validTemplates) {
    if (Math.abs(validTemplate.length - invalidTemplate.length) <= 2) {
      const commonChars = [...invalidTemplate].filter(char => validTemplate.includes(char)).length;
      const similarity = commonChars / Math.max(invalidTemplate.length, validTemplate.length);
      if (similarity >= 0.6) {
        suggestions.push(validTemplate);
      }
    }
  }

  // Remove duplicates and limit to 5 suggestions
  return [...new Set(suggestions)].slice(0, 5);
}

// Helper function to validate template name
function validateTemplateName(templateName: string, logger: ILogger): string {
  const templateKeys = getTemplateKeys();

  // Check if the template exists in the actual service
  if (!templateKeys.includes(templateName)) {
    const suggestions = findSimilarTemplates(templateName, templateKeys);
    logger.error(`❌ Template '${templateName}' not found.`);
    if (suggestions.length > 0) {
      console.log('💡 Did you mean one of these?');
      suggestions.forEach(suggestion => console.log(`   ${suggestion}`));
    }
    console.log(`\n💡 Available templates: ${templateKeys.join(', ')}`);
    process.exit(1);
  }

  return templateName;
}

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

          // Validate template name using the actual service keys
          const validatedTemplateName = validateTemplateName(templateName, logger);
          const templateContent = templates[validatedTemplateName];

          // Additional safety check
          if (!templateContent) {
            logger.error(`❌ Template content for '${validatedTemplateName}' is undefined.`);
            console.log(`💡 Available templates: ${Object.keys(templates).join(', ')}`);
            process.exit(1);
          }

          console.log(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          );
          console.log(`📝 Prompt Template: ${validatedTemplateName}`);
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
