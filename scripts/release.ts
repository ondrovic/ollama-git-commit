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
  
  // Commit CHANGELOG.md changes
  execSync('git add CHANGELOG.md');
  execSync(`git commit -m "chore: update CHANGELOG.md for version ${version}"`);
  
  // Create and push tag
  execSync(`git tag ${tag}`);
  execSync(`git push origin ${tag}`);
  execSync('git push origin main');
}

function main() {
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

  // Get version from package.json
  const version = getPackageVersion();
  console.log(`Creating release for version ${version}`);

  try {
    createAndPushTag(version);
    console.log(`Successfully created and pushed tag v${version}`);
    console.log('The GitHub Actions workflow will now handle the NPM publish process.');
  } catch (error) {
    console.error('Error creating or pushing tag:', error);
    process.exit(1);
  }
}

main(); 