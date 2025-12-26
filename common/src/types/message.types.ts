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
  // Citations from retriever tool during RAG operations (optional)
  citations?: Citation[];
}

export type AiMessageType = 'ai' | 'human' | 'tool' | 'system';

/**
 * Citation extracted from retriever tool during RAG operations
 */
export interface Citation {
  /** Unique identifier for this citation */
  id: number;
  /** The actual text content retrieved from the document */
  content: string;
  /** Metadata about the source document */
  metadata: {
    /** Source filename if available */
    filename?: string;
    /** Document type (pdf, txt, etc.) */
    documentType?: string;
    /** Page number in the source document */
    pageNumber?: number;
    /** Chunk index within the document */
    chunkIndex?: number;
    /** Original document/chunk ID */
    sourceId?: string;
    /** Additional metadata from the vector store */
    [key: string]: any;
  };
  /** Which iteration of the agent loop this citation was retrieved in */
  usedInIteration?: number;
  /** ID of the AI message that used this citation in its response */
  usedByMessageId?: string;
}
