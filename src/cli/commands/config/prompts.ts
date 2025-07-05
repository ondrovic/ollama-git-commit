import { Command } from 'commander';
import { ServiceFactory } from '../../../core/factory';
import { ILogger } from '../../../core/interfaces';

// Helper function to validate template name
function validateTemplateName(
  templateName: string,
  logger: ILogger,
  templates: Record<string, string>,
): string {
  const validTemplates = Object.keys(templates);
  const normalizedName = templateName.toLowerCase();

  if (validTemplates.includes(normalizedName)) {
    return normalizedName;
  }

  // Find similar templates
  const suggestions = validTemplates.filter(
    template => template.includes(normalizedName) || normalizedName.includes(template),
  );

  logger.error(`❌ Invalid template name: "${templateName}"`);
  if (suggestions.length > 0) {
    console.log('💡 Did you mean one of these?');
    suggestions.forEach(suggestion => console.log(`   ${suggestion}`));
  }
  console.log(`💡 Available templates: ${validTemplates.join(', ')}`);
  process.exit(1);
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
          const validatedTemplateName = validateTemplateName(templateName, logger, templates);
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
          // List all templates
          console.log(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          );
          console.log('📝 Available Prompt Templates');
          console.log(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          );

          Object.keys(templates).forEach(templateName => {
            const content = templates[templateName];
            if (content) {
              const lineCount = content.split('\n').length;
              const charCount = content.length;
              console.log(`\n📋 ${templateName}`);
              console.log(`   Lines: ${lineCount}, Characters: ${charCount}`);
              console.log(
                `   Usage: ollama-git-commit config list-prompt-templates -n ${templateName}`,
              );
            }
          });

          console.log('\n💡 Use -n <template> to view specific template contents');
        }
      } catch (error) {
        logger.error('Failed to list prompt templates:', error);
        process.exit(1);
      }
    });
};
