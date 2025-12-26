# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-12-25

### ⚠️ BREAKING CHANGES

#### Peer Dependencies Migration

**Why:** Fixed TypeScript type incompatibility when using `@syspons/monitoring-ai-graphs` in consuming applications. Previously, having duplicate copies of `@langchain/core` in `node_modules` caused type errors.

**What Changed:**
- Moved `@langchain/core`, `@langchain/community`, `@langchain/langgraph`, and `@langchain/openai` from `dependencies` to `peerDependencies` in `@syspons/monitoring-ai-graphs`
- These packages are now required to be installed by consuming applications

**Migration Required:**
Consuming applications must now explicitly install LangChain peer dependencies:

```bash
npm install @langchain/community@^1.0.5 \
  @langchain/core@^1.1.0 \
  @langchain/langgraph@^1.0.2 \
  @langchain/openai@^1.1.2
```

See [PEER_DEPENDENCIES_MIGRATION.md](./PEER_DEPENDENCIES_MIGRATION.md) for complete migration guide.

### Added

#### Token and Cost Tracking System

Complete token usage and cost tracking infrastructure:

- **TokensController** - Centralized stateful controller for token counting and cost calculations
  - Automatic pricing lookup from `CommonAiModel` registry
  - Per-1M-token pricing with separate input/output rates
  - Support for 15+ models (OpenAI GPT-4/3.5, Claude, embeddings)
  - Internal storage of usage entries with `recordUsage()` pattern
  - Methods: `getUsageEntries()`, `clearUsageEntries()`, `getUsageEntryCount()`
  - Token counting with tiktoken integration

- **Graph State Integration**
  - Added `usagePerNode` field to graph state with array concatenation reducer
  - Automatic collection and merging of usage from both TokensController and EmbeddingController
  - Per-node breakdown with timestamps and iteration tracking

- **LLM Cost Tracking**
  - `invokeModel()` tracks tokens for structured and plain responses
  - `invokeAgent()` tracks tokens with iteration support for tool loops
  - `invokeMethod` parameter identifies which function created each entry
  - Embedded cost calculation (inputCost, outputCost, totalCost) in usage metadata

- **Embedding Cost Tracking**
  - EmbeddingController integration with TokensController
  - Automatic token counting for `addDocuments()` and `queryDocuments()`
  - Delegation methods for retrieving and clearing usage entries

- **Types and Configuration**
  - `MonitoringAiNodeUsageEntry` interface with invokeMethod field
  - `CommonAiModel` enum with 15+ models
  - `COMMON_MODEL_PRICING` registry with automatic lookup
  - `getModelPricing()` helper function

### Fixed

- Fixed npm install issues by downgrading dotenv to ^16.4.5 and zod to ^3.23.8
- Corrected tiktoken import to use snake_case `encoding_for_model`
- Fixed type spreading error in graph.base.ts for `result.usagePerNode`

## [0.1.8] - 2025-12-XX

### Added
- Initial implementation of LangGraph graphs
- EmbeddingController for ChromaDB vector store management
- Document processing utilities (PDF, DOCX, XLSX, CSV, HTML)
- Multiple search methods (similarity, cosine, L2, filtered)
- Duplicate detection with hash-based comparison
- Chunking strategies for text processing

### Changed
- Improved error handling across controllers
- Enhanced type safety with TypeScript strict mode

### Fixed
- Various bug fixes and stability improvements

[0.2.0]: https://github.com/syspons/monitoring-ai/compare/v0.1.8...v0.2.0
[0.1.8]: https://github.com/syspons/monitoring-ai/releases/tag/v0.1.8
