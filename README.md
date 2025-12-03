# Monitoring-AI

Dynamic LangGraph graphs using Azure AI Foundry, designed to be called by Express applications.

> **Version:** 0.1.x | **License:** MIT

## Overview

This repository contains modular LangGraph workflows that can be invoked via Express API endpoints. Each graph is independently callable and designed for specific AI tasks.

## Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Development

```bash
# Start LangGraph dev server
npx @langchain/langgraph-cli dev

# Run tests
npm test

# Run linting
npm run lint
```

## Project Structure

```
src/
  graphs/          # LangGraph workflow definitions
  controllers/     # Express route handlers
  types/           # TypeScript type definitions
  utils/           # Utility functions
tests/             # Graph entry points for LangGraph CLI
```

## Creating a New Graph

1. Create graph definition in `src/graphs/yourGraph/`
2. Export from `src/graphs/index.ts`
3. Create test entry point in `tests/`
4. Add to `langgraph.json`

## License

MIT
