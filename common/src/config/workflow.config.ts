import { GraphDescription, MonitoringAiGraphs, RemoteGraphConfig } from '../index.js';

export enum EmbeddingStrategy {
  // Use local ChromaDB for embedding processing
  local = 'local',
  // Send file URLs to remote graph for external embedding processing
  remote = 'remote',
}

export interface MonitoringAiWorkflowConfig {
  monitoringAiGraph: MonitoringAiGraphs;
  // Description of the graph
  graphDescription: GraphDescription;
  // Strategy for handling embeddings: local uses ChromaDB, remote sends URLs to remote graph
  embeddingStrategy: EmbeddingStrategy;
  // Configuration for remote graph, if applicable
  remoteGraphConfig?: RemoteGraphConfig;
  // Whether the bot is sending proactive messages. If yes we should send an empty message to start the conversation
  hasProactiveMessage?: boolean;
}
