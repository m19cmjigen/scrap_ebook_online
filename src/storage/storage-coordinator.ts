import { promises as fs } from 'fs';
import path from 'path';
import type { Page } from 'playwright';
import { CacheManager } from './cache-manager.js';
import { ManifestManager, BookManifestEntry } from './manifest-manager.js';
import { PDFGenerator } from '../pdf/pdf-generator.js';
import { Logger } from '../utils/logger.js';
import { sanitizeFilename } from '../utils/sanitize.js';
import type { Book, Chapter } from '../scrapers/book-scraper.js';
import type { StorageConfig } from '../config/settings.js';

export class StorageCoordinator {
  constructor(
    private cacheManager: CacheManager,
    private manifestManager: ManifestManager,
    private pdfGenerator: PDFGenerator,
    private config: StorageConfig
  ) {}

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    Logger.info('Initializing storage directories...');

    // Create all required directories
    await fs.mkdir(this.config.dataDir, { recursive: true });
    await fs.mkdir(this.config.cacheDir, { recursive: true });
    await fs.mkdir(this.config.booksDir, { recursive: true });
    await fs.mkdir(this.config.progressDir, { recursive: true });
    await fs.mkdir(this.config.logsDir, { recursive: true });

    Logger.info('Storage directories initialized');
  }

  /**
   * Save a chapter to cache
   */
  async saveChapter(bookId: string, chapter: Chapter, content: string): Promise<void> {
    await this.cacheManager.saveChapter(bookId, {
      chapterIndex: chapter.index,
      title: chapter.title,
      url: chapter.url,
      content,
      scrapedAt: new Date().toISOString(),
      hash: '', // Will be calculated by CacheManager
    });
  }

  /**
   * Get all cached chapters for a book
   */
  async getCachedChapters(bookId: string): Promise<Map<number, string>> {
    const cachedIndices = await this.cacheManager.getCachedChapterIndices(bookId);
    const chapters = new Map<number, string>();

    for (const index of cachedIndices) {
      const cached = await this.cacheManager.getChapter(bookId, index);
      if (cached) {
        chapters.set(index, cached.content);
      }
    }

    return chapters;
  }

  /**
   * Check if a book is already scraped and complete
   */
  async isBookScraped(bookId: string): Promise<boolean> {
    const entry = await this.manifestManager.getBook(bookId);
    return entry !== null && entry.status === 'complete';
  }

  /**
   * Save complete book (generate PDF and update manifest)
   */
  async saveBook(page: Page, book: Book, chapterContents: Map<number, string>): Promise<BookManifestEntry> {
    Logger.info('Saving book to storage...');

    // Create book directory
    const bookDir = path.join(this.config.booksDir, book.id);
    await fs.mkdir(bookDir, { recursive: true });

    // Generate PDF
    Logger.info('Generating PDF...');
    const sanitizedTitle = sanitizeFilename(book.title);
    const pdfFilename = `${sanitizedTitle}.pdf`;
    const pdfPath = path.join(bookDir, pdfFilename);

    await this.pdfGenerator.generateBookPDF(page, book, chapterContents, bookDir);
    Logger.info(`PDF generated: ${pdfPath}`);

    // Save metadata
    const metadataPath = path.join(bookDir, 'metadata.json');
    const metadata = {
      id: book.id,
      title: book.title,
      author: book.author,
      url: book.url,
      chapterCount: book.chapters.length,
      scrapedAt: new Date().toISOString(),
    };
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Create manifest entry
    const manifestEntry: BookManifestEntry = {
      id: book.id,
      title: book.title,
      author: book.author,
      url: book.url,
      chapterCount: book.chapters.length,
      scrapedAt: metadata.scrapedAt,
      lastUpdated: new Date().toISOString(),
      status: chapterContents.size === book.chapters.length ? 'complete' : 'partial',
      outputPath: pdfPath,
    };

    // Update manifest
    await this.manifestManager.upsertBook(manifestEntry);

    Logger.info('Book saved successfully');
    return manifestEntry;
  }

  /**
   * Update cache metadata for a book
   */
  async updateCacheMetadata(book: Book): Promise<void> {
    await this.cacheManager.saveMetadata(book.id, {
      bookId: book.id,
      bookTitle: book.title,
      author: book.author,
      totalChapters: book.chapters.length,
      lastUpdated: new Date().toISOString(),
      version: '1.0',
    });
  }

  /**
   * Get book output path (PDF location)
   */
  getBookOutputPath(bookId: string, title: string): string {
    const sanitizedTitle = sanitizeFilename(title);
    return path.join(this.config.booksDir, bookId, `${sanitizedTitle}.pdf`);
  }

  /**
   * Check if book PDF exists
   */
  async bookPdfExists(bookId: string, title: string): Promise<boolean> {
    try {
      const pdfPath = this.getBookOutputPath(bookId, title);
      await fs.access(pdfPath);
      return true;
    } catch {
      return false;
    }
  }
}
