import { promises as fs } from 'fs';
import path from 'path';
import { Logger } from '../utils/logger.js';

export interface Checkpoint {
  bookId: string;
  bookUrl: string;
  startedAt: string;
  lastUpdated: string;
  totalChapters: number;
  completedChapters: number[];
  failedChapters: number[];
  currentChapter: number | null;
  status: 'in_progress' | 'completed' | 'failed';
}

export class CheckpointManager {
  private progressDir: string;

  constructor(progressDir: string) {
    this.progressDir = progressDir;
  }

  /**
   * Get the checkpoint file path for a book
   */
  private getCheckpointPath(bookId: string): string {
    return path.join(this.progressDir, `${bookId}.checkpoint.json`);
  }

  /**
   * Save checkpoint (atomic write)
   */
  async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    try {
      // Ensure progress directory exists
      await fs.mkdir(this.progressDir, { recursive: true });

      const checkpointWithUpdate: Checkpoint = {
        ...checkpoint,
        lastUpdated: new Date().toISOString(),
      };

      // Atomic write
      const checkpointPath = this.getCheckpointPath(checkpoint.bookId);
      const tempPath = `${checkpointPath}.tmp`;

      await fs.writeFile(tempPath, JSON.stringify(checkpointWithUpdate, null, 2));
      await fs.rename(tempPath, checkpointPath);

      Logger.debug(`Checkpoint saved for ${checkpoint.bookId}`);
    } catch (error) {
      Logger.error(`Failed to save checkpoint for ${checkpoint.bookId}`, error);
      throw error;
    }
  }

  /**
   * Load checkpoint for a book
   */
  async loadCheckpoint(bookId: string): Promise<Checkpoint | null> {
    try {
      const checkpointPath = this.getCheckpointPath(bookId);
      const data = await fs.readFile(checkpointPath, 'utf-8');
      const checkpoint: Checkpoint = JSON.parse(data);

      Logger.info(`Loaded checkpoint for ${bookId}`, {
        completed: checkpoint.completedChapters.length,
        failed: checkpoint.failedChapters.length,
        total: checkpoint.totalChapters,
      });

      return checkpoint;
    } catch {
      return null;
    }
  }

  /**
   * Mark a chapter as completed
   */
  async markChapterComplete(bookId: string, chapterIndex: number): Promise<void> {
    const checkpoint = await this.loadCheckpoint(bookId);
    if (!checkpoint) {
      Logger.warn(`No checkpoint found for ${bookId}, cannot mark chapter ${chapterIndex} complete`);
      return;
    }

    // Add to completed if not already there
    if (!checkpoint.completedChapters.includes(chapterIndex)) {
      checkpoint.completedChapters.push(chapterIndex);
      checkpoint.completedChapters.sort((a, b) => a - b);
    }

    // Remove from failed if it was there
    checkpoint.failedChapters = checkpoint.failedChapters.filter((idx) => idx !== chapterIndex);

    await this.saveCheckpoint(checkpoint);
  }

  /**
   * Mark a chapter as failed
   */
  async markChapterFailed(bookId: string, chapterIndex: number): Promise<void> {
    const checkpoint = await this.loadCheckpoint(bookId);
    if (!checkpoint) {
      Logger.warn(`No checkpoint found for ${bookId}, cannot mark chapter ${chapterIndex} failed`);
      return;
    }

    // Add to failed if not already there
    if (!checkpoint.failedChapters.includes(chapterIndex)) {
      checkpoint.failedChapters.push(chapterIndex);
      checkpoint.failedChapters.sort((a, b) => a - b);
    }

    await this.saveCheckpoint(checkpoint);
  }

  /**
   * Delete checkpoint (on completion)
   */
  async deleteCheckpoint(bookId: string): Promise<void> {
    try {
      const checkpointPath = this.getCheckpointPath(bookId);
      await fs.unlink(checkpointPath);
      Logger.info(`Deleted checkpoint for ${bookId}`);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as any).code !== 'ENOENT') {
        Logger.error(`Failed to delete checkpoint for ${bookId}`, error);
      }
    }
  }

  /**
   * List all in-progress scrapes
   */
  async listInProgress(): Promise<Checkpoint[]> {
    try {
      const files = await fs.readdir(this.progressDir);
      const checkpoints: Checkpoint[] = [];

      for (const file of files) {
        if (file.endsWith('.checkpoint.json')) {
          const filePath = path.join(this.progressDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const checkpoint: Checkpoint = JSON.parse(data);

          if (checkpoint.status === 'in_progress') {
            checkpoints.push(checkpoint);
          }
        }
      }

      return checkpoints;
    } catch {
      return [];
    }
  }

  /**
   * Create a new checkpoint
   */
  async createCheckpoint(bookId: string, bookUrl: string, totalChapters: number): Promise<Checkpoint> {
    const checkpoint: Checkpoint = {
      bookId,
      bookUrl,
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      totalChapters,
      completedChapters: [],
      failedChapters: [],
      currentChapter: null,
      status: 'in_progress',
    };

    await this.saveCheckpoint(checkpoint);
    return checkpoint;
  }
}
