import { ChunkingStrategy, ChunkingOptions } from '@syspons/monitoring-ai-common';

/**
 * Default chunking options
 */
const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;
const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', ' ', ''];

/**
 * Split text into chunks based on the specified strategy
 */
export function chunkText(text: string, options: ChunkingOptions = {}): string[] {
  const {
    strategy = ChunkingStrategy.recursive,
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    separators = DEFAULT_SEPARATORS,
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  switch (strategy) {
    case ChunkingStrategy.fixed:
      return chunkByFixedSize(text, chunkSize, chunkOverlap);
    case ChunkingStrategy.sentence:
      return chunkBySentence(text, chunkSize);
    case ChunkingStrategy.paragraph:
      return chunkByParagraph(text, chunkSize);
    case ChunkingStrategy.recursive:
      return chunkRecursive(text, chunkSize, chunkOverlap, separators);
    default:
      throw new Error(`Unsupported chunking strategy: ${strategy}`);
  }
}

/**
 * Split text into fixed-size chunks with overlap
 */
function chunkByFixedSize(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    const chunk = text.substring(startIndex, endIndex).trim();
    
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    startIndex += chunkSize - overlap;
    
    // Prevent infinite loop
    if (startIndex <= 0) {
      startIndex = chunkSize;
    }
  }

  return chunks;
}

/**
 * Split text by sentences, respecting max chunk size
 */
function chunkBySentence(text: string, maxChunkSize: number): string[] {
  // Split by sentence endings
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    if (currentChunk.length + trimmedSentence.length + 1 <= maxChunkSize) {
      currentChunk += (currentChunk.length > 0 ? ' ' : '') + trimmedSentence;
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      currentChunk = trimmedSentence;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Split text by paragraphs, respecting max chunk size
 */
function chunkByParagraph(text: string, maxChunkSize: number): string[] {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    
    if (currentChunk.length + trimmedParagraph.length + 2 <= maxChunkSize) {
      currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + trimmedParagraph;
    } else {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      
      // If single paragraph exceeds max size, split it further
      if (trimmedParagraph.length > maxChunkSize) {
        const subChunks = chunkByFixedSize(trimmedParagraph, maxChunkSize, 0);
        chunks.push(...subChunks);
        currentChunk = '';
      } else {
        currentChunk = trimmedParagraph;
      }
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Recursively split text using a hierarchy of separators
 */
function chunkRecursive(
  text: string,
  chunkSize: number,
  overlap: number,
  separators: string[]
): string[] {
  const chunks: string[] = [];

  function splitRecursive(text: string, separatorIndex: number): void {
    if (text.length <= chunkSize) {
      if (text.trim().length > 0) {
        chunks.push(text.trim());
      }
      return;
    }

    if (separatorIndex >= separators.length) {
      // No more separators, use fixed-size chunking
      const fixedChunks = chunkByFixedSize(text, chunkSize, overlap);
      chunks.push(...fixedChunks);
      return;
    }

    const separator = separators[separatorIndex];
    const parts = text.split(separator);

    let currentChunk = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const potentialChunk = currentChunk + (currentChunk ? separator : '') + part;

      if (potentialChunk.length <= chunkSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk.length > 0) {
          // Try splitting current chunk with next separator
          if (currentChunk.length > chunkSize) {
            splitRecursive(currentChunk, separatorIndex + 1);
          } else {
            chunks.push(currentChunk.trim());
          }
        }

        currentChunk = part;
      }
    }

    if (currentChunk.length > 0) {
      if (currentChunk.length > chunkSize) {
        splitRecursive(currentChunk, separatorIndex + 1);
      } else {
        chunks.push(currentChunk.trim());
      }
    }
  }

  splitRecursive(text, 0);

  // Add overlap between chunks if specified
  if (overlap > 0 && chunks.length > 1) {
    return addOverlapToChunks(chunks, overlap);
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

/**
 * Add overlap between adjacent chunks
 */
function addOverlapToChunks(chunks: string[], overlap: number): string[] {
  if (chunks.length <= 1) {
    return chunks;
  }

  const overlappedChunks: string[] = [chunks[0]];

  for (let i = 1; i < chunks.length; i++) {
    const prevChunk = chunks[i - 1];
    const currentChunk = chunks[i];

    // Get overlap from previous chunk
    const overlapText = prevChunk.slice(-overlap);
    const newChunk = overlapText + ' ' + currentChunk;

    overlappedChunks.push(newChunk.trim());
  }

  return overlappedChunks;
}

/**
 * Calculate optimal chunk size based on text length and desired chunk count
 */
export function calculateOptimalChunkSize(textLength: number, targetChunks: number): number {
  if (targetChunks <= 0) {
    throw new Error('Target chunks must be greater than 0');
  }
  
  return Math.max(100, Math.ceil(textLength / targetChunks));
}
