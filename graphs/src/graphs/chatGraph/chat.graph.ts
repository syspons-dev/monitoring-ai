import { StateGraph, START, END, CompiledStateGraph } from '@langchain/langgraph';

import {
  MonitoringAiBaseGraphState,
  MonitoringAiBaseGraphStateAnnotation,
} from '../../types/index.js';
import { MonitoringAiBaseGraph } from '../index.js';
import {
  MonitoringGraphSettings,
  invokeModel,
  invokeAgent,
  KNOWLEDGE_BASE_SYSTEM_PROMPT,
} from '../../index.js';

export class MonitoringAiChatGraph extends MonitoringAiBaseGraph<MonitoringAiBaseGraphState> {
  graph: CompiledStateGraph<MonitoringAiBaseGraphState, Partial<MonitoringAiBaseGraphState>>;

  constructor(settings: MonitoringGraphSettings) {
    super(settings);

    const graph = new StateGraph(MonitoringAiBaseGraphStateAnnotation);
    // Add nodes
    graph.addNode('CHAT_NODE', this.CHAT_NODE);

    // Define edges
    graph.addEdge(START, 'CHAT_NODE' as any);
    graph.addEdge('CHAT_NODE' as any, END);

    // Compile the graph
    this.graph = graph.compile() as CompiledStateGraph<
      MonitoringAiBaseGraphState,
      Partial<MonitoringAiBaseGraphState>
    >;
  }

  START_NODE = (_state: MonitoringAiBaseGraphState): Partial<MonitoringAiBaseGraphState> => {
    console.log('MonitoringAiChatGraph START_NODE invoked');
    return {};
  };

  CHAT_NODE = async (
    state: MonitoringAiBaseGraphState
  ): Promise<Partial<MonitoringAiBaseGraphState>> => {
    console.log('MonitoringAiChatGraph CHAT_NODE invoked');

    try {
      const userMessage = state.messages?.[state.messages.length - 1];

      if (!userMessage) {
        throw new Error('No user message found in state');
      }

      // If vector stores are configured and embedding controller is initialized, use agent with RAG
      if (this.embeddingController.isReady()) {
        // Use the first vector store configuration

        // Invoke agent with retriever support
        const result = await invokeAgent({
          model: this.model,
          messages: [userMessage],
          systemPrompt: KNOWLEDGE_BASE_SYSTEM_PROMPT,
          embeddingController: this.embeddingController,
          structuredDataAttributes: this.dataFlowConfig?.structuredDataAttributes,
          debug: this.debug,
        });

        return {
          messages: result.messages,
          structuredData: result.structuredData,
        };
      }

      // Default: Invoke model with optional structured output (no RAG)
      const result = await invokeModel({
        model: this.model,
        messages: [userMessage],
        structuredDataAttributes: this.dataFlowConfig?.structuredDataAttributes,
        debug: this.debug,
      });

      return {
        messages: [result.response],
        structuredData: result.structuredData,
      };
    } catch (error) {
      console.error('Error in CHAT_NODE:', error);
      throw new Error(
        `Failed to process chat: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  END_NODE = (state: MonitoringAiBaseGraphState): Partial<MonitoringAiBaseGraphState> => {
    console.log('MonitoringAiChatGraph END_NODE invoked');
    return state;
  };
}
