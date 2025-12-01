import { createHash } from 'crypto';

/**
 * Generate a hash for document content to detect duplicates
 * @param content Text content or buffer to hash
 * @param filename Optional filename to include in hash
 * @returns SHA-256 hash string
 */
export function generateDocumentHash(content: string | Buffer, filename?: string): string {
  const hash = createHash('sha256');
  
  if (filename) {
    hash.update(filename);
    hash.update('::'); // Separator
  }
  
  hash.update(content);
  
  return hash.digest('hex');
}

/**
 * Generate a hash from file buffer
 * @param buffer File buffer
 * @param filename Optional filename
 * @returns SHA-256 hash string
 */
export function generateFileHash(buffer: Buffer, filename?: string): string {
  return generateDocumentHash(buffer, filename);
}
