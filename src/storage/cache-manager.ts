import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { Logger } from '../utils/logger.js';

export interface CachedChapter {
  chapterIndex: number;
  title: string;
  url: string;
  content: string; // raw HTML
  scrapedAt: string; // ISO timestamp
  hash: string; // SHA256 for integrity
}

export interface CacheMetadata {
  bookId: string;
  bookTitle: string;
  author: string;
  totalChapters: number;
  lastUpdated: string;
  version: string; // Cache format version
}

export class CacheManager {
  private cacheDir: string;
  private readonly CACHE_VERSION = '1.0';

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
  }

  /**
   * Get the cache directory path for a specific book
   */
  private getBookCacheDir(bookId: string): string {
    return path.join(this.cacheDir, bookId);
  }

  /**
   * Get the chapters directory path for a specific book
   */
  private getChaptersDir(bookId: string): string {
    return path.join(this.getBookCacheDir(bookId), 'chapters');
  }

  /**
   * Get the metadata file path for a specific book
   */
  private getMetadataPath(bookId: string): string {
    return path.join(this.getBookCacheDir(bookId), 'metadata.json');
  }

  /**
   * Get the chapter file path
   */
  private getChapterPath(bookId: string, chapterIndex: number): string {
    return path.join(this.getChaptersDir(bookId), `chapter-${chapterIndex}.json`);
  }

  /**
   * Calculate SHA256 hash of content
   */
  private calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if a chapter is cached
   */
  async hasChapter(bookId: string, chapterIndex: number): Promise<boolean> {
    try {
      const chapterPath = this.getChapterPath(bookId, chapterIndex);
      await fs.access(chapterPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get a cached chapter
   */
  async getChapter(bookId: string, chapterIndex: number): Promise<CachedChapter | null> {
    try {
      const chapterPath = this.getChapterPath(bookId, chapterIndex);
      const data = await fs.readFile(chapterPath, 'utf-8');
      const chapter: CachedChapter = JSON.parse(data);

      // Verify hash integrity
      const calculatedHash = this.calculateHash(chapter.content);
      if (calculatedHash !== chapter.hash) {
        Logger.warn(`Cache integrity check failed for ${bookId} chapter ${chapterIndex}`);
        return null;
      }

      return chapter;
    } catch (error) {
      Logger.debug(`Failed to get cached chapter ${chapterIndex} for ${bookId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Save a chapter to cache
   */
  async saveChapter(bookId: string, chapter: CachedChapter): Promise<void> {
    try {
      // Ensure chapters directory exists
      const chaptersDir = this.getChaptersDir(bookId);
      await fs.mkdir(chaptersDir, { recursive: true });

      // Calculate hash
      const hash = this.calculateHash(chapter.content);
      const chapterWithHash: CachedChapter = {
        ...chapter,
        hash,
        scrapedAt: new Date().toISOString(),
      };

      // Write to temp file first (atomic write)
      const chapterPath = this.getChapterPath(bookId, chapter.chapterIndex);
      const tempPath = `${chapterPath}.tmp`;

      await fs.writeFile(tempPath, JSON.stringify(chapterWithHash, null, 2));

      // Rename temp file to actual file (atomic operation)
      await fs.rename(tempPath, chapterPath);

      Logger.debug(`Cached chapter ${chapter.chapterIndex} for ${bookId}`);
    } catch (error) {
      Logger.error(`Failed to cache chapter ${chapter.chapterIndex} for ${bookId}`, error);
      throw error;
    }
  }

  /**
   * Get cache metadata
   */
  async getMetadata(bookId: string): Promise<CacheMetadata | null> {
    try {
      const metadataPath = this.getMetadataPath(bookId);
      const data = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  /**
   * Save cache metadata
   */
  async saveMetadata(bookId: string, metadata: CacheMetadata): Promise<void> {
    try {
      // Ensure cache directory exists
      const cacheDir = this.getBookCacheDir(bookId);
      await fs.mkdir(cacheDir, { recursive: true });

      const metadataWithDefaults: CacheMetadata = {
        ...metadata,
        lastUpdated: new Date().toISOString(),
        version: this.CACHE_VERSION,
      };

      // Atomic write
      const metadataPath = this.getMetadataPath(bookId);
      const tempPath = `${metadataPath}.tmp`;

      await fs.writeFile(tempPath, JSON.stringify(metadataWithDefaults, null, 2));
      await fs.rename(tempPath, metadataPath);

      Logger.debug(`Saved cache metadata for ${bookId}`);
    } catch (error) {
      Logger.error(`Failed to save cache metadata for ${bookId}`, error);
      throw error;
    }
  }

  /**
   * Validate cache integrity
   */
  async validateCache(bookId: string, expectedChapters: number): Promise<boolean> {
    try {
      // Check metadata
      const metadata = await this.getMetadata(bookId);
      if (!metadata) {
        Logger.debug(`No cache metadata found for ${bookId}`);
        return false;
      }

      if (metadata.totalChapters !== expectedChapters) {
        Logger.warn(
          `Cache chapter count mismatch for ${bookId}: expected ${expectedChapters}, cached ${metadata.totalChapters}`
        );
        return false;
      }

      // Check all chapters exist and have valid hashes
      for (let i = 0; i < expectedChapters; i++) {
        const chapter = await this.getChapter(bookId, i);
        if (!chapter) {
          Logger.debug(`Missing or invalid cache for ${bookId} chapter ${i}`);
          return false;
        }
      }

      Logger.info(`Cache validation successful for ${bookId}`);
      return true;
    } catch (error) {
      Logger.error(`Cache validation failed for ${bookId}`, error);
      return false;
    }
  }

  /**
   * Clear cache for a book
   */
  async clearBookCache(bookId: string): Promise<void> {
    try {
      const cacheDir = this.getBookCacheDir(bookId);
      await fs.rm(cacheDir, { recursive: true, force: true });
      Logger.info(`Cleared cache for ${bookId}`);
    } catch (error) {
      Logger.error(`Failed to clear cache for ${bookId}`, error);
      throw error;
    }
  }

  /**
   * Get all cached chapter indices for a book
   */
  async getCachedChapterIndices(bookId: string): Promise<number[]> {
    try {
      const chaptersDir = this.getChaptersDir(bookId);
      const files = await fs.readdir(chaptersDir);

      const indices: number[] = [];
      for (const file of files) {
        const match = file.match(/^chapter-(\d+)\.json$/);
        if (match) {
          indices.push(parseInt(match[1], 10));
        }
      }

      return indices.sort((a, b) => a - b);
    } catch {
      return [];
    }
  }
}
