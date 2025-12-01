/**
 * Base message interface - compatible with LangGraph's BaseMessage
 * This allows clients to use the type without requiring @langchain/core
 */
export interface MonitoringAiMessage {
  id: string;
  // Role of the message sender: 'ai', 'human', 'tool', or 'system'
  type: AiMessageType;
  // Content of the message
  content: string;
  // Name of the message sender (optional)
  author?: string;
  // Additional keyword arguments
  additional_kwargs?: Record<string, any>;
  // Metadata related to the message
  response_metadata?: Record<string, any>;
  // Timestamp of the message (optional)
  timestamp?: Date | string;
  // Chat Extensions context (optional)
  context?: ChatExtensionsMessageContextOutput[];
}

export type AiMessageType = 'ai' | 'human' | 'tool' | 'system';

// Copy of Azure types since import wont work in current ts settings

export interface ChatExtensionsMessageContextOutput {
  /**
   * The contextual information associated with the Azure chat extensions used for a chat completions request.
   * These messages describe the data source retrievals, plugin invocations, and other intermediate steps taken in the
   * course of generating a chat completions response that was augmented by capabilities from Azure OpenAI chat
   * extensions.
   */
  citations?: ChatExtensionDataSourceResponseCitationOutput[];
  /** The detected intent from the chat history, used to pass to the next turn to carry over the context. */
  intent?: string;
}

/**
 * A single instance of additional context information available when Azure OpenAI chat extensions are involved
 * in the generation of a corresponding chat completions response. This context information is only populated when
 * using an Azure OpenAI request configured to use a matching extension.
 */
export interface ChatExtensionDataSourceResponseCitationOutput {
  /** The content of the citation. */
  content: string;
  /** The title of the citation. */
  title?: string;
  /** The URL of the citation. */
  url?: string;
  /** The file path of the citation. */
  filepath?: string;
  /** The chunk ID of the citation. */
  chunk_id?: string;
}
