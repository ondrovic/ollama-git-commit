#!/usr/bin/env bun
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ConfigManager } from '../src/core/config';

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
  console.log(`🔄 Incrementing ${type} version...`);

  try {
    // Use npm version to increment
    const result = execSync(`npm version ${type} --no-git-tag-version`, { stdio: 'pipe' })
      .toString()
      .trim();

    // npm version returns the new version with 'v' prefix, remove it
    const newVersion = result.replace('v', '');
    console.log(`✅ Version updated to: ${newVersion}`);

    return newVersion;
  } catch (error) {
    console.error('❌ Failed to increment version:', error);
    throw error;
  }
}

function regenerateVersionFile(): void {
  console.log(`🔄 Regenerating version file...`);

  try {
    // Run the prebuild script to regenerate the version file
    execSync('bun run prebuild', { stdio: 'inherit' });
    console.log(`✅ Version file regenerated`);
  } catch (error) {
    console.error('❌ Failed to regenerate version file:', error);
    console.log('💡 This is not critical for release, as CI/CD will regenerate it');
  }
}

function updateChangelog(version: string): void {
  console.log(`📝 Updating CHANGELOG.md for version ${version}...`);

  try {
    const changelogPath = join(process.cwd(), 'CHANGELOG.md');
    const changelog = readFileSync(changelogPath, 'utf-8');

    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Replace [Unreleased] with new version
    const updatedChangelog = changelog.replace(
      '## [Unreleased]',
      `## [Unreleased]\n\n## [${version}] - ${today}`,
    );

    writeFileSync(changelogPath, updatedChangelog);
    console.log(`✅ CHANGELOG.md updated`);
  } catch (error) {
    console.error('❌ Failed to update CHANGELOG.md:', error);
    throw error;
  }
}

function testBuild(): void {
  console.log(`🧪 Testing build process...`);

  try {
    // Clean and build to ensure everything works
    execSync('bun run clean && bun run build', { stdio: 'inherit' });
    console.log(`✅ Build test successful`);
  } catch (error) {
    console.error('❌ Build test failed:', error);
    throw error;
  }
}

async function getQuietSetting(): Promise<boolean> {
  // First check environment variable
  if (process.env.QUIET === 'true') {
    return true;
  }
  
  // Then check config file
  try {
    const configManager = ConfigManager.getInstance();
    const config = await configManager.getConfig();
    return config.quiet;
  } catch {
    // Fallback to false if config can't be read
    return false;
  }
}

async function createAndPushTag(version: string): Promise<void> {
  const tag = `v${version}`;
  const isQuiet = await getQuietSetting();

  console.log(`🏷️ Creating and pushing tag ${tag}...`);

  try {
    // Update CHANGELOG.md
    updateChangelog(version);

    // Regenerate version file for local testing
    regenerateVersionFile();

    // Test the build process
    testBuild();

    // Stage version changes (note: we don't stage the generated version file)
    console.log(`📦 Staging package.json and CHANGELOG.md...`);
    execSync('git add package.json CHANGELOG.md', { 
      stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit' 
    });

    // Commit changes
    console.log(`💾 Committing version ${version}...`);
    execSync(`git commit -m "chore: release version ${version}"`, { 
      stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit' 
    });

    // Create tag
    console.log(`🏷️ Creating tag ${tag}...`);
    execSync(`git tag ${tag}`, { 
      stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit' 
    });

    // Push tag first
    console.log(`🚀 Pushing tag ${tag}...`);
    execSync(`git push origin ${tag}`, { 
      stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit' 
    });

    // Push commits
    console.log(`🚀 Pushing commits to main...`);
    execSync('git push origin main', { 
      stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit' 
    });

    console.log(`✅ Successfully created and pushed tag ${tag}`);
  } catch (error) {
    console.error('❌ Failed to create and push tag:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting release process...');

  // Get version type from command line argument (default: patch)
  const versionType = (process.argv[2] as 'patch' | 'minor' | 'major') || 'patch';

  if (!['patch', 'minor', 'major'].includes(versionType)) {
    console.error('❌ Error: Version type must be patch, minor, or major');
    console.log('Usage: bun run release [patch|minor|major]');
    process.exit(1);
  }

  console.log(`📋 Release type: ${versionType}`);

  // Check if we're on main branch
  const currentBranch = getCurrentBranch();
  console.log(`🌿 Current branch: ${currentBranch}`);

  if (currentBranch !== 'main') {
    console.error('❌ Error: You must be on the main branch to create a release');
    process.exit(1);
  }

  // Check for uncommitted changes
  if (hasUncommittedChanges()) {
    console.error('❌ Error: You have uncommitted changes. Please commit or stash them first.');
    console.log('💡 Run: git status');
    process.exit(1);
  }

  const currentVersion = getPackageVersion();
  console.log(`📦 Current version: ${currentVersion}`);

  try {
    // Increment version in package.json
    const newVersion = incrementVersion(versionType);

    // Create tag and push
    await createAndPushTag(newVersion);

    console.log(`🎉 Successfully released version ${newVersion}!`);
    console.log('🚀 The GitHub Actions workflow will now handle the NPM publish process.');
    console.log(
      '📦 Local build test completed - CI/CD will regenerate version file for production.',
    );
  } catch (error) {
    console.error('💥 Release failed:', error);
    console.log('\n🔍 Debug info:');
    console.log('- Check git status:', 'git status');
    console.log('- Check git remote:', 'git remote -v');
    console.log('- Check git config:', 'git config user.name && git config user.email');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
