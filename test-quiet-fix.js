// Simple test to verify GitService.execCommand quiet mode behavior
const { GitService } = require('./src/core/git.ts');

console.log('Testing GitService.execCommand quiet mode fix...\n');

const git = new GitService();

// Test quiet=false (should show output)
console.log('=== Testing quiet=false (should show output) ===');
try {
  const output1 = git.execCommand('git status', false);
  console.log('Output captured:', output1);
} catch (error) {
  console.log('Error in quiet=false test:', error.message);
}

console.log('\n=== Testing quiet=true (should suppress output) ===');
try {
  const output2 = git.execCommand('git status', true);
  console.log('Output captured:', output2);
} catch (error) {
  console.log('Error in quiet=true test:', error.message);
}

console.log('\nTest completed!'); 