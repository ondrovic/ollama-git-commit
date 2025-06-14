export const detailedPrompt = `Generate comprehensive commit messages with full context:

- Start with a clear, descriptive summary (50-72 characters)
- Include the reasoning behind the changes
- List all modified files and their purposes
- Explain any breaking changes or side effects
- Use technical language appropriate for developers
- Include relevant issue numbers if mentioned in diff
- Use emojis sparingly for categorization

Format:
Summary of the main change

Context:
- Why this change was needed
- What problem it solves

Changes:
- Detailed list of modifications
- File-by-file breakdown when helpful

Impact:
- Any breaking changes
- Performance implications
- Testing considerations

What you write will be passed directly to git commit -m "[message]"`;
