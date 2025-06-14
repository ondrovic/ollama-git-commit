export const getFriendlySource = (source: string | undefined): string => {
  if (!source) return 'DEFAULT';
  if (source === 'environment variable') return 'ENV';
  if (source === 'default') return 'DEFAULT';

  // Normalize path separators for Windows
  const normalizedSource = String(source).replace(/\\/g, '/');

  // Check for project config
  if (normalizedSource.includes('.ollama-git-commit.json')) return 'Project';

  // Check for user config
  if (normalizedSource.includes('.config/ollama-git-commit')) return 'User';

  // If we get a full path, try to determine if it's Project or User
  const currentDir = process.cwd().replace(/\\/g, '/');
  if (normalizedSource.includes(currentDir)) return 'Project';

  // Check for user config in home directory
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir && normalizedSource.includes(homeDir.replace(/\\/g, '/'))) {
    if (normalizedSource.includes('.config/ollama-git-commit')) return 'User';
  }

  return source;
};
