import { DocumentType } from '@syspons/monitoring-ai-common';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import * as XLSX from 'xlsx';

/**
 * Parse document based on type and return text content using LangChain loaders
 */
export async function parseDocument(source: Buffer | string, type: DocumentType): Promise<string> {
  let filePath: string;
  let isTemporary = false;

  // Handle Buffer input by creating a temporary file
  if (Buffer.isBuffer(source)) {
    const tempPath = join(tmpdir(), `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await writeFile(tempPath, source);
    filePath = tempPath;
    isTemporary = true;
  } else if (typeof source === 'string') {
    // Handle URL or file path
    if (source.startsWith('http://') || source.startsWith('https://')) {
      // For URLs, we'll handle them differently per type
      filePath = source;
    } else {
      filePath = source;
    }
  } else {
    throw new Error('Invalid source type');
  }

  try {
    let text: string;

    switch (type) {
      case DocumentType.pdf:
        text = await parsePDF(filePath, isTemporary);
        break;
      case DocumentType.docx:
        text = await parseDOCX(filePath);
        break;
      case DocumentType.csv:
        text = await parseCSV(filePath);
        break;
      case DocumentType.json:
        text = await parseJSON(filePath);
        break;
      case DocumentType.txt:
      case DocumentType.md:
        text = await parseTXT(filePath);
        break;
      case DocumentType.html:
        text = await parseHTML(filePath);
        break;
      case DocumentType.xlsx:
        // XLSX not directly supported by LangChain, fallback to manual parsing
        text = await parseXLSX(source as Buffer);
        break;
      default:
        throw new Error(`Unsupported document type: ${type}`);
    }

    return text;
  } finally {
    // Clean up temporary file if created
    if (isTemporary) {
      try {
        await unlink(filePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Parse PDF document using LangChain PDFLoader
 */
async function parsePDF(filePath: string, isLocalFile: boolean): Promise<string> {
  if (!isLocalFile && (filePath.startsWith('http://') || filePath.startsWith('https://'))) {
    // For URLs, download first
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${filePath} - ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const tempPath = join(tmpdir(), `pdf-${Date.now()}.pdf`);
    await writeFile(tempPath, buffer);

    try {
      const loader = new PDFLoader(tempPath);
      const docs = await loader.load();
      return docs.map((doc) => doc.pageContent).join('\n');
    } finally {
      await unlink(tempPath);
    }
  }

  const loader = new PDFLoader(filePath);
  const docs = await loader.load();
  return docs.map((doc) => doc.pageContent).join('\n');
}

/**
 * Parse DOCX document using LangChain DocxLoader
 */
async function parseDOCX(filePath: string): Promise<string> {
  const loader = new DocxLoader(filePath);
  const docs = await loader.load();
  return docs.map((doc) => doc.pageContent).join('\n');
}

/**
 * Parse CSV document using LangChain CSVLoader
 */
async function parseCSV(filePath: string): Promise<string> {
  const loader = new CSVLoader(filePath);
  const docs = await loader.load();
  return docs.map((doc) => doc.pageContent).join('\n');
}

/**
 * Parse JSON document
 */
async function parseJSON(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8');
  const json = JSON.parse(content);
  return JSON.stringify(json, null, 2);
}

/**
 * Parse text document
 */
async function parseTXT(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8');
  return content;
}

/**
 * Parse HTML document using LangChain CheerioWebBaseLoader
 */
async function parseHTML(filePath: string): Promise<string> {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    const loader = new CheerioWebBaseLoader(filePath);
    const docs = await loader.load();
    return docs.map((doc) => doc.pageContent).join('\n');
  }

  // For local HTML files, read and use simple text extraction
  const html = await readFile(filePath, 'utf-8');

  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Parse XLSX document (fallback - not directly supported by LangChain)
 */
async function parseXLSX(source: Buffer | string): Promise<string> {
  let buffer: Buffer;

  if (typeof source === 'string') {
    buffer = await readFile(source);
  } else {
    buffer = source;
  }

  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const texts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Convert each row to text
    for (const row of json as any[][]) {
      const rowText = row.filter((cell) => cell !== null && cell !== undefined).join(' | ');
      if (rowText.trim()) {
        texts.push(rowText);
      }
    }
  }

  return texts.join('\n');
}

/**
 * Get appropriate file extension for document type
 */
export function getFileExtension(type: DocumentType): string {
  return type;
}

/**
 * Detect document type from file extension
 */
export function detectDocumentType(filename: string): DocumentType | null {
  const ext = filename.toLowerCase().split('.').pop();

  switch (ext) {
    case 'pdf':
      return DocumentType.pdf;
    case 'docx':
    case 'doc':
      return DocumentType.docx;
    case 'xlsx':
    case 'xls':
      return DocumentType.xlsx;
    case 'csv':
      return DocumentType.csv;
    case 'txt':
      return DocumentType.txt;
    case 'md':
    case 'markdown':
      return DocumentType.md;
    case 'json':
      return DocumentType.json;
    case 'html':
    case 'htm':
      return DocumentType.html;
    default:
      return null;
  }
}
