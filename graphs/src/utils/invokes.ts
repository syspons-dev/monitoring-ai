import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  StructuredDataAttribute,
  MonitoringAiEmbeddingQueryOptions,
} from '@syspons/monitoring-ai-common';
import { buildZodSchema } from './schema.js';
import { DynamicStructuredTool } from '@langchain/core/tools';
import type { EmbeddingController } from '../controllers/embedding.controller.js';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { MonitoringAiPrompt } from './prompts.js';

// ============================================================================
// Model Invocation Types
// ============================================================================

/**
 * Parameters for invoking the model with optional structured output
 */
export interface InvokeModelParams {
  /** The ChatOpenAI model instance to invoke */
  model: ChatOpenAI;
  /** Array of messages to send to the model */
  messages: BaseMessage[];
  /** Optional structured data attributes to apply as schema */
  structuredDataAttributes?: StructuredDataAttribute[];
}

/**
 * Result from model invocation
 */
export interface InvokeModelResult {
  /** The AI response message */
  response: AIMessage;
  /** Structured data extracted from the response (only present when schema provided) */
  structuredData?: Record<string, any>;
}

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
  const { model, messages, structuredDataAttributes } = params;

  // Check if we should use structured output
  if (structuredDataAttributes && structuredDataAttributes.length > 0) {
    // Build Zod schema from structured data attributes
    const zodSchema = buildZodSchema(structuredDataAttributes);

    // Use withStructuredOutput to get structured data
    const modelWithStructure = model.withStructuredOutput(zodSchema);
    const structuredData = await modelWithStructure.invoke(messages);

    // Return both structured data and a message representation
    return {
      response: new AIMessage(JSON.stringify(structuredData, null, 2)),
      structuredData: structuredData as Record<string, any>,
    };
  }

  // Default behavior: plain model invocation
  const response = await model.invoke(messages);
  return {
    response: new AIMessage(response),
  };
}

// ============================================================================
// Agent Invocation Types
// ============================================================================

/**
 * Parameters for invoking an agent with retriever support
 */
export interface InvokeAgentParams {
  /** The ChatOpenAI model instance to use */
  model: ChatOpenAI;
  /** Array of messages to send to the agent */
  messages: BaseMessage[];
  /** Optional embedding controller for retriever tool */
  embeddingController?: EmbeddingController;
  /** Optional additional tools to provide to the agent */
  additionalTools?: StructuredToolInterface[];
  /** Optional system prompt to guide agent behavior */
  systemPrompt?: MonitoringAiPrompt;
  /** Optional structured data attributes to apply as schema */
  structuredDataAttributes?: StructuredDataAttribute[];
}

/**
 * Result from agent invocation
 */
export interface InvokeAgentResult {
  /** All messages from the agent conversation */
  messages: BaseMessage[];
  /** The final AI response message */
  response: AIMessage;
  /** Structured data extracted from the response (only present when schema provided) */
  structuredData?: Record<string, any>;
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
  } = params;
  const systemPrompt = params.systemPrompt?.prompt;

  // ============================================================================
  // Inner Functions
  // ============================================================================

  /**
   * Create retriever tool from embedding controller
   */
  async function createRetrieverTool(
    controller: EmbeddingController
  ): Promise<StructuredToolInterface> {
    const retriever = controller.getRetriever();

    // Log collection info for debugging
    const docCount = await controller.getDocumentCount();
    console.log(
      `[invokeAgent] Collection "${controller.getCollectionName()}" has ${docCount} documents`
    );

    const retrieverTool = new DynamicStructuredTool({
      name: 'search_knowledge_base',
      description:
        'Search the knowledge base for relevant information from uploaded documents and files. Use this when the user asks about specific content, names, details, or information that might be stored in documents.',
      schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find relevant documents',
          },
        },
        required: ['query'],
      } as any,
      func: async ({ query }: { query: string }) => {
        console.log(`[invokeAgent] Retriever tool called with query: "${query}"`);
        try {
          const docs = await retriever._getRelevantDocuments(query);
          console.log(`[invokeAgent] Retriever found ${docs.length} documents`);

          if (docs.length === 0) {
            console.warn(`[invokeAgent] No documents found! Check:
              - Collection name: ${controller.getCollectionName()}
              - ChromaDB URL: ${controller.getServerUrl()}
              - Documents added to collection`);
          }

          return JSON.stringify(
            docs.map((doc) => ({
              content: doc.pageContent,
              metadata: doc.metadata,
            }))
          );
        } catch (error) {
          console.error(`[invokeAgent] Retriever error:`, error);
          throw error;
        }
      },
    });

    console.log(`[invokeAgent] Added retriever tool to available tools`);
    return retrieverTool;
  }

  /**
   * Build message array with optional system prompt
   */
  function buildMessages(systemPrompt: string | undefined, messages: BaseMessage[]): BaseMessage[] {
    return systemPrompt ? [new SystemMessage(systemPrompt), ...messages] : [...messages];
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
      const structuredData = await extractStructuredData(model, allMessages, structuredDataAttributes);

      return {
        messages: outputMessages,
        response: new AIMessage(JSON.stringify(structuredData, null, 2)),
        structuredData,
      };
    }

    return {
      messages: outputMessages,
      response: new AIMessage(response),
    };
  }

  /**
   * Handle tool call execution
   */
  async function executeToolCall(
    toolCall: any,
    tools: StructuredToolInterface[],
    messages: BaseMessage[]
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
    const retrieverTool = await createRetrieverTool(embeddingController);
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
      };
    }

    const response = await model.invoke(allMessages);
    return {
      messages: [response],
      response: new AIMessage(response),
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
    allMessages.push(response);

    // Check if model wants to use tools
    if (!response.tool_calls || response.tool_calls.length === 0) {
      // No more tool calls, we're done
      return createResult(allMessages, response, !!systemPrompt);
    }

    // Execute all tool calls
    for (const toolCall of response.tool_calls) {
      await executeToolCall(toolCall, tools, allMessages);
    }
  }

  // Max iterations reached, return what we have
  const finalMessage = allMessages[allMessages.length - 1];
  return createResult(allMessages, finalMessage, !!systemPrompt);
}
