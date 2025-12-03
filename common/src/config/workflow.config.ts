import { GraphDescription, MonitoringAiGraphs, RemoteGraphConfig } from '../index.js';

export interface MonitoringAiWorkflowConfig {
  monitoringAiGraph: MonitoringAiGraphs;
  // Description of the graph
  graphDescription: GraphDescription;
  // Configuration for remote graph, if applicable
  remoteGraphConfig?: RemoteGraphConfig;
  // Whether the bot is sending proactive messages. If yes we should send an empty message to start the conversation
  hasProactiveMessage?: boolean;
}
