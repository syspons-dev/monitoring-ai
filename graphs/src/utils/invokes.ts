import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import {
  Citation,
  MonitoringAiNodeUsageEntry,
  StructuredDataAttribute,
  StructuredDataAttributeType,
} from '@syspons/monitoring-ai-common';
import { buildZodSchema, addZodAttribute } from './schema.js';
import type { StructuredToolInterface } from '@langchain/core/tools';

import { MonitoringAiPrompt } from './prompts.js';
import { EmbeddingController, TokensController, createRetrieverTool } from '../index.js';

// ============================================================================
// Model Invocation Types
// ============================================================================

/**
 * Base parameters shared by all invocation types
 */
export interface BaseInvokeParams {
  /** The ChatOpenAI model instance to invoke */
  model: ChatOpenAI;
  /** Array of messages to send to the model */
  messages: BaseMessage[];
  /** Optional structured data attributes to apply as schema */
  structuredDataAttributes?: StructuredDataAttribute[];
  /** Optional token controller for usage tracking */
  tokensController: TokensController;
  /** Optional node name for usage tracking */
  nodeName?: string;
  /** Enable debug console logs (default: false) */
  debug?: boolean;
}

/**
 * Parameters for invoking the model with optional structured output
 */
export interface InvokeModelParams extends BaseInvokeParams {}

/**
 * Base result shared by all invocation types
 */
export interface BaseInvokeResult {
  /** The AI response message */
  response: AIMessage;
  /** Structured data extracted from the response (only present when schema provided) */
  structuredData?: Record<string, any>;
  /** Per-node usage tracking entry (only present when nodeName provided) */
  usagePerNode?: MonitoringAiNodeUsageEntry[];
}

/**
 * Result from model invocation
 */
export interface InvokeModelResult extends BaseInvokeResult {}

// ============================================================================
// Model Invocation Functions
// ============================================================================

/**
 * Generic model invocation function with optional structured output support
 *
 * If structuredDataAttributes are provided, the model will be constrained to return
 * data matching the schema. Otherwise, it returns a plain chat response.
 *
 * @param params - Invocation parameters
 * @returns Result containing the AI message and optional structured data
 *
 * @example
 * // With structured output
 * const result = await invokeModel({
 *   model: this.model,
 *   messages: [userMessage],
 *   structuredDataAttributes: schema
 * });
 * console.log(result.structuredData); // { name: "John", date: "1990-03-15" }
 *
 * @example
 * // Plain chat response
 * const result = await invokeModel({
 *   model: this.model,
 *   messages: [userMessage]
 * });
 * console.log(result.response.content); // "Hello! How can I help you?"
 */
export async function invokeModel(params: InvokeModelParams): Promise<InvokeModelResult> {
  const { model, messages, structuredDataAttributes, nodeName, tokensController } = params;

  // Check if we should use structured output
  if (structuredDataAttributes && structuredDataAttributes.length > 0) {
    // Build Zod schema from structured data attributes
    const zodSchema = buildZodSchema(structuredDataAttributes);
    // Always add __message field for additional context
    addZodAttribute(
      zodSchema,
      '__message',
      StructuredDataAttributeType.string,
      'Additional message or explanation from the assistant',
      true
    );
    const defaultAiMessage = 'Structured data response';

    // Use withStructuredOutput to get structured data
    const modelWithStructure = model.withStructuredOutput(zodSchema, { includeRaw: true });
    const result = await modelWithStructure.invoke(messages);

    // Return both structured data and a message representation
    const usageMetadata = (result.raw as AIMessage).usage_metadata;
    return {
      response: new AIMessage(result.parsed.__message ? result.parsed.__message : defaultAiMessage),
      structuredData: result.parsed as Record<string, any>,
      usagePerNode:
        nodeName && usageMetadata
          ? [tokensController.createUsageEntry(nodeName, 'invokeModel', usageMetadata)]
          : undefined,
    };
  }

  // Default behavior: plain model invocation
  const response = await model.invoke(messages);
  const usageMetadata = response.usage_metadata;
  return {
    response: new AIMessage(response),
    usagePerNode:
      nodeName && usageMetadata
        ? [tokensController.createUsageEntry(nodeName, 'invokeModel', usageMetadata)]
        : undefined,
  };
}

// ============================================================================
// Agent Invocation Types
// ============================================================================

/**
 * Parameters for invoking an agent with retriever support
 */
export interface InvokeAgentParams extends BaseInvokeParams {
  /** Optional embedding controller for retriever tool */
  embeddingController?: EmbeddingController;
  /** Optional additional tools to provide to the agent */
  additionalTools?: StructuredToolInterface[];
  /** Optional system prompt to guide agent behavior */
  systemPrompt?: MonitoringAiPrompt;
}

/**
 * Result from agent invocation
 */
