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

  logger.error(`Invalid template name: "${templateName}"`);
  if (suggestions.length > 0) {
    logger.info('Did you mean one of these?');
    suggestions.forEach(suggestion => logger.info(`   ${suggestion}`));
  }
  logger.info(`Available templates: ${validTemplates.join(', ')}`);
  process.exit(1);
}

export const registerPromptsCommands = (configCommand: Command) => {
  const promptsCommand = configCommand.command('prompts').description('Manage prompt templates');

  promptsCommand
    .command('list')
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
            logger.error(`Template content for '${validatedTemplateName}' is undefined.`);
            logger.plain(`Available templates: ${Object.keys(templates).join(', ')}`);
            process.exit(1);
          }

          logger.table([
            {
              header: `Prompt Template: ${validatedTemplateName}`,
              separator:
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            },
          ]);
          logger.plain(templateContent);
        } else {
          // List all templates - always show the banner
          logger.plain(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          );
          logger.plain('Available prompt templates:');
          logger.plain(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          );

          for (const templateName of Object.keys(templates)) {
            const content = templates[templateName];
            if (content) {
              if (options.verbose) {
                logger.memo(`  ${templateName}`);
                logger.plain(`    Usage: ollama-git-commit config prompts list -n ${templateName}`);

                // Add verbose-specific information
                const charCount = content.length;
                const validation = promptService.validatePrompt(content);
                const status = validation.valid ? '✅ Valid' : '❌ Invalid';

                logger.plain(`    Characters: ${charCount}`);
                logger.plain(`    Status: ${status}`);

                if (!validation.valid && validation.errors.length > 0) {
                  logger.plain(`    Issues: ${validation.errors.join(', ')}`);
                }

                // Add a brief description based on template name
                const descriptions: Record<string, string> = {
                  default: 'Balanced template with good detail and structure',
                  conventional: 'Follows conventional commit format (type: description)',
                  simple: 'Minimal template for quick, simple commits',
                  detailed: 'Comprehensive template with extensive context and formatting',
                };

                if (descriptions[templateName]) {
                  logger.plain(`    Description: ${descriptions[templateName]}`);
                }

                logger.plain(''); // Add spacing between templates in verbose mode
              } else {
                // Non-verbose: just show usage commands
                logger.plain(`Usage: ollama-git-commit config prompts list -n ${templateName}`);
              }
            }
          }

          logger.plain(
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          );
          logger.tableInfo(`Total: ${Object.keys(templates).length} templates available`);
        }
      } catch (error) {
        logger.error('Failed to list prompt templates:', error);
        process.exit(1);
      }
    });
};
