import { promises as fs } from 'fs';
import { Logger } from '../utils/logger.js';

export interface BookManifestEntry {
  id: string;
  title: string;
  author: string;
  url: string;
  chapterCount: number;
  scrapedAt: string;
  lastUpdated: string;
  status: 'complete' | 'partial' | 'failed';
  outputPath: string; // PDF file path
}

export interface Manifest {
  version: string;
  books: BookManifestEntry[];
  lastUpdated: string;
}

export class ManifestManager {
  private manifestPath: string;
  private readonly MANIFEST_VERSION = '1.0';

  constructor(manifestPath: string) {
    this.manifestPath = manifestPath;
  }

  /**
   * Load manifest from disk
   */
  async load(): Promise<Manifest> {
    try {
      const data = await fs.readFile(this.manifestPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, return empty manifest
      Logger.debug('No existing manifest found, creating new one');
      return {
        version: this.MANIFEST_VERSION,
        books: [],
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Save manifest to disk (atomic write)
   */
  async save(manifest: Manifest): Promise<void> {
    try {
      const manifestWithUpdate: Manifest = {
        ...manifest,
        lastUpdated: new Date().toISOString(),
      };

      // Atomic write: write to temp file, then rename
      const tempPath = `${this.manifestPath}.tmp`;

      await fs.writeFile(tempPath, JSON.stringify(manifestWithUpdate, null, 2));
      await fs.rename(tempPath, this.manifestPath);

      Logger.debug('Manifest saved successfully');
    } catch (error) {
      Logger.error('Failed to save manifest', error);
      throw error;
    }
  }

  /**
   * Add or update a book entry
   */
  async upsertBook(entry: BookManifestEntry): Promise<void> {
    const manifest = await this.load();

    // Find existing entry
    const existingIndex = manifest.books.findIndex((book) => book.id === entry.id);

    const entryWithUpdate: BookManifestEntry = {
      ...entry,
      lastUpdated: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // Update existing entry
      manifest.books[existingIndex] = entryWithUpdate;
      Logger.info(`Updated manifest entry for book: ${entry.title}`);
    } else {
      // Add new entry
      manifest.books.push(entryWithUpdate);
      Logger.info(`Added new manifest entry for book: ${entry.title}`);
    }

    await this.save(manifest);
  }

  /**
   * Get a book entry by ID
   */
  async getBook(bookId: string): Promise<BookManifestEntry | null> {
    const manifest = await this.load();
    return manifest.books.find((book) => book.id === bookId) || null;
  }

  /**
   * List all books
   */
  async listBooks(): Promise<BookManifestEntry[]> {
    const manifest = await this.load();
    return manifest.books;
  }

  /**
   * Search books by title or author
   */
  async searchBooks(query: string): Promise<BookManifestEntry[]> {
    const manifest = await this.load();
    const lowerQuery = query.toLowerCase();

    return manifest.books.filter(
      (book) =>
        book.title.toLowerCase().includes(lowerQuery) || book.author.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Remove a book entry
   */
  async removeBook(bookId: string): Promise<boolean> {
    const manifest = await this.load();
    const initialLength = manifest.books.length;

    manifest.books = manifest.books.filter((book) => book.id !== bookId);

    if (manifest.books.length < initialLength) {
      await this.save(manifest);
      Logger.info(`Removed manifest entry for book ID: ${bookId}`);
      return true;
    }

    return false;
  }

  /**
   * Get statistics about the manifest
   */
  async getStats(): Promise<{
    total: number;
    complete: number;
    partial: number;
    failed: number;
  }> {
    const manifest = await this.load();

    return {
      total: manifest.books.length,
      complete: manifest.books.filter((b) => b.status === 'complete').length,
      partial: manifest.books.filter((b) => b.status === 'partial').length,
      failed: manifest.books.filter((b) => b.status === 'failed').length,
    };
  }
}