export interface InvokeAgentResult extends BaseInvokeResult {
  /** All messages from the agent conversation */
  messages: BaseMessage[];
  /** Citations extracted from retriever tool calls (only present when retriever is used) */
  citations?: Citation[];
}

// ============================================================================
// Agent Invocation Functions
// ============================================================================

/**
 * Generic agent invocation function with optional retriever support.
 *
 * Invokes model with tool binding for RAG (Retrieval-Augmented Generation).
 * If embeddingController is provided, automatically creates a retriever tool with custom options.
 * Uses iterative tool calling pattern for multi-step reasoning.
 *
 * @param params - Agent invocation parameters
 * @returns Result containing all messages and the final response
 *
 * @example
 * // Agent with retriever
 * const result = await invokeAgent({
 *   model: this.model,
 *   messages: [new HumanMessage('What are the key features?')],
 *   embeddingController: controller,
 *   retrieverOptions: {
 *     maxResults: 5,
 *     strictness: SearchStrictness.balanced
 *   },
 *   systemPrompt: 'You are a helpful assistant.'
 * });
 *
 * @example
 * // Agent without retriever (just additional tools)
 * const result = await invokeAgent({
 *   model: this.model,
 *   messages: [new HumanMessage('Calculate 5 + 3')],
 *   additionalTools: [calculatorTool]
 * });
 */
