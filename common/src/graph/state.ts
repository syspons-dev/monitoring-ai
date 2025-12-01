import type { MonitoringAiMessage } from '../types/message.types.js';

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
}
