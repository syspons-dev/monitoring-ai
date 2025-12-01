import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Embeddings } from '@langchain/core/embeddings';
import { Document } from '@langchain/core/documents';
import {
  EmbeddingSearchMethod,
  SEARCH_STRICTNESS_LEVELS,
  MonitoringAiEmbeddingQueryOptions,
  EmbeddingQueryResult,
  EmbeddingMetadata,
  DocumentFileInput,
  DuplicateHandling,
  AddDocumentsFromFilesOptions,
} from '@syspons/monitoring-ai-common';

import { parseDocument } from './utils/document-loaders.js';
import { chunkText } from './utils/text-chunking.js';
import { generateDocumentHash } from './utils/document-hash.js';
import { EmbeddingRetriever } from './embedding.retriever.js';

/**
 * Configuration options for the EmbeddingController
 */
export interface EmbeddingConfig {
  /**
   * URL of the Chroma server (default: http://localhost:8000)
   * Note: To use local storage, run a Chroma server with: npx chroma run --path ./your-data-path
   */
  chromaServerUrl?: string;
  /** Name of the collection to create or use */
  collectionName: string;
  /** Embedding model to use for generating vectors */
  embeddingModel: Embeddings;
  /** Optional collection metadata */
  collectionMetadata?: EmbeddingMetadata;
  /** Optional default query options for searches */
  retrieverOptions?: MonitoringAiEmbeddingQueryOptions;
}

/**
 * Document structure for adding to the vector store
 */
export interface EmbeddingDocument {
  /** The text content to embed */
  content: string;
  /** Optional metadata associated with the document */
  metadata?: EmbeddingMetadata;
  /** Optional unique identifier for the document */
  id?: string;
}

/**
 * Controller for managing embeddings using Chroma vector store.
 * Requires a running Chroma server. For local persistence, run:
 * `npx chroma run --path ./your-data-path`
 *
 * Provides methods for adding, querying, and managing vector documents.
 * Supports multiple search methods including similarity, cosine, L2, and filtered searches.
 * Can parse and vectorize documents from various file formats (PDF, DOCX, XLSX, CSV, etc.).
 *
 * @example
 * ```ts
 * import { DocumentType, ChunkingStrategy } from '@syspons/monitoring-ai-common';
 *
 * const controller = new EmbeddingController();
 * await controller.initialize({
 *   chromaServerUrl: 'http://localhost:8000',
 *   collectionName: 'my-docs',
 *   embeddingModel: new AzureOpenAIEmbeddings()
 * });
 *
 * // Add text documents
 * await controller.addDocuments([
 *   { content: 'Hello world', metadata: { type: 'greeting' } }
 * ]);
 *
 * // Add documents from files with duplicate detection
 * const pdfBuffer = await readFile('./document.pdf');
 * const result = await controller.addDocumentsFromFiles(
 *   [
 *     {
 *       source: pdfBuffer,
 *       type: DocumentType.pdf,
 *       metadata: { category: 'manual', author: 'John' },
 *       idPrefix: 'manual',
 *       filename: 'user-manual.pdf'
 *     }
 *   ],
 *   {
 *     chunkingOptions: {
 *       strategy: ChunkingStrategy.recursive,
 *       chunkSize: 1000,
 *       chunkOverlap: 200
 *     },
 *     duplicateHandling: DuplicateHandling.skip  // Skip if already exists
 *   }
 * );
 * console.log(`Added: ${result.added}, Skipped: ${result.skipped}`);
 *
 * // Simple query (backward compatible)
 * const results = await controller.queryDocuments('hello', 5);
 *
 * // Query with strictness level
 * const strictResults = await controller.queryDocuments({
 *   query: 'hello',
 *   maxResults: 10,
 *   strictness: SearchStrictness.strict
 * });
 *
 * // Advanced query with metadata filtering and custom score threshold
 * const filteredResults = await controller.queryDocuments({
 *   query: 'hello',
 *   maxResults: 5,
 *   searchMethod: EmbeddingSearchMethod.filtered_similarity,
 *   metadataFilter: { category: 'manual' },
 *   minScore: 0.8
 * });
 * ```
 */
export class EmbeddingController {
  private vectorStore: Chroma | null = null;
  private config: EmbeddingConfig | null = null;
  private isInitialized = false;

  private defaultChromaServerUrl = 'http://localhost:8000';

