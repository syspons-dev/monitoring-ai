/**
 * Supported embedding providers
 */
export enum MonitoringAiEmbeddingProvider {
  open_ai = 'open_ai',
  azure_openai = 'azure_openai',
  cohere = 'cohere',
  google_genai = 'google_genai',
  google_vertex = 'google_vertex',
  huggingface = 'huggingface',
  ollama = 'ollama',
  mistral = 'mistral',
  voyage = 'voyage',
  bedrock = 'bedrock',
  custom = 'custom',
}

/**
 * Search methods supported by ChromaDB for querying embeddings
 */
export enum EmbeddingSearchMethod {
  similarity = 'similarity',
  cosine = 'cosine',
  l2 = 'l2',
  ip = 'ip',
  filtered_similarity = 'filtered_similarity',
  hybrid = 'hybrid',
}

/**
 * Search strictness levels for controlling result relevance thresholds
 */
export enum SearchStrictness {
  all_results = 'all_results',
  relaxed = 'relaxed',
  balanced = 'balanced',
  strict = 'strict',
}

/**
 * Strictness level configurations with score thresholds
 */
export interface SearchStrictnessInfo {
  /** The strictness level identifier */
  level: SearchStrictness;
  /** Display name */
  name: string;
  /** Description of this strictness level */
  description: string;
  /** Minimum similarity score threshold (0-1) */
  minScore: number;
}

/**
 * Registry of strictness levels with their score thresholds
 */
export const SEARCH_STRICTNESS_LEVELS: Record<SearchStrictness, SearchStrictnessInfo> = {
  [SearchStrictness.all_results]: {
    level: SearchStrictness.all_results,
    name: 'All Results',
    description:
      "No score filtering. Returns all results regardless of similarity. Ideal for summarization, context gathering, or tasks that don't require data extraction.",
    minScore: 0,
  },
  [SearchStrictness.relaxed]: {
    level: SearchStrictness.relaxed,
    name: 'Relaxed',
    description:
      'Returns more results with lower similarity thresholds. Good for exploratory searches.',
    minScore: 0.5,
  },
  [SearchStrictness.balanced]: {
    level: SearchStrictness.balanced,
    name: 'Balanced',
    description:
      'Balanced approach with moderate similarity requirements. Recommended for most use cases.',
    minScore: 0.7,
  },
  [SearchStrictness.strict]: {
    level: SearchStrictness.strict,
    name: 'Strict',
    description:
      'Only returns highly relevant results with strong similarity. Best for precision-critical searches.',
    minScore: 0.85,
  },
};

/**
 * Metadata type compatible with ChromaDB
 */
export type EmbeddingMetadata = {
  filename?: string | number | boolean | string[];
  [key: string]: string | number | boolean | string[] | undefined;
};

/**
 * Behavior when duplicate documents are detected
 */
export enum DuplicateHandling {
  /** Skip adding duplicate documents */
  skip = 'skip',
  /** Replace existing documents with new ones */
  replace = 'replace',
  /** Throw an error if duplicates are found */
  error = 'error',
  /** Allow duplicates (no checking) */
  allow = 'allow',
}

/**
 * Supported document types for parsing and vectorization
 */
export enum MonitoringAiDocumentType {
  pdf = 'pdf',
  docx = 'docx',
  xlsx = 'xlsx',
  csv = 'csv',
  txt = 'txt',
  md = 'md',
  json = 'json',
  html = 'html',
}

/**
 * Document file input for processing
 */
export interface DocumentFileInput {
  /** File buffer, local file path, or URL */
  source: Buffer | string;
  /** Document type */
  type: MonitoringAiDocumentType;
  /** Optional custom metadata to attach */
  metadata?: EmbeddingMetadata;
  /** Optional custom ID prefix */
  idPrefix?: string;
  /** Optional filename for duplicate detection (will use hash of content if not provided) */
  filename?: string;
}

/**
 * Options for adding documents from files
 */
export interface AddDocumentsFromFilesOptions {
  /** Text chunking configuration */
  chunkingOptions?: ChunkingOptions;
  /** How to handle duplicate documents (default: skip) */
  duplicateHandling?: DuplicateHandling;
}

/**
 * Text chunking strategy
 */
export enum ChunkingStrategy {
  /** Fixed character size chunks */
  fixed = 'fixed',
  /** Chunk by sentences */
  sentence = 'sentence',
  /** Chunk by paragraphs */
  paragraph = 'paragraph',
  /** Recursive chunking with overlap */
  recursive = 'recursive',
}

/**
 * Text chunking options
 */
