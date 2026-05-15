import { StateGraph, START, END, CompiledStateGraph } from '@langchain/langgraph';
import { BaseMessage } from '@langchain/core/messages';

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

      const conversationMessages = this.getConversationMessages(state.messages);
      const systemPrompt = this.getConfiguredSystemPrompt();

      // If vector stores are configured and embedding controller is initialized, use agent with RAG
      if (this.embeddingController.isReady()) {
        // Invoke agent with retriever support
        const result = await invokeAgent({
          model: this.model,
          messages: conversationMessages,
          systemPrompt: {
            ...KNOWLEDGE_BASE_SYSTEM_PROMPT,
            prompt: combinePrompts(systemPrompt, KNOWLEDGE_BASE_SYSTEM_PROMPT.prompt),
          },
          embeddingController: this.embeddingController,
          tokensController: this.tokensController,
          structuredDataAttributes: this.dataFlowConfig?.structuredDataAttributes,
          nodeName: 'CHAT_NODE',
          debug: this.debug,
        });

        return {
          messages: result.messages,
          structuredData: result.structuredData,
          citations: result.citations,
          usagePerNode: result.usagePerNode,
        };
      } else {
        // Default: Invoke model with optional structured output (no RAG)
        const result = await invokeModel({
          model: this.model,
          messages: conversationMessages,
          systemPrompt,
          structuredDataAttributes: this.dataFlowConfig?.structuredDataAttributes,
          tokensController: this.tokensController,
          nodeName: 'CHAT_NODE',
          debug: this.debug,
        });

        return {
          messages: [result.response],
          structuredData: result.structuredData,
          usagePerNode: result.usagePerNode,
        };
      }
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

  private getConversationMessages(messages: BaseMessage[]): BaseMessage[] {
    const pastMessagesIncluded = parseOptionalInteger(this.settings.MODEL_PAST_MESSAGES_INCLUDED) ?? 0;
    const totalMessagesToInclude = Math.max(1, pastMessagesIncluded + 1);

    return messages.slice(-totalMessagesToInclude);
  }

  private getConfiguredSystemPrompt(): string | undefined {
    const systemPrompt = this.settings.MODEL_SYSTEM_MESSAGE?.trim();
    return systemPrompt ? systemPrompt : undefined;
  }
}

function combinePrompts(configuredPrompt: string | undefined, defaultPrompt: string): string {
  return configuredPrompt ? `${configuredPrompt}\n\n${defaultPrompt}` : defaultPrompt;
}

function parseOptionalInteger(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsedValue = parseInt(value, 10);
  return Number.isNaN(parsedValue) ? undefined : parsedValue;
}
