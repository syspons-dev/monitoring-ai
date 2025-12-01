import { GraphDescription } from '../graph/description.js';
import { MonitoringAiGraphs } from '../types/graph.types.js';

export interface MonitoringAiWorkflowConfig {
  monitoringAiGraph: MonitoringAiGraphs;
  // Description of the graph
  graphDescription: GraphDescription;
  // Whether the bot is sending proactive messages. If yes we should send an empty message to start the conversation
  hasProactiveMessage?: boolean;
  // External graph URL for external_graph type
  externalUrl?: string;
  // Optional API key for external graph authentication
  externalApiKey?: string;
  // Optional timeout for external graph requests (ms)
  externalTimeout?: number;
}
