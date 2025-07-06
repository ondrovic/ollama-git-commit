/* istanbul ignore file */
const fileTree = {
  '/mock/dir': [
    { name: 'src', isDirectory: () => true, isFile: () => false },
    { name: 'file1.ts', isDirectory: () => false, isFile: () => true },
    { name: 'package.json', isDirectory: () => false, isFile: () => true },
  ],
  '/mock/dir/src': [{ name: 'file2.ts', isDirectory: () => false, isFile: () => true }],
};

const configContent = JSON.stringify({
  scripts: { lint: 'eslint', build: 'tsc' },
  model: 'mock-model',
  host: 'mock-host',
  promptFile: 'mock-prompt',
  configFile: 'mock-config',
});

export const MockedFileSystem = {
  readdir: (path: string) => Promise.resolve(fileTree[path] || []),
  readFile: (path: string, encoding: string) => {
    if (path.endsWith('package.json')) return Promise.resolve(configContent);
    return Promise.reject(new Error('File not found'));
  },
  access: (path: string) => {
    if (path.endsWith('package.json')) return Promise.resolve();
    return Promise.reject(new Error('File not found'));
  },
};
