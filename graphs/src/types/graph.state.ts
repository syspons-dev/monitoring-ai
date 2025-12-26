import { BaseMessage } from '@langchain/core/messages';
import { Annotation, messagesStateReducer } from '@langchain/langgraph';
import { Citation, MonitoringAiNodeUsageEntry } from '@syspons/monitoring-ai-common';

/**
 * LangGraph-specific state annotation for monitoring AI graphs.
 * This is the actual annotation object used with StateGraph in the graphs package.
 *
 * The annotation includes:
 * - messages: An array of BaseMessage objects with messagesStateReducer for aggregation
 * - structuredData: Optional structured data extracted from model responses
 * - citations: Citations from retriever tool calls during RAG operations
 * - usagePerNode: Detailed breakdown of token usage per node execution (sum for total)
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
  citations: Annotation<Citation[] | undefined>({
    reducer: (left, right) => {
      if (!right || right.length === 0) return left;
      if (!left || left.length === 0) return right;
      return [...left, ...right];
    },
    default: () => undefined,
  }),
  usagePerNode: Annotation<MonitoringAiNodeUsageEntry[] | undefined>({
    reducer: (left, right) => {
      if (!right || right.length === 0) return left;
      if (!left || left.length === 0) return right;
      return [...left, ...right];
    },
    default: () => undefined,
  }),
});

/**
 * Type representing the actual LangGraph state with BaseMessage from @langchain/core.
 * This is the type used internally in the graphs package.
 */
export type MonitoringAiBaseGraphState = typeof MonitoringAiBaseGraphStateAnnotation.State;
