export const conventionalPrompt = `Generate conventional commit messages following the format: type(scope): description

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
- detailed change 2`;
