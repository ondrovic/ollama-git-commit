export const PROMPTS = {
  DEFAULT: `Write concise commit messages:
- The first line should be a short summary of the changes
- Mention the files that were changed and what was modified
- Explain the reasoning behind changes
- Use bullet points for multiple changes
- Use appropriate emojis sparingly for categorization
- If there are no changes or the input is blank, return a blank string

Think carefully before writing your commit message.

The output format should be:

Summary of changes
- change description
- change description

What you write will be passed directly to git commit -m "[message]"`,

  CONVENTIONAL: `Generate conventional commit messages following the format: type(scope): description

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert

Rules:
- Use lowercase for type and description
- Keep description under 72 characters
- Add body with bullet points for multiple changes
- Be specific about what changed and why
- Use present tense

Format:
type(scope): short description

- detailed change 1
- detailed change 2

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
- List all modified files and their changes
- Explain the technical details of the implementation
- Include any relevant background information
- Use bullet points for multiple changes
- Add any important notes or warnings

Format:
Summary of changes

Technical details:
- Detailed change 1
- Detailed change 2

Background:
- Context or reasoning

What you write will be passed directly to git commit -m "[message]"`,
} as const;
