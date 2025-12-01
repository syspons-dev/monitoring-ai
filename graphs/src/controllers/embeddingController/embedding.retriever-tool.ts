import { DynamicStructuredTool } from '@langchain/core/tools';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { EmbeddingController } from './embedding.controller.js';

/**
 * Options for creating the retriever tool
 */
export interface CreateRetrieverToolOptions {
  /** The embedding controller instance */
  controller: EmbeddingController;
  /** Enable debug console logs */
  debug?: boolean;
}

/**
 * Creates a LangChain tool for searching the knowledge base using the EmbeddingController.
 *
 * This tool provides intelligent search functionality with helpful error messages when:
 * - No documents are found due to strictness filtering
 * - The knowledge base is empty
 * - Search errors occur
 *
 * @param options - Configuration options for the tool
 * @returns A LangChain StructuredTool that can be used with agents
 *
 * @example
 * ```typescript
 * const tool = await createRetrieverTool({
 *   controller: embeddingController,
 *   debug: true
 * });
 *
 * // Use with agent
 * const agent = await invokeAgent({
 *   model,
 *   messages,
 *   additionalTools: [tool]
 * });
 * ```
 */
export async function createRetrieverTool(
  options: CreateRetrieverToolOptions
): Promise<StructuredToolInterface> {
  const { controller, debug = false } = options;

  const retriever = controller.getRetriever();
  const retrieverOptions = controller.getRetrieverOptions();

  // Log collection info for debugging
  const docCount = await controller.getDocumentCount();
  if (debug) {
    console.log(
      `[createRetrieverTool] Collection "${controller.getCollectionName()}" has ${docCount} documents`
    );
  }

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
      if (debug) {
        console.log(`[createRetrieverTool] Retriever tool called with query: "${query}"`);
      }

      try {
        // Check collection state before query
        const totalDocs = await controller.getDocumentCount();
        if (debug) {
          console.log(
            `[createRetrieverTool] Collection has ${totalDocs} total documents before query`
          );
        }

        if (totalDocs === 0) {
          if (debug) {
            console.error(`[createRetrieverTool] Collection is EMPTY! No documents to search.`);
          }
          return `The knowledge base is currently empty. No documents have been uploaded yet. Please add documents to the knowledge base before attempting to search.`;
        }

        const docs = await retriever._getRelevantDocuments(query);
        if (debug) {
          console.log(`[createRetrieverTool] Retriever found ${docs.length} documents`);
        }

        if (docs.length === 0) {
          if (debug) {
            console.warn(
              `[createRetrieverTool] Query returned no results despite ${totalDocs} documents existing`
            );
            console.warn(`[createRetrieverTool] Collection: ${controller.getCollectionName()}`);
            console.warn(`[createRetrieverTool] Server: ${controller.getServerUrl()}`);
            console.warn(`[createRetrieverTool] This might indicate:
              1. Query doesn't match document content
              2. Embeddings model mismatch
              3. Score threshold too strict`);
          }

          // Get sample documents to help the model provide recommendations
          const allDocs = await controller.getDocuments(
            (await (await controller['vectorStore']!.ensureCollection()).get({ limit: 10 })).ids ||
              []
          );

          const documentList = allDocs
            .map((doc) => {
              const filename = doc.metadata?.filename || 'Unknown';
              const type = doc.metadata?.documentType || 'document';
              return `- ${filename} (${type})`;
            })
            .slice(0, 10)
            .join('\n');

          // Get current strictness settings
          const strictnessInfo = retrieverOptions?.strictness
            ? `Current search strictness: "${retrieverOptions.strictness}" (minimum score: ${retrieverOptions.minScore ?? 'default'})`
            : 'Current search strictness: default settings';

          return `SEARCH FAILED - No documents matched your query "${query}" due to strict relevance filtering. 

${strictnessInfo}

The knowledge base contains ${totalDocs} documents that may be relevant, but none met the current similarity score threshold.

Available documents in the knowledge base:
${documentList}

IMPORTANT: You CANNOT change the search strictness settings - only the user can do that. 

Inform the user that:
- The search strictness is currently set to "${retrieverOptions?.strictness || 'default'}" which filters out low-scoring results
- They need to MANUALLY lower the strictness to "relaxed" or "all_results" in their configuration to retrieve more documents
- Alternatively, they can be more specific about which document they want (e.g., "summarize <document name>.<extension>")
- Or try a different search query with specific keywords from the document names above

Make it clear to the user that THEY must change the strictness setting - you cannot do it for them.`;
        }

        return JSON.stringify(
          docs.map((doc) => ({
            content: doc.pageContent,
            metadata: doc.metadata,
          }))
        );
      } catch (error) {
        if (debug) {
          console.error(`[createRetrieverTool] Retriever error:`, error);
        }
        return `An error occurred while searching the knowledge base: ${error instanceof Error ? error.message : String(error)}. Please try again or contact support if the issue persists.`;
      }
    },
  });

  if (debug) {
    console.log(`[createRetrieverTool] Retriever tool created successfully`);
  }

  return retrieverTool;
}
