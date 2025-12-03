import { MonitoringAiGraphs } from '@syspons/monitoring-ai-common';
import type { GraphDescription } from '@syspons/monitoring-ai-common';

import { chatGraphDescription } from './chatGraph/chat.description.js';
import { remoteGraphDescription } from './remoteGraph/remote.description.js';

export const graphDescriptions: Record<MonitoringAiGraphs, GraphDescription> = {
  [MonitoringAiGraphs.chat_graph]: chatGraphDescription,
  [MonitoringAiGraphs.remote_graph]: remoteGraphDescription,
};

export function getGraphDescription(graphType: MonitoringAiGraphs): GraphDescription {
  return graphDescriptions[graphType];
}
