import { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';

/**
 * LangGraph-specific state annotation for monitoring AI graphs.
 * This is the actual annotation object used with StateGraph in the graphs package.
 *
 * The annotation includes:
 * - messages: An array of BaseMessage objects
 * - reducer: messagesStateReducer - handles message aggregation and special cases like RemoveMessage
 * - default: Returns empty array for initial state
 *
 * This can be used directly with StateGraph:
 * @example
 * ```ts
 * const graph = new StateGraph(MonitoringAiBaseGraphStateAnnotation);
 * ```
 */
export const MonitoringAiBaseGraphStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  structuredData: Annotation<Record<string, any> | undefined>({
    reducer: (left, right) => right ?? left,
    default: () => undefined,
  }),
});

/**
 * Type representing the actual LangGraph state with BaseMessage from @langchain/core.
 * This is the type used internally in the graphs package.
 */
export type MonitoringAiBaseGraphState = typeof MonitoringAiBaseGraphStateAnnotation.State;

// Re-export embedding controller types for convenience
export type { EmbeddingConfig, EmbeddingDocument } from '../controllers/index.js';

// Re-export common embedding types
export type {
  MonitoringAiEmbeddingQueryOptions as EmbeddingQueryOptions,
  EmbeddingQueryResult,
  EmbeddingMetadata,
} from '@syspons/monitoring-ai-common';
