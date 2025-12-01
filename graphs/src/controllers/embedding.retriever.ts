import { BaseRetriever } from '@langchain/core/retrievers';
import { CallbackManagerForRetrieverRun } from '@langchain/core/callbacks/manager';
import { Document } from '@langchain/core/documents';
import { MonitoringAiEmbeddingQueryOptions } from '@syspons/monitoring-ai-common';
import type { EmbeddingController } from './embedding.controller.js';

/**
 * Custom retriever that wraps EmbeddingController's queryDocuments method.
 * Compatible with LangChain chains and agents, preserving custom features like
 * strictness levels, metadata filtering, and custom search methods.
 */
export class EmbeddingRetriever extends BaseRetriever {
  lc_namespace = ['monitoring-ai', 'retrievers'];

  private controller: EmbeddingController;

  constructor(controller: EmbeddingController) {
    super();
    this.controller = controller;
  }

  async _getRelevantDocuments(
    query: string,
    _runManager?: CallbackManagerForRetrieverRun
  ): Promise<Document[]> {
    // Use the controller's queryDocuments method
    const results = await this.controller.queryDocuments(query);

    // Convert EmbeddingQueryResult[] to LangChain Document[]
    return results.map(
      (result) =>
        new Document({
          pageContent: result.content,
          metadata: {
            ...result.metadata,
            score: result.score,
          },
        })
    );
  }
}
