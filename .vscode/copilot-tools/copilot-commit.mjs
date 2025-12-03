#!/usr/bin/env node
/**
 * Copilot Auto-Commit Helper
 * 
 * This script helps GitHub Copilot commit changes by:
 * 1. Analyzing current git changes
 * 2. Preparing file data for GitHub API
 * 3. Providing commit message suggestions
 * 
 * Usage: node copilot-commit.mjs [--analyze|--prepare]
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import { statSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..');
const REPO_OWNER = 'syspons-dev';
const REPO_NAME = 'monitoring-ai';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getCurrentBranch() {
  return execSync('git branch --show-current', { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
}

function getChangedFiles() {
  const output = execSync('git status --porcelain', { cwd: REPO_ROOT, encoding: 'utf-8' });
  
  return output.split('\n')
    .filter(line => line.trim())
    .map(line => {
      const status = line.substring(0, 2).trim();
      const filePath = line.substring(3).trim();
      return { status, filePath };
    });
}

function readFileContent(filePath) {
  const fullPath = join(REPO_ROOT, filePath);
  if (!existsSync(fullPath)) {
    return null;
  }
  try {
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      return null; // Skip directories
    }
    return readFileSync(fullPath, 'utf-8');
  } catch (error) {
    log(`Warning: Could not read ${filePath}: ${error.message}`, 'yellow');
    return null;
  }
}

function generateCommitMessage(changes) {
  const filesByType = {
    common: [],
    graphs: [],
    config: [],
    docs: [],
    other: [],
  };

  changes.forEach(({ filePath }) => {
    if (filePath.startsWith('common/')) filesByType.common.push(filePath);
    else if (filePath.startsWith('graphs/')) filesByType.graphs.push(filePath);
    else if (filePath.includes('config') || filePath.includes('.json')) filesByType.config.push(filePath);
    else if (filePath.endsWith('.md') || filePath.includes('README')) filesByType.docs.push(filePath);
    else filesByType.other.push(filePath);
  });

  // Detect major changes
  const hasRename = changes.some(c => c.status === 'R');
  const hasRefactor = changes.some(c => 
    c.filePath.includes('external') || c.filePath.includes('remote')
  );

  let type = 'chore';
  let scope = '';
  let description = '';

  if (hasRefactor && hasRename) {
    type = 'refactor';
    if (filesByType.graphs.length > 0 && filesByType.common.length > 0) {
      scope = 'graphs,common';
      description = 'rename ExternalGraph to RemoteGraph for better clarity';
    }
  } else if (filesByType.graphs.length > filesByType.common.length) {
    scope = 'graphs';
  } else if (filesByType.common.length > 0) {
    scope = 'common';
  }

  const commitMessage = scope 
    ? `${type}(${scope}): ${description || 'update implementation'}`
    : `${type}: ${description || 'update files'}`;

  return commitMessage;
}

function analyzeChanges() {
  log('\n📊 Analyzing Repository Changes\n', 'cyan');
  
  const branch = getCurrentBranch();
  log(`Branch: ${branch}`, 'blue');
  
  const changes = getChangedFiles();
  
  if (changes.length === 0) {
    log('\n✅ No changes to commit', 'green');
    return { hasChanges: false };
  }
  
  log(`\n📝 Changed files (${changes.length}):`, 'yellow');
  changes.forEach(({ status, filePath }) => {
    const statusLabel = {
      'M': '📝 Modified',
      'A': '✅ Added',
      'D': '❌ Deleted',
      'R': '🔄 Renamed',
      '??': '❓ Untracked',
    }[status] || status;
    log(`  ${statusLabel}: ${filePath}`);
  });

  const suggestedMessage = generateCommitMessage(changes);
  log(`\n💡 Suggested commit message:`, 'cyan');
  log(`   ${suggestedMessage}`, 'green');

  return {
    hasChanges: true,
    branch,
    changes,
    suggestedMessage,
  };
}

function prepareForGitHubApi() {
  const analysis = analyzeChanges();
  
  if (!analysis.hasChanges) {
    return null;
  }

  // Check for deletions
  const deletions = analysis.changes.filter(({ status }) => status === 'D');
  if (deletions.length > 0) {
    log('\n⚠️  WARNING: GitHub API cannot handle file deletions!', 'red');
    log('The following files will NOT be deleted:', 'yellow');
    deletions.forEach(({ filePath }) => log(`  ❌ ${filePath}`, 'red'));
    log('\n💡 Solution: Use regular git commands for commits with deletions:', 'cyan');
    log('  git add -A && git commit -m "your message" && git push', 'blue');
    log('\n❓ Continue with modified/added files only? (deletions will be ignored)', 'yellow');
  }

  log('\n\n🔧 Preparing data for GitHub API...\n', 'cyan');

  const files = analysis.changes
    .filter(({ status }) => status !== 'D') // GitHub API can't handle deletes via push_files
    .map(({ filePath }) => {
      const content = readFileContent(filePath);
      if (content === null) {
        log(`  ⚠️  Skipping ${filePath} (could not read)`, 'yellow');
        return null;
      }
      log(`  ✅ Prepared ${filePath}`, 'green');
      return {
        path: filePath,
        content: content,
      };
    })
    .filter(file => file !== null);

  log(`\n📦 Ready to push ${files.length} files`, 'cyan');
  
  if (deletions.length > 0) {
    log('\n⚠️  Remember: After committing via GitHub API, run:', 'yellow');
    log('  git reset --hard origin/main', 'blue');
    log('  (to sync local repo with remote)', 'dim');
  }
  
  return {
    owner: REPO_OWNER,
    repo: REPO_NAME,
    branch: analysis.branch,
    files: files,
    message: analysis.suggestedMessage,
  };
}

// Main execution
const command = process.argv[2];

switch (command) {
  case '--analyze':
    analyzeChanges();
    break;
    
  case '--prepare':
    const data = prepareForGitHubApi();
    if (data) {
  log('\n📋 GitHub API Data (for Copilot):\n', 'cyan');
      // Mask the actual file contents for cleaner output, just show structure
      const dataPreview = {
        ...data,
        files: data.files.map(f => ({ path: f.path, size: f.content.length }))
      };
      console.log(JSON.stringify(data, null, 2));
    }
    break;
    
  default:
    log('\nCopilot Auto-Commit Helper\n', 'cyan');
    log('Usage:', 'yellow');
    log('  node copilot-commit.mjs --analyze   # Analyze changes');
    log('  node copilot-commit.mjs --prepare   # Prepare for GitHub API\n');
    log('This script helps Copilot commit changes via GitHub MCP tools.\n');
    
    // Show current status
    analyzeChanges();
}
