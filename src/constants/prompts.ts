export const VALID_TEMPLATES = ['default', 'conventional', 'simple', 'detailed'] as const;
export type VALID_TEMPLATE = (typeof VALID_TEMPLATES)[number];

export const PROMPTS = {
  DEFAULT: `Write concise commit messages:
- The first line should be a short summary of the changes
- Group related changes together logically (e.g., all README changes together, all test changes together)
- Organize changes by category: documentation, core functionality, CLI commands, constants/types, tests
- Mention the files that were changed and what was modified
- Explain the reasoning behind changes
- Use bullet points for multiple changes
- Use appropriate emojis sparingly for categorization
- If there are no changes or the input is blank, return a blank string

The output format should be:

Summary of changes

- File/component: change description
- File/component: change description

Group related changes together. For example:
- README.md: 
  - Added new section about testing
  - Fixed typo in installation guide
- src/core/config.ts: Improved error handling
- test/config.test.ts: Added new test cases

What you write will be passed directly to git commit -m "[message]"`,

  CONVENTIONAL: `Generate conventional commit messages following the format: type(scope): description

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert

Rules:
- Use lowercase for type and description
- Keep description under 72 characters
- Add body with bullet points for multiple changes
- Group related changes together logically
- Be specific about what changed and why
- Use present tense

Format:
type(scope): short description

- detailed change 1
- detailed change 2

Group related changes together. For example:
- docs: update README with new installation steps
- feat: add new configuration options
- test: add comprehensive test coverage

What you write will be passed directly to git commit -m "[message]"`,

  SIMPLE: `Create simple, clear commit messages:

- Start with a verb (add, fix, update, remove, etc.)
- Mention what files or features were changed
- Keep it concise but informative
- Use normal capitalization
- No special formatting required

Example: "Fix user authentication bug in login component"

What you write will be passed directly to git commit -m "[message]"`,

  DETAILED: `Generate comprehensive commit messages with full context:

- Start with a clear summary of the changes
- Group related changes together logically by category:
  * Documentation (README, docs, etc.)
  * Core functionality (src/core/*)
  * CLI commands (src/cli/*, src/commands/*)
  * Constants and types (src/constants/*, src/types/*)
  * Tests (test/*)
- List all modified files and their changes within each group
- Explain the technical details of the implementation
- Include any relevant background information
- Use bullet points for multiple changes
- Add any important notes or warnings

Format:
Summary of changes

Documentation:
- README.md: Added new section about testing
- README.md: Fixed typo in installation guide

Core functionality:
- src/core/config.ts: Improved error handling
- src/core/ollama.ts: Enhanced connection logic

CLI commands:
- src/cli/commands/config/show.ts: Added new display options

Constants and types:
- src/constants/configurations.ts: Updated default values
- src/types/index.ts: Added new interface definitions

Tests:
- test/config.test.ts: Added new test cases
- test/ollama.test.ts: Enhanced connection tests

Technical details:
- Detailed change 1
- Detailed change 2

Background:
- Context or reasoning

What you write will be passed directly to git commit -m "[message]"`,
} as const;