  private retrieverOptions: MonitoringAiEmbeddingQueryOptions | undefined;

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  /**
   * Initialize the embedding controller with configuration
   * @param config Configuration options for the controller
   */
  async initialize(config: EmbeddingConfig): Promise<void> {
    try {
      this.config = config;
      this.retrieverOptions = config.retrieverOptions;

      // Initialize Chroma vector store with LangChain integration
      // Ensure URL is not empty - use default if chromaServerUrl is falsy or empty string
      let chromaUrl = config.chromaServerUrl?.trim() || this.defaultChromaServerUrl;

      // Add http:// protocol if not present
      if (!chromaUrl.startsWith('http://') && !chromaUrl.startsWith('https://')) {
        chromaUrl = `http://${chromaUrl}`;
      }

      this.vectorStore = new Chroma(config.embeddingModel, {
        collectionName: config.collectionName,
        url: chromaUrl,
      });

      this.isInitialized = true;
      console.log('EmbeddingController: initialized with ChromaDB at', chromaUrl);
      console.log('EmbeddingController: Using collection name', config.collectionName);
    } catch (error) {
      throw new Error(
        `Failed to initialize EmbeddingController: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Close the controller and cleanup resources
   */
  async close(): Promise<void> {
    if (this.isInitialized) {
      try {
        // Reset state - ChromaDB handles persistence automatically
        this.isInitialized = false;
        this.vectorStore = null;
        this.config = null;
      } catch (error) {
        throw new Error(
          `Failed to close EmbeddingController: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  // ============================================================================
  // Document Management Methods
  // ============================================================================

  /**
   * Add documents to the vector store
   * @param documents Array of documents to add
   */
  async addDocuments(documents: EmbeddingDocument[]): Promise<void> {
    this.ensureInitialized();

    if (!documents || documents.length === 0) {
      throw new Error('No documents provided');
    }

    try {
      const ids = documents.map((doc, index) => doc.id || `doc_${Date.now()}_${index}`);

      // Convert to LangChain Document format
      const langchainDocs = documents.map(
        (doc) =>
          new Document({
            pageContent: doc.content,
            metadata: doc.metadata || {},
          })
      );

      // Add documents to vector store
      await this.vectorStore!.addDocuments(langchainDocs, { ids });
    } catch (error) {
      throw new Error(
        `Failed to add documents: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Add documents from files by parsing and chunking them
   * @param files Array of file inputs to process
   * @param options Optional configuration for chunking and duplicate handling
   * @returns Object with count of added chunks and skipped files
   */
  async addDocumentsFromFiles(
    files: DocumentFileInput[],
    options?: AddDocumentsFromFilesOptions
  ): Promise<{ added: number; skipped: number; replaced: number }> {
    this.ensureInitialized();

    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    const { chunkingOptions, duplicateHandling = DuplicateHandling.skip } = options || {};

    try {
      const allDocuments: EmbeddingDocument[] = [];
      const timestamp = Date.now();
      let skippedCount = 0;
      let replacedCount = 0;
      const documentsToReplace: string[] = [];

      for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        const file = files[fileIndex];

        // Get file content as buffer for hashing
        let contentBuffer: Buffer;
        if (typeof file.source === 'string') {
          // Check if it's a URL
          if (file.source.startsWith('http://') || file.source.startsWith('https://')) {
            const response = await fetch(file.source);
            if (!response.ok) {
              throw new Error(`Failed to fetch URL: ${file.source} - ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            contentBuffer = Buffer.from(arrayBuffer);
          } else {
            // It's a file path
            const { readFile } = await import('fs/promises');
            contentBuffer = await readFile(file.source);
          }
        } else {
          contentBuffer = file.source;
        }

        // Generate document hash for duplicate detection
        const documentHash = generateDocumentHash(contentBuffer, file.filename);

        // Check for duplicates if not allowing them
        if (duplicateHandling !== DuplicateHandling.allow) {
          const existingDocs = await this.findDocumentsByHash(documentHash);

          if (existingDocs.length > 0) {
            switch (duplicateHandling) {
              case DuplicateHandling.skip:
                console.log(`Skipping duplicate file: ${file.filename || `file_${fileIndex}`}`);
                skippedCount++;
                continue;

              case DuplicateHandling.error:
                throw new Error(
                  `Duplicate document found: ${file.filename || `file_${fileIndex}`}. Hash: ${documentHash}`
                );

              case DuplicateHandling.replace:
                console.log(`Replacing existing document: ${file.filename || `file_${fileIndex}`}`);
                // Collect IDs to delete later
                documentsToReplace.push(...existingDocs.map((doc) => doc.id!));
                replacedCount++;
                break;
            }
          }
        }

        // Parse document to extract text (use the buffer we already fetched)
        const text = await parseDocument(contentBuffer, file.type);

        if (!text || text.trim().length === 0) {
          console.warn(`File ${fileIndex} produced no text content, skipping`);
          skippedCount++;
          continue;
        }

        // Chunk the text
        const chunks = chunkText(text, chunkingOptions);

        // Create document entries for each chunk
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
          const idPrefix = file.idPrefix || file.filename || `file_${fileIndex}`;
          const metadata: EmbeddingMetadata = {
            ...file.metadata,
            fileIndex,
            chunkIndex,
            totalChunks: chunks.length,
            documentType: file.type,
            documentHash, // Store hash in metadata for future duplicate detection
            ...(file.filename && { filename: file.filename }), // Only add if provided
          };

          allDocuments.push({
            id: `${idPrefix}_${timestamp}_chunk_${chunkIndex}`,
            content: chunks[chunkIndex],
            metadata,
          });
        }
      }

      // Delete documents that are being replaced
      if (documentsToReplace.length > 0) {
        await this.deleteDocuments(documentsToReplace);
      }

      if (allDocuments.length === 0) {
        return { added: 0, skipped: skippedCount, replaced: replacedCount };
      }

      // Add all documents to the vector store
      await this.addDocuments(allDocuments);

      return { added: allDocuments.length, skipped: skippedCount, replaced: replacedCount };
    } catch (error) {
      throw new Error(
        `Failed to add documents from files: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Query documents by similarity search
   * @param query The search query text or query options object
   * @returns Array of matching documents with scores
   */
  async queryDocuments(query: string): Promise<EmbeddingQueryResult[]> {
    this.ensureInitialized();

    const options = this.retrieverOptions;

    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    const k = options?.maxResults || 4;
    const searchMethod = options?.searchMethod || EmbeddingSearchMethod.similarity;

    // Determine minimum score threshold
    let minScoreThreshold: number | undefined;
    if (options?.minScore !== undefined) {
      // Custom minScore takes precedence
      minScoreThreshold = options.minScore;
    } else if (options?.strictness) {
      // Use predefined strictness level
      minScoreThreshold = SEARCH_STRICTNESS_LEVELS[options.strictness].minScore;
    }

    try {
      let results: [Document, number][];

      // Perform search based on the specified method
      switch (searchMethod) {
        case EmbeddingSearchMethod.similarity:
          results = await this.vectorStore!.similaritySearchWithScore(
            query,
            k,
            options?.metadataFilter
          );
          break;

        case EmbeddingSearchMethod.cosine:
          // Chroma uses cosine similarity by default, so this is equivalent to similarity
          results = await this.vectorStore!.similaritySearchWithScore(
            query,
            k,
            options?.metadataFilter
          );
          break;

        case EmbeddingSearchMethod.l2:
          // L2 distance search (Euclidean)
          results = await this.vectorStore!.similaritySearchWithScore(
            query,
            k,
            options?.metadataFilter
          );
          break;

        case EmbeddingSearchMethod.filtered_similarity:
          // Similarity search with metadata filtering (filter already passed)
          if (!options?.metadataFilter) {
            throw new Error('filtered_similarity requires metadataFilter to be specified');
          }
          results = await this.vectorStore!.similaritySearchWithScore(
            query,
            k,
            options.metadataFilter
          );
          break;

        default:
          // Default to similarity search
          results = await this.vectorStore!.similaritySearchWithScore(
            query,
            k,
            options?.metadataFilter
          );
      }

      const documents: EmbeddingQueryResult[] = [];

      for (const [doc, score] of results) {
        // Apply score threshold filtering if specified
        if (minScoreThreshold !== undefined && score < minScoreThreshold) {
          continue;
        }

        documents.push({
          content: doc.pageContent,
          metadata: doc.metadata as EmbeddingMetadata,
          score,
        });
      }

      return documents;
    } catch (error) {
      throw new Error(
        `Failed to query documents: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get documents by their IDs
   * @param ids Array of document IDs to retrieve
   * @returns Array of documents
   */
  async getDocuments(ids: string[]): Promise<EmbeddingQueryResult[]> {
    this.ensureInitialized();

    if (!ids || ids.length === 0) {
      throw new Error('No IDs provided');
    }

    try {
      // Use the underlying collection to get documents by IDs
      const collection = await this.vectorStore!.ensureCollection();
      const results = await collection.get({ ids });

      const documents: EmbeddingQueryResult[] = [];

      if (results.documents) {
        for (let i = 0; i < results.documents.length; i++) {
          const content = results.documents[i];
          const metadata = (results.metadatas?.[i] || {}) as EmbeddingMetadata;

          if (content) {
            documents.push({
              content,
              metadata,
            });
          }
        }
      }

      return documents;
    } catch (error) {
      throw new Error(
        `Failed to get documents: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delete specific documents by their IDs
   * @param ids Array of document IDs to delete
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    this.ensureInitialized();

    if (!ids || ids.length === 0) {
      throw new Error('No IDs provided');
    }

    try {
      await this.vectorStore!.delete({ ids });
    } catch (error) {
      throw new Error(
        `Failed to delete documents: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // ============================================================================
  // Collection Management Methods
  // ============================================================================

  /**
   * Delete the collection and close the connection
   */
  async deleteCollection(): Promise<void> {
    this.ensureInitialized();

    try {
      // Delete all documents in the collection
      const collection = await this.vectorStore!.ensureCollection();
      const allDocs = await collection.get();

      if (allDocs.ids && allDocs.ids.length > 0) {
        await collection.delete({ ids: allDocs.ids });
      }

      this.isInitialized = false;
      this.vectorStore = null;
      this.config = null;
    } catch (error) {
      throw new Error(
        `Failed to delete collection: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get the total number of documents in the collection
   * @returns Number of documents
   */
  async getDocumentCount(): Promise<number> {
    this.ensureInitialized();

    try {
      const collection = await this.vectorStore!.ensureCollection();
      const result = await collection.get();
      return result.ids?.length || 0;
    } catch (error) {
      console.error('Failed to get document count:', error);
      return 0;
    }
  }

  /**
   * Get the current collection name
   */
  getCollectionName(): string {
    this.ensureInitialized();
    return this.config!.collectionName;
  }

  /**
   * Check if the controller is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.vectorStore !== null;
  }

  /**
   * Get the Chroma server URL
   */
  getServerUrl(): string {
    this.ensureInitialized();
    return this.config!.chromaServerUrl || 'http://localhost:8000';
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Find documents by their hash in metadata
   * @param documentHash Hash to search for
   * @returns Array of matching documents with IDs
   * @private
   */
  private async findDocumentsByHash(
    documentHash: string
  ): Promise<Array<{ id: string; content: string; metadata: EmbeddingMetadata }>> {
    this.ensureInitialized();

    try {
      // Query with metadata filter for the document hash
      const collection = await this.vectorStore!.ensureCollection();
      const results = await collection.get({
        where: { documentHash },
      });

      const documents: Array<{ id: string; content: string; metadata: EmbeddingMetadata }> = [];

      if (results.ids && results.documents) {
        for (let i = 0; i < results.ids.length; i++) {
          const id = results.ids[i];
          const content = results.documents[i];
          const metadata = (results.metadatas?.[i] || {}) as EmbeddingMetadata;

          if (id && content) {
            documents.push({ id, content, metadata });
          }
        }
      }

      return documents;
    } catch (error) {
      // If metadata query fails, return empty array (no duplicates found)
      console.warn(`Failed to query for duplicates: ${error}`);
      return [];
    }
  }

  /**
   * Ensure the controller is initialized before operations
   * @private
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.vectorStore) {
      throw new Error('EmbeddingController is not initialized. Call initialize() first.');
    }
  }

  // ============================================================================
  // Retriever Integration
  // ============================================================================

  /**
   * Get a retriever instance for use with LangChain chains and agents
   * @param options Query options for the retriever
   * @returns EmbeddingRetriever instance
   */
  getRetriever(): EmbeddingRetriever {
    this.ensureInitialized();
    return new EmbeddingRetriever(this);
  }

  getRetrieverOptions(): MonitoringAiEmbeddingQueryOptions | undefined {
    return this.retrieverOptions;
  }
}
