import { MonitoringAiGraphs } from '@syspons/monitoring-ai-common';
import type { GraphDescription } from '@syspons/monitoring-ai-common';

import { chatGraphDescription } from './chatGraph/chat.description.js';
import { externalGraphDescription } from './externalGraph/external.description.js';

export const graphDescriptions: Record<MonitoringAiGraphs, GraphDescription> = {
  [MonitoringAiGraphs.chat_graph]: chatGraphDescription,
  [MonitoringAiGraphs.external_graph]: externalGraphDescription,
};

export function getGraphDescription(graphType: MonitoringAiGraphs): GraphDescription {
  return graphDescriptions[graphType];
}