export interface ChunkingOptions {
  /** Chunking strategy to use */
  strategy?: ChunkingStrategy;
  /** Maximum chunk size in characters (default: 1000) */
  chunkSize?: number;
  /** Overlap between chunks in characters (default: 200) */
  chunkOverlap?: number;
  /** Separators for splitting (used with recursive strategy) */
  separators?: string[];
}

/**
 * Query options for searching documents in vector store
 */
export interface MonitoringAiEmbeddingQueryOptions {
  /** The search query text */
  query: string;
  /** Maximum number of documents to retrieve (default: 4) */
  maxResults?: number;
  /** Search method to use (default: similarity) */
  searchMethod?: EmbeddingSearchMethod;
  /** Optional metadata filter (WHERE clause) */
  metadataFilter?: EmbeddingMetadata;
  /** Search strictness level controlling relevance threshold (uses predefined score thresholds) */
  strictness?: SearchStrictness;
  /** Custom minimum similarity score threshold (0-1). Overrides strictness if provided. */
  minScore?: number;
}

/**
 * Result structure for similarity search queries
 */
export interface EmbeddingQueryResult {
  /** The matched document content */
  content: string;
  /** Document metadata */
  metadata: EmbeddingMetadata;
  /** Similarity score (0-1, higher is better) */
  score?: number;
}

/**
 * Information about a search method
 */
export interface SearchMethodInfo {
  /** The search method identifier */
  method: EmbeddingSearchMethod;
  /** Display name of the search method */
  name: string;
  /** Description of what this search method does */
  description: string;
  /** Use cases where this method is most effective */
  bestFor: string[];
}

/**
 * Registry of all supported search methods with their descriptions
 */
export const SEARCH_METHODS: Record<EmbeddingSearchMethod, SearchMethodInfo> = {
  [EmbeddingSearchMethod.similarity]: {
    method: EmbeddingSearchMethod.similarity,
    name: 'Similarity Search',
    description:
      'Semantic similarity search using vector embeddings (default). Finds documents most similar to the query text based on embedding distance.',
    bestFor: [
      'General purpose semantic search',
      'Finding conceptually similar content',
      'Most common and reliable method',
    ],
  },
  [EmbeddingSearchMethod.cosine]: {
    method: EmbeddingSearchMethod.cosine,
    name: 'Cosine Similarity',
    description:
      'Measures similarity based on the cosine of the angle between vectors. Better for comparing document directions regardless of magnitude.',
    bestFor: [
      'Text classification',
      'Document clustering',
      'When vector magnitude is not important',
    ],
  },
  [EmbeddingSearchMethod.l2]: {
    method: EmbeddingSearchMethod.l2,
    name: 'Euclidean Distance (L2)',
    description:
      'Measures straight-line distance between vectors in embedding space. Sensitive to vector magnitude.',
    bestFor: [
      'Exact similarity matching',
      'When magnitude matters',
      'Image or structured data embeddings',
    ],
  },
  [EmbeddingSearchMethod.ip]: {
    method: EmbeddingSearchMethod.ip,
    name: 'Inner Product (Dot Product)',
    description:
      'Measures similarity based on the dot product of vectors. Fast computation but sensitive to vector norms.',
    bestFor: [
      'Performance-critical applications',
      'Normalized embeddings',
      'Recommendation systems',
    ],
  },
  [EmbeddingSearchMethod.filtered_similarity]: {
    method: EmbeddingSearchMethod.filtered_similarity,
    name: 'Filtered Similarity Search',
    description:
      'Combines vector similarity with metadata-based filtering. Allows searching within specific document categories or attributes.',
    bestFor: [
      'Searching within specific categories',
      'Multi-tenant applications',
      'Time-range or attribute-based filtering',
    ],
  },
  [EmbeddingSearchMethod.hybrid]: {
    method: EmbeddingSearchMethod.hybrid,
    name: 'Hybrid Search',
    description:
      'Combines multiple search strategies including keyword and semantic search for comprehensive results.',
    bestFor: [
      'Complex queries requiring multiple approaches',
      'Balancing precision and recall',
      'When keyword and semantic search complement each other',
    ],
  },
};

/**
 * Information about an embedding provider
 */
export interface EmbeddingProviderInfo {
  /** The provider identifier */
  provider: MonitoringAiEmbeddingProvider;
  /** Display name of the provider */
  name: string;
  /** Available model names */
  models: string[];
  /** NPM package required for this provider */
  package: string;
  /** Whether this provider requires an API key */
  requiresApiKey: boolean;
  /** Whether this provider supports local deployment */
  supportsLocalDeployment: boolean;
  /** Whether the client should show manual model name input field */
  allowCustomModelName: boolean;
}

