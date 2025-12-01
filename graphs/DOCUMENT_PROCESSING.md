# Document Processing with EmbeddingController

The `EmbeddingController` now supports automatic parsing and vectorization of documents from various file formats.

## Supported Document Types

- **PDF** (`.pdf`) - Via `pdf-parse`
- **Microsoft Word** (`.docx`, `.doc`) - Via `mammoth`
- **Microsoft Excel** (`.xlsx`, `.xls`) - Via `xlsx`
- **CSV** (`.csv`) - Via `csv-parse`
- **Plain Text** (`.txt`)
- **Markdown** (`.md`, `.markdown`)
- **JSON** (`.json`)
- **HTML** (`.html`, `.htm`) - Basic text extraction

## Text Chunking Strategies

### 1. **Recursive** (Recommended)
Uses a hierarchy of separators to intelligently split text while preserving context.

```typescript
{
  strategy: ChunkingStrategy.recursive,
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', '. ', ' ', '']
}
```

### 2. **Fixed Size**
Splits text into fixed-character chunks with optional overlap.

```typescript
{
  strategy: ChunkingStrategy.fixed,
  chunkSize: 1000,
  chunkOverlap: 200
}
```

### 3. **Sentence**
Groups sentences together up to the maximum chunk size.

```typescript
{
  strategy: ChunkingStrategy.sentence,
  chunkSize: 1000
}
```

### 4. **Paragraph**
Groups paragraphs together up to the maximum chunk size.

```typescript
{
  strategy: ChunkingStrategy.paragraph,
  chunkSize: 1000
}
```

## Usage Examples

### Basic File Processing

```typescript
import { readFile } from 'fs/promises';
import { EmbeddingController } from '@syspons/monitoring-ai-graphs';
import { DocumentType, ChunkingStrategy } from '@syspons/monitoring-ai-common';
import { AzureOpenAIEmbeddings } from '@langchain/openai';

const controller = new EmbeddingController();

await controller.initialize({
  url: 'http://localhost:8000',
  collectionName: 'documents',
  embeddingModel: new AzureOpenAIEmbeddings()
});

// Process a single PDF
const pdfBuffer = await readFile('./manual.pdf');
const chunksAdded = await controller.addDocumentsFromFiles([
  {
    source: pdfBuffer,
    type: DocumentType.pdf,
    metadata: { category: 'manual', version: '1.0' },
    idPrefix: 'manual_v1'
  }
]);

console.log(`Added ${chunksAdded} document chunks`);
```

### Processing Multiple Files

```typescript
const files = [
  {
    source: await readFile('./doc1.pdf'),
    type: DocumentType.pdf,
    metadata: { category: 'technical', author: 'John' }
  },
  {
    source: await readFile('./data.xlsx'),
    type: DocumentType.xlsx,
    metadata: { category: 'data', year: 2024 }
  },
  {
    source: './readme.md', // Can also use file paths
    type: DocumentType.md,
    metadata: { category: 'documentation' }
  }
];

const totalChunks = await controller.addDocumentsFromFiles(files, {
  strategy: ChunkingStrategy.recursive,
  chunkSize: 1500,
  chunkOverlap: 300
});
```

### Custom Chunking for Long Documents

```typescript
// For very long documents, use larger chunks with more overlap
await controller.addDocumentsFromFiles(
  [
    {
      source: await readFile('./book.pdf'),
      type: DocumentType.pdf,
      metadata: { type: 'book', title: 'AI Handbook' },
      idPrefix: 'ai_handbook'
    }
  ],
  {
    strategy: ChunkingStrategy.recursive,
    chunkSize: 2000,
    chunkOverlap: 400,
    separators: ['\n\n\n', '\n\n', '\n', '. ', '! ', '? ', ' ', '']
  }
);
```

### Searching Processed Documents

```typescript
// Search with metadata filtering
const results = await controller.queryDocuments({
  query: 'How to configure the system?',
  topK: 5,
  searchMethod: EmbeddingSearchMethod.filtered_similarity,
  metadataFilter: { category: 'manual' },
  strictness: SearchStrictness.balanced
});

results.forEach((result) => {
  console.log(`Score: ${result.score}`);
  console.log(`Content: ${result.content}`);
  console.log(`Chunk ${result.metadata.chunkIndex + 1}/${result.metadata.totalChunks}`);
  console.log(`Type: ${result.metadata.documentType}`);
});
```

## Metadata Added Automatically

When using `addDocumentsFromFiles()`, the following metadata is automatically added to each chunk:

- `fileIndex` - Index of the file in the input array
- `chunkIndex` - Index of this chunk within the file (0-based)
- `totalChunks` - Total number of chunks from this file
- `documentType` - The document type (pdf, docx, etc.)

Plus any custom metadata you provide in the `DocumentFileInput`.

## Tips for Optimal Results

1. **Chunk Size**: 1000-2000 characters works well for most use cases
2. **Overlap**: 10-20% of chunk size helps maintain context
3. **Strategy**: Use `recursive` for general text, `paragraph` for structured documents
4. **Metadata**: Add meaningful metadata for filtering (author, date, category, etc.)
5. **ID Prefix**: Use descriptive prefixes to organize documents by source

## Error Handling

```typescript
try {
  const chunks = await controller.addDocumentsFromFiles(files, chunkingOptions);
  console.log(`Successfully added ${chunks} chunks`);
} catch (error) {
  console.error('Failed to process files:', error.message);
  // Handle specific errors
  if (error.message.includes('No valid documents')) {
    console.error('All files were empty or could not be parsed');
  }
}
```

## Performance Considerations

- **Large Files**: Consider processing files in batches
- **Memory**: Large PDFs with images may consume significant memory
- **Chunking**: Smaller chunks = more embeddings = slower but more precise
- **Overlap**: More overlap = more duplicated content = larger vector DB
