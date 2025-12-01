# GitHub Copilot Instructions for monitoring-ai

## Project Overview

This repository contains dynamic LangGraph graphs using Azure AI Foundry that will be called by an Express application.

## Code Style & Conventions

### TypeScript
- Use TypeScript strict mode with full type safety
- Prefer explicit return types for public APIs
- Use interfaces for data structures and types for unions/primitives
- Export all public types from `src/types/index.ts`
- **NEVER use `any` type** - use `unknown` when type is truly unknown, or proper type assertions
- Avoid type casts with `as any` - find type-safe alternatives

### Naming Conventions
- Use camelCase for variables, functions, and methods
- Use PascalCase for classes, interfaces, types, and enums
- Use UPPER_SNAKE_CASE for constants
- Prefix private class members with underscore (e.g., `_privateField`)
- Use descriptive names that clearly indicate purpose

### Code Organization
```
src/
  index.ts           # Main entry point - exports public API
  types/             # Type definitions and interfaces
  core/              # Core functionality (Monitor class)
  utils/             # Utility functions
  providers/         # Provider implementations
```

### File Structure
- Each module should have a single responsibility
- Export from index files to create clean public APIs
- Keep files under 300 lines when possible
- Group related functionality together

## Development Guidelines

### Adding New Features
1. Define types in `src/types/index.ts` first
2. Implement core logic in appropriate directory
3. Export from module's index file
4. Update main `src/index.ts` if public API changes
5. Add unit tests in `tests/unit/`
6. Update README.md with usage examples
7. Add entry to CHANGELOG.md

### Testing
- Use Vitest for all tests
- Aim for >80% code coverage
- Write unit tests for all public APIs
- Test edge cases and error conditions
- Use descriptive test names: `it('should <expected behavior> when <condition>')`

### Error Handling
- Throw meaningful errors with clear messages
- Use custom error classes when appropriate
- Document thrown errors in JSDoc comments
- Always clean up resources in finally blocks

### Documentation
- Add JSDoc comments to all public APIs
- Include parameter descriptions and return types
- Provide usage examples for complex functions
- Keep README.md up to date with new features

### Performance
- Avoid unnecessary object cloning
- Use sampling for high-volume scenarios
- Minimize allocations in hot paths
- Consider memory usage for long-running processes

## Common Patterns

### Creating a New Metric Type
```typescript
// 1. Add type to src/types/index.ts
export interface CustomMetric {
  name: string;
  value: number;
  type: 'custom';
  // ... additional fields
}

// 2. Update Monitor class in src/core/monitor.ts
recordCustomMetric(metric: Omit<CustomMetric, 'timestamp'>): void {
  // Implementation
}

// 3. Add tests in tests/unit/monitor.test.ts
```

### Creating a New Provider
```typescript
// In src/providers/custom-provider.ts
import { MonitorProvider } from './index';

export class CustomProvider implements MonitorProvider {
  name = 'custom';

  async initialize(config: CustomConfig): Promise<void> {
    // Setup connection
  }

  async send(data: unknown): Promise<void> {
    // Send to backend
  }

  async close(): Promise<void> {
    // Cleanup
  }
}

// Export from src/providers/index.ts
export * from './custom-provider';
```

### Adding Utility Functions
```typescript
// In src/utils/index.ts

/**
 * Brief description of what the function does
 * @param param1 Description of param1
 * @returns Description of return value
 */
export function utilityFunction(param1: string): string {
  // Implementation
}
```

## Dependencies

### Production
- **Zero dependencies** - Keep it lightweight!
- Only add dependencies if absolutely necessary
- Consider bundle size impact

### Development
- `typescript` - Type checking
- `tsup` - Fast bundler for TypeScript
- `vitest` - Testing framework
- `eslint` - Code linting
- `prettier` - Code formatting

## Build & Release

### Building
```bash
npm run build     # Production build
npm run dev       # Watch mode
```

### Testing
```bash
npm test          # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage
```

### Publishing
- Update version in `package.json` (semver)
- Update `CHANGELOG.md`
- Create GitHub release
- CI/CD will publish to npm automatically

## API Design Principles

1. **Simple by default** - Common cases should be easy
2. **Flexible when needed** - Advanced features available but optional
3. **Type-safe** - Leverage TypeScript for safety
4. **Consistent** - Similar patterns across the API
5. **Well-documented** - Clear docs and examples
6. **Performance-conscious** - Minimal overhead
7. **Extensible** - Provider pattern for backends

## Security Considerations

- Never log sensitive data (passwords, tokens, PII)
- Sanitize user input in custom tags/metadata
- Be cautious with eval or dynamic code execution
- Validate configuration before using
- Consider DoS risks with unbounded data collection

## Questions to Ask

When adding features, consider:
- Is this a breaking change?
- Does it affect the public API?
- Are there performance implications?
- How will this be tested?
- Is documentation needed?
- Should this be configurable?

## Helpful Commands

```bash
# Development
npm run dev           # Build in watch mode
npm run typecheck     # Check types without building

# Quality
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
npm run format        # Format code
npm run format:check  # Check formatting

# Testing
npm test              # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report

# Building
npm run build         # Build for production
npm run clean         # Remove build artifacts
```

## Client-Side Integration Guidance

When the user requests client-side integration guidance or UI prompts for specific features, provide detailed implementation examples that:

1. **Show dynamic UI patterns** based on type/configuration data
2. **Include complete code examples** with TypeScript types
3. **Demonstrate conditional rendering** based on metadata flags
4. **Provide step-by-step flows** for complete feature implementation
5. **Emphasize type safety** using exported types and enums from `@syspons/monitoring-ai-common`

**Example Topics:**
- Embedding provider UI integration (dropdowns vs text inputs based on `allowCustomModelName`)
- Graph selection interfaces (using `MonitoringAiGraphs` enum and graph descriptions)
- Data source configuration UIs (vector stores, APIs, databases)
- Workflow configuration forms (model settings, data flow, embeddings)
- Search method selection (using `SEARCH_METHODS` registry)
- Document upload interfaces (with type detection and chunking options)

**Response Format:**
- Start with clear TypeScript code examples
- Show how to consume registry/configuration data from common package
- Include conditional logic for dynamic UI elements
- Provide complete implementation flow (selection → validation → submission)
- List relevant types/enums for type-safe integration

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Vitest Documentation](https://vitest.dev/)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
