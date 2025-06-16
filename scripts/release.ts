#!/usr/bin/env bun
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function getCurrentBranch(): string {
  return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
}

function hasUncommittedChanges(): boolean {
  return execSync('git status --porcelain').toString().length > 0;
}

function getPackageVersion(): string {
  const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
  return packageJson.version;
}

function incrementVersion(type: 'patch' | 'minor' | 'major' = 'patch'): string {
  console.log(`Incrementing ${type} version...`);
  
  // Use npm version to increment
  const result = execSync(`npm version ${type} --no-git-tag-version`).toString().trim();
  
  // npm version returns the new version with 'v' prefix, remove it
  const newVersion = result.replace('v', '');
  console.log(`Version updated to: ${newVersion}`);
  
  return newVersion;
}

function updateChangelog(version: string): void {
  const changelogPath = join(process.cwd(), 'CHANGELOG.md');
  const changelog = readFileSync(changelogPath, 'utf-8');
  
  // Get current date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Replace [Unreleased] with new version
  const updatedChangelog = changelog.replace(
    '## [Unreleased]',
    `## [Unreleased]\n\n## [${version}] - ${today}`
  );
  
  writeFileSync(changelogPath, updatedChangelog);
}

function createAndPushTag(version: string): void {
  const tag = `v${version}`;
  
  // Update CHANGELOG.md
  updateChangelog(version);
  
  // Stage version changes (no need to sync metadata.ts anymore!)
  execSync('git add package.json CHANGELOG.md');
  execSync(`git commit -m "chore: release version ${version}"`);
  
  // Create and push tag
  execSync(`git tag ${tag}`);
  execSync(`git push origin ${tag}`);
  execSync('git push origin main');
}

function main() {
  // Get version type from command line argument (default: patch)
  const versionType = (process.argv[2] as 'patch' | 'minor' | 'major') || 'patch';
  
  if (!['patch', 'minor', 'major'].includes(versionType)) {
    console.error('Error: Version type must be patch, minor, or major');
    console.log('Usage: bun run release [patch|minor|major]');
    process.exit(1);
  }

  // Check if we're on main branch
  const currentBranch = getCurrentBranch();
  if (currentBranch !== 'main') {
    console.error('Error: You must be on the main branch to create a release');
    process.exit(1);
  }

  // Check for uncommitted changes
  if (hasUncommittedChanges()) {
    console.error('Error: You have uncommitted changes. Please commit or stash them first.');
    process.exit(1);
  }

  const currentVersion = getPackageVersion();
  console.log(`Current version: ${currentVersion}`);

  try {
    // Increment version in package.json
    const newVersion = incrementVersion(versionType);
    
    // Create tag and push
    createAndPushTag(newVersion);
    
    console.log(`✅ Successfully created and pushed tag v${newVersion}`);
    console.log('🚀 The GitHub Actions workflow will now handle the NPM publish process.');
  } catch (error) {
    console.error('❌ Error during release:', error);
    process.exit(1);
  }
}

main();