import type { Citation, MonitoringAiMessage } from '../types/message.types.js';
import { MonitoringAiNodeUsageEntry } from '../types/tokens.types.js';

export interface VectorStoreDataSource {
  type: 'vector_store';
  collectionName: string;
  searchOptions?: any;
}

export interface MonitoringAiBaseGraphStateType {
  //Array of conversation messages (user, AI, system, function, etc.)
  messages: MonitoringAiMessage[];
  // Additional metadata related to the graph state
  metadata?: Record<string, any>;
  // Structured data that can be used for further processing
  structuredData?: Record<string, any>;
  // Citations from retriever tool calls during RAG operations
  citations?: Citation[];
  // Detailed breakdown of token usage per node execution (sum for total)
  usagePerNode?: MonitoringAiNodeUsageEntry[];
}
