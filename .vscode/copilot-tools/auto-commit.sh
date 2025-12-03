#!/bin/bash
# Auto-commit script for monitoring-ai repository
# This script helps Copilot commit changes via GitHub API

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the repository root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo -e "${YELLOW}Auto-commit script for monitoring-ai${NC}"
echo "Repository: $REPO_ROOT"
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}Error: Not a git repository${NC}"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Get git status
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${GREEN}No changes to commit${NC}"
    exit 0
fi

# Show changed files
echo -e "\n${YELLOW}Changed files:${NC}"
git status --short

# Generate commit message suggestion
echo -e "\n${YELLOW}Analyzing changes...${NC}"

# Count file changes by type
ADDED=$(git status --porcelain | grep -c "^A" || true)
MODIFIED=$(git status --porcelain | grep -c "^M" || true)
DELETED=$(git status --porcelain | grep -c "^D" || true)
RENAMED=$(git status --porcelain | grep -c "^R" || true)

echo "  Added: $ADDED, Modified: $MODIFIED, Deleted: $DELETED, Renamed: $RENAMED"

# This script prepares the information
# Copilot will use GitHub MCP tools to actually commit

echo -e "\n${GREEN}Ready for Copilot to commit via GitHub API${NC}"
echo "Copilot should now:"
echo "1. Read changed files"
echo "2. Generate appropriate commit message"
echo "3. Use mcp_github_push_files to push changes"

exit 0
