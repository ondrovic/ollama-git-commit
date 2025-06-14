export const defaultPrompt = `Write concise commit messages:
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

What you write will be passed directly to git commit -m "[message]"`;