export async function invokeAgent(params: InvokeAgentParams): Promise<InvokeAgentResult> {
  const {
    model,
    messages,
    embeddingController,
    additionalTools = [],
    structuredDataAttributes,
    debug = false,
    tokensController,
    nodeName,
  } = params;
  const systemPrompt = params.systemPrompt?.prompt;

  // ============================================================================
  // Citation Tracking
  // ============================================================================

  const citations: Citation[] = [];
  let citationIdCounter = 0;
  const RETRIEVER_TOOL_NAME = 'search_knowledge_base';
  // Track citations from current iteration to link with next AI message
  let pendingCitations: Citation[] = [];

  // ============================================================================
  // Token Usage Tracking
  // ============================================================================

  const usageEntries: MonitoringAiNodeUsageEntry[] = [];

  // ============================================================================
  // Inner Functions
  // ============================================================================

  /**
   * Track usage metadata from model response
   */
  function trackUsage(response: AIMessage, iteration?: number): void {
    if (nodeName && response.usage_metadata && tokensController) {
      const entry = tokensController.createUsageEntry(
        nodeName,
        'invokeAgent',
        response.usage_metadata,
        iteration
      );
      usageEntries.push(entry);
      if (debug) {
        console.log(
          `[invokeAgent] Tracked usage for ${nodeName}${iteration ? ` iteration ${iteration}` : ''}: ${response.usage_metadata.total_tokens} tokens`
        );
      }
    }
  }

  /**
   * Build message array with optional system prompt
   */
  function buildMessages(systemPrompt: string | undefined, messages: BaseMessage[]): BaseMessage[] {
    return systemPrompt ? [new SystemMessage(systemPrompt), ...messages] : [...messages];
  }

  /**
   * Extract citations from retriever tool result
   * Citations are stored as pending and will be linked to the next AI message
   * Deduplicates based on content and filename to avoid duplicate citations
   */
  function extractCitations(toolName: string, toolResult: any, iteration: number): void {
    // Only process retriever tool calls
    if (toolName !== RETRIEVER_TOOL_NAME) {
      return;
    }

    try {
      // Parse the JSON response from retriever tool
      const docs = typeof toolResult === 'string' ? JSON.parse(toolResult) : toolResult;

      // Add each retrieved document as a pending citation (with deduplication)
      if (Array.isArray(docs)) {
        for (const doc of docs) {
          // Check if citation already exists globally (by content and filename)
          const exists = citations.some(
            (c) => c.content === doc.content && c.metadata.filename === doc.metadata?.filename
          );

          if (!exists) {
            const citation: Citation = {
              id: citationIdCounter++,
              content: doc.content,
              metadata: doc.metadata || {},
              usedInIteration: iteration,
              // usedByMessageId will be set when the next AI message is created
            };

            // Store as pending to be linked with next AI message
            pendingCitations.push(citation);
            citations.push(citation);

            if (debug) {
              console.log(
                `[invokeAgent] Added pending citation #${citation.id}: ${doc.metadata?.filename || 'unknown'}`
              );
            }
          }
        }
      }
    } catch (error) {
      // Ignore parse errors (might be error message string from retriever)
      if (debug) {
        console.warn('[invokeAgent] Failed to parse citations from tool result:', error);
      }
    }
  }

  /**
   * Link pending citations to the AI message that used them
   */
  function linkPendingCitations(messageId: string): void {
    if (pendingCitations.length > 0) {
      for (const citation of pendingCitations) {
        citation.usedByMessageId = messageId;
      }

      if (debug) {
        console.log(
          `[invokeAgent] Linked ${pendingCitations.length} citations to message ${messageId}`
        );
      }

      // Clear pending citations
      pendingCitations = [];
    }
  }

  /**
   * Extract structured data from messages using schema
   */
  async function extractStructuredData(
    model: ChatOpenAI,
    messages: BaseMessage[],
    attributes: StructuredDataAttribute[]
  ): Promise<Record<string, any>> {
    const zodSchema = buildZodSchema(attributes);
    const modelWithStructure = model.withStructuredOutput(zodSchema);
    return (await modelWithStructure.invoke(messages)) as Record<string, any>;
  }

  /**
   * Create result with optional structured data extraction
   */
  async function createResult(
    allMessages: BaseMessage[],
    response: BaseMessage,
    excludeSystemMessage: boolean
  ): Promise<InvokeAgentResult> {
    const outputMessages = excludeSystemMessage ? allMessages.slice(1) : allMessages;

    if (structuredDataAttributes && structuredDataAttributes.length > 0) {
      const structuredData = await extractStructuredData(
        model,
        allMessages,
        structuredDataAttributes
      );

      return {
        messages: outputMessages,
        response: new AIMessage(JSON.stringify(structuredData, null, 2)),
        structuredData,
        citations: citations.length > 0 ? citations : undefined,
        usagePerNode: usageEntries.length > 0 ? usageEntries : undefined,
      };
    }

    return {
      messages: outputMessages,
      response: new AIMessage(response),
      citations: citations.length > 0 ? citations : undefined,
      usagePerNode: usageEntries.length > 0 ? usageEntries : undefined,
    };
  }

  /**
   * Handle tool call execution
   */
  async function executeToolCall(
    toolCall: any,
    tools: StructuredToolInterface[],
    messages: BaseMessage[],
    iteration: number
  ): Promise<void> {
    const tool = tools.find((t) => t.name === toolCall.name);

    if (!tool) {
      messages.push({
        role: 'tool',
        content: `Error: Tool '${toolCall.name}' not found`,
        tool_call_id: toolCall.id,
      } as any);
      return;
    }

    try {
      const toolResult = await tool.invoke(toolCall.args);

      // Extract citations if this is the retriever tool
      extractCitations(toolCall.name, toolResult, iteration);

      messages.push({
        role: 'tool',
        content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
        tool_call_id: toolCall.id,
        name: toolCall.name,
      } as any);
    } catch (error) {
      messages.push({
        role: 'tool',
        content: `Error executing tool: ${error instanceof Error ? error.message : String(error)}`,
        tool_call_id: toolCall.id,
      } as any);
    }
  }

  // ============================================================================
  // Main Logic
  // ============================================================================

  // Build tools array
  const tools: StructuredToolInterface[] = [...additionalTools];
  if (embeddingController) {
    const retrieverTool = await createRetrieverTool({
      controller: embeddingController,
      debug,
    });
    tools.push(retrieverTool);
  }

  // Build message history
  const allMessages = buildMessages(systemPrompt, messages);

  // If no tools, invoke model directly
  if (tools.length === 0) {
    if (structuredDataAttributes && structuredDataAttributes.length > 0) {
      const structuredData = await extractStructuredData(
        model,
        allMessages,
        structuredDataAttributes
      );

      return {
        messages: [new AIMessage(JSON.stringify(structuredData, null, 2))],
        response: new AIMessage(JSON.stringify(structuredData, null, 2)),
        structuredData,
        citations: undefined, // No tools means no citations
        usagePerNode: usageEntries.length > 0 ? usageEntries : undefined,
      };
    }

    const response = await model.invoke(allMessages);
    trackUsage(response);
    return {
      messages: [response],
      response: new AIMessage(response),
      citations: undefined, // No tools means no citations
      usagePerNode: usageEntries.length > 0 ? usageEntries : undefined,
    };
  }

  // Bind tools to model and run iterative tool calling loop
  const modelWithTools = model.bindTools(tools);
  const maxIterations = 5;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    // Invoke model with tools
    const response = await modelWithTools.invoke(allMessages);
    trackUsage(response, iteration);
    allMessages.push(response);

    // Check if model wants to use tools
    if (!response.tool_calls || response.tool_calls.length === 0) {
      // No more tool calls, link any pending citations to this final message
      if (response.id) {
        linkPendingCitations(response.id);
      }
      return createResult(allMessages, response, !!systemPrompt);
    }

    // Execute all tool calls (this may add pending citations)
    for (const toolCall of response.tool_calls) {
      await executeToolCall(toolCall, tools, allMessages, iteration);
    }

    // After tool execution, the next AI message will use any citations that were just extracted
    // We'll link them after the next model invocation
  }

  // Max iterations reached, link any pending citations to the last message
  const finalMessage = allMessages[allMessages.length - 1];
  if (finalMessage.id) {
    linkPendingCitations(finalMessage.id);
  }
  return createResult(allMessages, finalMessage, !!systemPrompt);
}
