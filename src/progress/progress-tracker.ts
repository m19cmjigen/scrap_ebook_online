import { CheckpointManager, Checkpoint } from './checkpoint-manager.js';
import { Logger } from '../utils/logger.js';

export interface ProgressSummary {
  total: number;
  completed: number;
  failed: number;
  remaining: number;
  percentage: number;
}

export class ProgressTracker {
  private checkpoint: Checkpoint | null = null;

  constructor(
    private checkpointManager: CheckpointManager,
    private bookId: string,
    private bookUrl: string,
    private totalChapters: number
  ) {}

  /**
   * Initialize tracker - load existing checkpoint or create new one
   */
  async initialize(): Promise<void> {
    // Try to load existing checkpoint
    this.checkpoint = await this.checkpointManager.loadCheckpoint(this.bookId);

    if (this.checkpoint) {
      Logger.info(`Resuming from checkpoint for ${this.bookId}`, {
        completed: this.checkpoint.completedChapters.length,
        failed: this.checkpoint.failedChapters.length,
        total: this.totalChapters,
      });
    } else {
      // Create new checkpoint
      this.checkpoint = await this.checkpointManager.createCheckpoint(
        this.bookId,
        this.bookUrl,
        this.totalChapters
      );
      Logger.info(`Created new checkpoint for ${this.bookId}`);
    }
  }

  /**
   * Get chapters that still need to be scraped
   */
  getRemainingChapters(): number[] {
    if (!this.checkpoint) {
      return Array.from({ length: this.totalChapters }, (_, i) => i);
    }

    const completed = new Set(this.checkpoint.completedChapters);
    const remaining: number[] = [];

    for (let i = 0; i < this.totalChapters; i++) {
      if (!completed.has(i)) {
        remaining.push(i);
      }
    }

    return remaining;
  }

  /**
   * Get failed chapters (for potential retry)
   */
  getFailedChapters(): number[] {
    return this.checkpoint?.failedChapters || [];
  }

  /**
   * Mark chapter as currently being processed
   */
  async startChapter(chapterIndex: number): Promise<void> {
    if (!this.checkpoint) {
      throw new Error('ProgressTracker not initialized');
    }

    this.checkpoint.currentChapter = chapterIndex;
    await this.checkpointManager.saveCheckpoint(this.checkpoint);

    Logger.debug(`Started chapter ${chapterIndex} for ${this.bookId}`);
  }

  /**
   * Mark chapter as completed
   */
  async completeChapter(chapterIndex: number): Promise<void> {
    if (!this.checkpoint) {
      throw new Error('ProgressTracker not initialized');
    }

    await this.checkpointManager.markChapterComplete(this.bookId, chapterIndex);

    // Reload checkpoint to get updated state
    this.checkpoint = await this.checkpointManager.loadCheckpoint(this.bookId);

    const summary = this.getSummary();
    Logger.logChapterProgress(summary.completed, summary.total, `Chapter ${chapterIndex}`);
  }

  /**
   * Mark chapter as failed
   */
  async failChapter(chapterIndex: number): Promise<void> {
    if (!this.checkpoint) {
      throw new Error('ProgressTracker not initialized');
    }

    await this.checkpointManager.markChapterFailed(this.bookId, chapterIndex);

    // Reload checkpoint to get updated state
    this.checkpoint = await this.checkpointManager.loadCheckpoint(this.bookId);

    Logger.warn(`Chapter ${chapterIndex} marked as failed for ${this.bookId}`);
  }

  /**
   * Get progress percentage (0-100)
   */
  getProgress(): number {
    if (!this.checkpoint || this.totalChapters === 0) {
      return 0;
    }

    return Math.round((this.checkpoint.completedChapters.length / this.totalChapters) * 100);
  }

  /**
   * Get detailed progress summary
   */
  getSummary(): ProgressSummary {
    if (!this.checkpoint) {
      return {
        total: this.totalChapters,
        completed: 0,
        failed: 0,
        remaining: this.totalChapters,
        percentage: 0,
      };
    }

    const completed = this.checkpoint.completedChapters.length;
    const failed = this.checkpoint.failedChapters.length;

    return {
      total: this.totalChapters,
      completed,
      failed,
      remaining: this.totalChapters - completed,
      percentage: this.getProgress(),
    };
  }

  /**
   * Check if all chapters are complete
   */
  isComplete(): boolean {
    if (!this.checkpoint) {
      return false;
    }

    return this.checkpoint.completedChapters.length === this.totalChapters;
  }

  /**
   * Finalize progress (mark as completed and delete checkpoint)
   */
  async finalize(): Promise<void> {
    if (!this.checkpoint) {
      return;
    }

    if (this.isComplete()) {
      this.checkpoint.status = 'completed';
      await this.checkpointManager.saveCheckpoint(this.checkpoint);
      await this.checkpointManager.deleteCheckpoint(this.bookId);
      Logger.info(`Progress finalized for ${this.bookId} - checkpoint deleted`);
    } else {
      Logger.warn(`Progress finalized for ${this.bookId} but not all chapters complete`);
    }
  }

  /**
   * Get the current checkpoint (for debugging/inspection)
   */
  getCheckpoint(): Checkpoint | null {
    return this.checkpoint;
  }
}
