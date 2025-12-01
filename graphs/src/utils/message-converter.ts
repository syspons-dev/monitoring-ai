import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import type { MonitoringAiMessage } from '@syspons/monitoring-ai-common';

/**
 * Converts MonitoringAiMessage objects to LangChain BaseMessage instances
 *
 * @param messages - Array of MonitoringAiMessage objects
 * @returns Array of LangChain BaseMessage instances
 *
 * @example
 * ```typescript
 * const apiMessages: MonitoringAiMessage[] = req.body.messages;
 * const langchainMessages = convertToLangChainMessages(apiMessages);
 *
 * await graph.invoke({ messages: langchainMessages });
 * ```
 */
export function convertToLangChainMessages(messages: MonitoringAiMessage[]): BaseMessage[] {
  return messages.map((msg) => {
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

    switch (msg.type) {
      case 'human':
        return new HumanMessage({
          id: msg.id,
          content,
          additional_kwargs: msg.additional_kwargs,
          response_metadata: msg.response_metadata,
        });

      case 'ai':
        return new AIMessage({
          id: msg.id,
          content,
          additional_kwargs: msg.additional_kwargs,
          response_metadata: msg.response_metadata,
        });

      case 'system':
        return new SystemMessage({
          id: msg.id,
          content,
          additional_kwargs: msg.additional_kwargs,
          response_metadata: msg.response_metadata,
        });

      case 'tool':
        return new ToolMessage({
          id: msg.id,
          content,
          tool_call_id: msg.additional_kwargs?.tool_call_id || msg.id,
          additional_kwargs: msg.additional_kwargs,
        });

      default:
        throw new Error(`Unsupported message type: ${msg.type}`);
    }
  });
}

/**
 * Converts LangChain BaseMessage instances to MonitoringAiMessage objects
 *
 * @param messages - Array of LangChain BaseMessage instances
 * @returns Array of MonitoringAiMessage objects
 *
 * @example
 * ```typescript
 * const result = await graph.invoke({ messages: langchainMessages });
 * const apiMessages = convertFromLangChainMessages(result.messages);
 *
 * res.json({ messages: apiMessages });
 * ```
 */
export function convertFromLangChainMessages(messages: BaseMessage[]): MonitoringAiMessage[] {
  return messages.map((msg) => {
    // Use instanceof checks instead of deprecated _getType()
    let msgType: 'human' | 'ai' | 'system' | 'tool';
    if (msg instanceof HumanMessage) {
      msgType = 'human';
    } else if (msg instanceof AIMessage) {
      msgType = 'ai';
    } else if (msg instanceof SystemMessage) {
      msgType = 'system';
    } else if (msg instanceof ToolMessage) {
      msgType = 'tool';
    } else {
      throw new Error(`Unknown message type: ${msg.constructor.name}`);
    }

    return {
      id: msg.id || `msg_${Date.now()}_${Math.random()}`,
      type: msgType,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      author: (msg as any).name,
      additional_kwargs: (msg as any).additional_kwargs,
      response_metadata: (msg as any).response_metadata,
      timestamp: new Date().toISOString(),
    };
  });
}