/**
 * Registry of all supported embedding providers with their configurations
 */
export const EMBEDDING_PROVIDERS: Record<MonitoringAiEmbeddingProvider, EmbeddingProviderInfo> = {
  [MonitoringAiEmbeddingProvider.open_ai]: {
    provider: MonitoringAiEmbeddingProvider.open_ai,
    name: 'OpenAI',
    models: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'],
    package: '@langchain/openai',
    requiresApiKey: true,
    supportsLocalDeployment: false,
    allowCustomModelName: false,
  },
  [MonitoringAiEmbeddingProvider.azure_openai]: {
    provider: MonitoringAiEmbeddingProvider.azure_openai,
    name: 'Azure OpenAI',
    models: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'],
    package: '@langchain/openai',
    requiresApiKey: true,
    supportsLocalDeployment: false,
    allowCustomModelName: false,
  },
  [MonitoringAiEmbeddingProvider.cohere]: {
    provider: MonitoringAiEmbeddingProvider.cohere,
    name: 'Cohere',
    models: ['embed-english-v3.0', 'embed-multilingual-v3.0', 'embed-english-light-v3.0'],
    package: '@langchain/cohere',
    requiresApiKey: true,
    supportsLocalDeployment: false,
    allowCustomModelName: false,
  },
  [MonitoringAiEmbeddingProvider.google_genai]: {
    provider: MonitoringAiEmbeddingProvider.google_genai,
    name: 'Google Generative AI',
    models: ['text-embedding-004', 'embedding-001'],
    package: '@langchain/google-genai',
    requiresApiKey: true,
    supportsLocalDeployment: false,
    allowCustomModelName: false,
  },
  [MonitoringAiEmbeddingProvider.google_vertex]: {
    provider: MonitoringAiEmbeddingProvider.google_vertex,
    name: 'Google Vertex AI',
    models: ['textembedding-gecko', 'textembedding-gecko-multilingual'],
    package: '@langchain/google-vertexai',
    requiresApiKey: true,
    supportsLocalDeployment: false,
    allowCustomModelName: false,
  },
  [MonitoringAiEmbeddingProvider.huggingface]: {
    provider: MonitoringAiEmbeddingProvider.huggingface,
    name: 'HuggingFace',
    models: [
      'sentence-transformers/all-MiniLM-L6-v2',
      'sentence-transformers/all-mpnet-base-v2',
      'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
    ],
    package: '@langchain/community',
    requiresApiKey: true,
    supportsLocalDeployment: false,
    allowCustomModelName: false,
  },
  [MonitoringAiEmbeddingProvider.ollama]: {
    provider: MonitoringAiEmbeddingProvider.ollama,
    name: 'Ollama',
    models: ['llama2', 'mistral', 'nomic-embed-text', 'mxbai-embed-large'],
    package: '@langchain/ollama',
    requiresApiKey: false,
    supportsLocalDeployment: true,
    allowCustomModelName: true,
  },
  [MonitoringAiEmbeddingProvider.mistral]: {
    provider: MonitoringAiEmbeddingProvider.mistral,
    name: 'Mistral AI',
    models: ['mistral-embed'],
    package: '@langchain/mistralai',
    requiresApiKey: true,
    supportsLocalDeployment: false,
    allowCustomModelName: false,
  },
  [MonitoringAiEmbeddingProvider.voyage]: {
    provider: MonitoringAiEmbeddingProvider.voyage,
    name: 'Voyage AI',
    models: ['voyage-2', 'voyage-code-2', 'voyage-large-2'],
    package: '@langchain/community',
    requiresApiKey: true,
    supportsLocalDeployment: false,
    allowCustomModelName: false,
  },
  [MonitoringAiEmbeddingProvider.bedrock]: {
    provider: MonitoringAiEmbeddingProvider.bedrock,
    name: 'Amazon Bedrock',
    models: ['amazon.titan-embed-text-v1', 'amazon.titan-embed-text-v2'],
    package: '@langchain/aws',
    requiresApiKey: true,
    supportsLocalDeployment: false,
    allowCustomModelName: false,
  },
  [MonitoringAiEmbeddingProvider.custom]: {
    provider: MonitoringAiEmbeddingProvider.custom,
    name: 'Custom / Manual',
    models: [],
    package: '@langchain/openai',
    requiresApiKey: true,
    supportsLocalDeployment: true,
    allowCustomModelName: true,
  },
};
