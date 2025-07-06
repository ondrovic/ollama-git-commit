#!/usr/bin/env bun
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ConfigManager } from '../src/core/config';
import { Logger } from '../src/utils/logger';

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
  Logger.increment(`Incrementing ${type} version...`);

  try {
    // Use npm version to increment
    const result = execSync(`npm version ${type} --no-git-tag-version`, { stdio: 'pipe' })
      .toString()
      .trim();

    // npm version returns the new version with 'v' prefix, remove it
    const newVersion = result.replace('v', '');
    Logger.success(`Version updated to: ${newVersion}`);

    return newVersion;
  } catch (error) {
    Logger.error('Failed to increment version:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

function regenerateVersionFile(isQuiet: boolean): void {
  Logger.increment('Regenerating version file...');

  try {
    // Create environment with QUIET propagation
    const env = { 
      ...process.env, 
      ...(isQuiet && { QUIET: 'true' }) 
    };

    // Run the prebuild script to regenerate the version file
    execSync('bun run prebuild', { 
      stdio: 'inherit',
      env
    });
    Logger.success('Version file regenerated');
  } catch (error) {
    Logger.error('Failed to regenerate version file:', error instanceof Error ? error.message : String(error));
    Logger.info('This is not critical for release, as CI/CD will regenerate it');
  }
}

function updateChangelog(version: string): void {
  Logger.changelog(`Updating CHANGELOG.md for version ${version}...`);

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
    Logger.success('CHANGELOG.md updated');
  } catch (error) {
    Logger.error('Failed to update CHANGELOG.md:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

function testBuild(isQuiet: boolean): void {
  Logger.test('Testing build process...');

  try {
    // Create environment with QUIET propagation
    const env = { 
      ...process.env, 
      ...(isQuiet && { QUIET: 'true' }) 
    };

    // Clean and build to ensure everything works
    execSync('bun run clean && bun run build', { 
      stdio: 'inherit',
      env
    });
    Logger.success('Build test successful');
  } catch (error) {
    Logger.error('Build test failed:', error instanceof Error ? error.message : String(error));
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

  // Create environment with QUIET propagation
  const env = { 
    ...process.env, 
    ...(isQuiet && { QUIET: 'true' }) 
  };

  Logger.tag(`Creating and pushing tag ${tag}...`);

  try {
    // Update CHANGELOG.md
    updateChangelog(version);

    // Regenerate version file for local testing
    regenerateVersionFile(isQuiet);

    // Test the build process
    testBuild(isQuiet);

    // Stage version changes (note: we don't stage the generated version file)
    Logger.package('Staging package.json and CHANGELOG.md...');
    execSync('git add package.json CHANGELOG.md', { 
      stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
      env
    });

    // Commit changes
    Logger.floppy(`Committing version ${version}...`);
    execSync(`git commit -m "chore: release version ${version}"`, { 
      stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
      env
    });

    // Create tag
    Logger.tag(`Creating tag ${tag}...`);
    execSync(`git tag ${tag}`, { 
      stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
      env
    });

    // Push tag first
    Logger.rocket(`Pushing tag ${tag}...`);
    execSync(`git push origin ${tag}`, { 
      stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
      env
    });

    // Push commits
    Logger.rocket('Pushing commits to main...');
    execSync('git push origin main', { 
      stdio: isQuiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
      env
    });

    Logger.success(`Successfully created and pushed tag ${tag}`);
  } catch (error) {
    Logger.error('Failed to create and push tag:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

async function main() {
  Logger.rocket('Starting release process...');

  // Get version type from command line argument (default: patch)
  const versionType = (process.argv[2] as 'patch' | 'minor' | 'major') || 'patch';

  if (!['patch', 'minor', 'major'].includes(versionType)) {
    Logger.error('Error: Version type must be patch, minor, or major');
    Logger.info('Usage: bun run release [patch|minor|major]');
    process.exit(1);
  }

  await Logger.group(`Release type: ${versionType}`, async () => {
    // Check if we're on main branch
    const currentBranch = getCurrentBranch();
    Logger.info(`Current branch: ${currentBranch}`);

    if (currentBranch !== 'main') {
      Logger.error('Error: You must be on the main branch to create a release');
      process.exit(1);
    }

    // Check for uncommitted changes
    if (hasUncommittedChanges()) {
      Logger.error('Error: You have uncommitted changes. Please commit or stash them first.');
      Logger.info('Run: git status');
      process.exit(1);
    }

    const currentVersion = getPackageVersion();
    Logger.package(`Current version: ${currentVersion}`);

    try {
      // Increment version in package.json
      const newVersion = incrementVersion(versionType);

      // Create tag and push
      await createAndPushTag(newVersion);

      Logger.success(`Successfully released version ${newVersion}!`);
      Logger.info('The GitHub Actions workflow will now handle the NPM publish process.');
      Logger.info('Local build test completed - CI/CD will regenerate version file for production.');
    } catch (error) {
      Logger.error('Release failed:', error instanceof Error ? error.message : String(error));
      Logger.info('Debug info:');
      Logger.info('- Check git status: git status');
      Logger.info('- Check git remote: git remote -v');
      Logger.info('- Check git config: git config user.name && git config user.email');
      process.exit(1);
    }
  });
}

main().catch(error => {
  Logger.error('Script failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});