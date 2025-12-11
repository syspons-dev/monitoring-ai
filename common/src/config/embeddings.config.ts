import {
  EmbeddingMetadata,
  EmbeddingSearchMethod,
  MonitoringAiEmbeddingProvider,
  SearchStrictness,
} from '../types/embedding.types.js';

/**
 * Supported vector store providers
 */
export enum MonitoringAiVectorStoreProvider {
  chroma = 'chroma',
  pinecone = 'pinecone',
  qdrant = 'qdrant',
  weaviate = 'weaviate',
  milvus = 'milvus',
}

export interface MonitoringAiEmbeddingConfig {
  /** Vector store service to use */
  vectorStoreProvider: MonitoringAiVectorStoreProvider;
  /** URL of the vector store service */
  embeddingStoreUrl: string;
  /** The embedding provider to use */
  provider: MonitoringAiEmbeddingProvider;
  /** Specific model name from the provider */
  embeddingModel: string;
  /** Custom endpoint for the embedding model, if applicable */
  embeddingModelEndpoint: string;
  /** API key for the embedding provider, if required */
  embeddingApiKey?: string;
  /** Search method to use (default: similarity) */
  searchMethod?: EmbeddingSearchMethod;
  /** Search strictness level controlling relevance threshold (uses predefined score thresholds) */
  strictness?: SearchStrictness;
  /** Number of top documents to return */
  maxResults?: number;
  /** Custom minimum similarity score threshold (0-1). Overrides strictness if provided. */
  minScore?: number;
  /** Optional metadata filter (WHERE clause) */
  metadataFilter?: EmbeddingMetadata;
}
