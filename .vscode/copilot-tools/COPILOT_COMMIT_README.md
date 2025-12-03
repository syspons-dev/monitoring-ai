# Copilot Auto-Commit System

This directory contains scripts that enable GitHub Copilot to automatically commit changes using the GitHub API.

## How It Works

1. **Change Detection**: Scripts analyze `git status` to detect modified, added, renamed, and deleted files
2. **File Preparation**: Read file contents and prepare data structure for GitHub API
3. **Commit Message Generation**: Analyze changes to generate semantic commit messages (conventional commits format)
4. **GitHub API Push**: Copilot uses `mcp_github_push_files` tool to push directly to GitHub

## Scripts

### `copilot-commit.mjs` (Recommended)

Node.js script with full analysis and GitHub API preparation.

**Usage:**
```bash
# Analyze current changes
node .vscode/copilot-commit.mjs --analyze

# Prepare data for GitHub API (outputs JSON)
node .vscode/copilot-commit.mjs --prepare
```

**Features:**
- 📊 Analyzes changed files by category (common/graphs/config/docs)
- 💡 Generates semantic commit messages
- 📦 Prepares file data for `mcp_github_push_files`
- ✅ Validates file readability
- 🎨 Colored terminal output

### `auto-commit.sh`

Simple bash script for basic analysis.

**Usage:**
```bash
bash .vscode/auto-commit.sh
```

## Copilot Workflow

When you ask Copilot to "commit changes", it should:

1. **Run analysis:**
   ```bash
   node .vscode/copilot-commit.mjs --prepare
   ```

2. **Extract data from JSON output:**
   - `owner`: Repository owner
   - `repo`: Repository name
   - `branch`: Current branch
   - `files`: Array of `{path, content}` objects
   - `message`: Suggested commit message

3. **Use GitHub MCP tool:**
   ```typescript
   mcp_github_push_files({
     owner: "syspons-dev",
     repo: "monitoring-ai",
     branch: "main",
     files: [...],
     message: "refactor(graphs): rename ExternalGraph to RemoteGraph"
   })
   ```

## Commit Message Convention

The script follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `chore`: Maintenance tasks
- `test`: Adding tests
- `style`: Code style changes

**Scopes:**
- `common`: Changes to common package
- `graphs`: Changes to graphs package
- `config`: Configuration changes
- Multiple scopes: `common,graphs`

## Example Interactions

### Ask Copilot to commit:
```
User: "Commit the current changes"
```

Copilot will:
1. Run `node .vscode/copilot-commit.mjs --prepare`
2. Analyze the output
3. Call `mcp_github_push_files` with appropriate data
4. Confirm the commit

### View changes before committing:
```
User: "What changes are ready to commit?"
```

Copilot will:
1. Run `node .vscode/copilot-commit.mjs --analyze`
2. Show you a summary of changed files
3. Suggest a commit message

## Limitations

- **Cannot delete files**: GitHub API `push_files` doesn't support deletions
  - Script will show a WARNING if deletions are detected
  - Use regular git commands instead for commits with deletions
- **Binary files**: Only text files are supported (automatically skipped)
- **Large files**: Files >1MB may hit API limits
- **Local git sync**: After GitHub API commit, run `git reset --hard origin/main` to sync local repo

## When to Use Regular Git

Use traditional git commands (`git add`, `git commit`, `git push`) for:
- ❌ Commits with file deletions
- ❌ File renames (detected as delete + add)
- ❌ Complex refactorings with many file moves
- ❌ Binary file changes

Use the GitHub API tool for:
- ✅ Simple file modifications
- ✅ Adding new files
- ✅ Documentation updates
- ✅ Quick fixes

## Manual Commit Alternative

If you prefer traditional git workflow:

```bash
git add .
git commit -m "refactor(graphs): rename ExternalGraph to RemoteGraph"
git push origin main
```

## Configuration

Edit `copilot-commit.mjs` to customize:
- `REPO_OWNER`: GitHub repository owner
- `REPO_NAME`: Repository name
- Commit message generation logic (line 52-85)
- File categorization rules (line 37-50)

## Troubleshooting

**Script not executable:**
```bash
chmod +x .vscode/copilot-commit.mjs
chmod +x .vscode/auto-commit.sh
```

**Node.js not found:**
Ensure Node.js 18+ is installed: `node --version`

**Permission denied:**
Check GitHub authentication is configured for Copilot

**Files not pushed:**
- Verify branch permissions
- Check file size limits
- Ensure files are readable
