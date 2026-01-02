import { Page } from 'playwright';
import { Logger } from '../utils/logger.js';
import { delay, getRequestDelay } from '../utils/delay.js';
import { withRetry, createRetryOptions } from '../utils/retry.js';
import { ContentValidator } from './content-validator.js';
import { CacheManager } from '../storage/cache-manager.js';
import { ProgressTracker } from '../progress/progress-tracker.js';
import type { ScraperConfig } from '../config/settings.js';

export interface Book {
  id: string;
  title: string;
  author: string;
  url: string;
  chapters: Chapter[];
}

export interface Chapter {
  title: string;
  url: string;
  index: number;
}

export class BookScraper {
  private page: Page;
  private validator: ContentValidator;
  private config: ScraperConfig;

  constructor(page: Page, validator: ContentValidator, config: ScraperConfig) {
    this.page = page;
    this.validator = validator;
    this.config = config;
  }

  async getBook(bookUrl: string): Promise<Book> {
    Logger.info(`Fetching book metadata from: ${bookUrl}`);

    // Navigate with retry
    await withRetry(
      async () => {
        await this.page.goto(bookUrl, {
          waitUntil: 'domcontentloaded',
          timeout: this.config.timeout
        });
        await this.page.waitForSelector('body', { timeout: 10000 });
      },
      createRetryOptions({
        maxAttempts: this.config.maxRetries,
        backoffBase: this.config.retryBackoffBase,
      })
    );

    // Extract book ID from URL
    const urlParts = bookUrl.split('/');
    const id = urlParts[urlParts.length - 2] || 'unknown';

    // Extract book title
    const title = await this.page.title();
    Logger.info(`Book title: ${title}`);

    // Extract author
    let author = 'Unknown';
    try {
      const authorElement = await this.page.$('[data-testid="book-authors"], .authors, meta[name="author"]');
      if (authorElement) {
        const tagName = await authorElement.evaluate((el) => el.tagName);
        if (tagName === 'META') {
          author = (await authorElement.getAttribute('content')) || 'Unknown';
        } else {
          author = (await authorElement.textContent()) || 'Unknown';
        }
      }
    } catch (error) {
      Logger.warn('Could not extract author information');
    }

    // Get all chapters
    const chapters = await this.getAllChapters();

    return {
      id,
      title: title.replace(' - O\'Reilly Media', '').trim(),
      author: author.trim(),
      url: bookUrl,
      chapters,
    };
  }

  async getAllChapters(): Promise<Chapter[]> {
    Logger.info('Extracting chapter list...');

    const chapters: Chapter[] = [];

    try {
      // First, navigate to reading view if we're on the book detail page
      const currentUrl = this.page.url();
      if (!currentUrl.includes('.xhtml')) {
        Logger.info('Navigating to reading view...');
        const continueButton = await this.page.$('text=Continue');
        if (continueButton) {
          await continueButton.click();
          await this.page.waitForTimeout(2000);
          Logger.info(`Navigated to: ${this.page.url()}`);
        }
      }

      // Look for table of contents in reading view
      const tocSelectors = [
        'aside',
        '[data-testid="toc-list"]',
        '.toc-list',
        '#toc',
        'nav[aria-label="Table of Contents"]',
        '[role="navigation"]',
      ];

      let tocElement = null;
      for (const selector of tocSelectors) {
        tocElement = await this.page.$(selector);
        if (tocElement) {
          Logger.info(`Found TOC with selector: ${selector}`);
          break;
        }
      }

      if (tocElement) {
        // Extract all chapter links (O'Reilly uses .xhtml files)
        const chapterLinks = await tocElement.$$('a[href$=".xhtml"]');

        for (let i = 0; i < chapterLinks.length; i++) {
          const link = chapterLinks[i];
          const href = await link.getAttribute('href');
          const text = await link.textContent();

          if (href && text) {
            const fullUrl = href.startsWith('http') ? href : `https://learning.oreilly.com${href}`;
            chapters.push({
              title: text.trim(),
              url: fullUrl,
              index: i,
            });
          }
        }
      }

      // If no chapters found in TOC, try to find chapter navigation
      if (chapters.length === 0) {
        Logger.warn('No chapters found in TOC, trying alternative method...');

        // Try to find chapter pagination or next links
        const currentUrl = this.page.url();
        if (currentUrl.includes('/chapter/')) {
          chapters.push({
            title: await this.page.title(),
            url: currentUrl,
            index: 0,
          });

          // Try to find next chapter links
          let hasNext = true;
          let index = 1;

          while (hasNext && index < 1000) {
            // Safety limit
            const nextButton = await this.page.$('[data-testid="statusBarNext"] a, a[aria-label="Next"], a[title="Next"], .next-chapter');

            if (nextButton) {
              const nextHref = await nextButton.getAttribute('href');
              if (nextHref) {
                const nextUrl = nextHref.startsWith('http')
                  ? nextHref
                  : `https://learning.oreilly.com${nextHref}`;

                // Navigate to next chapter with retry
                await withRetry(
                  async () => {
                    await this.page.goto(nextUrl, {
                      waitUntil: 'domcontentloaded',
                      timeout: this.config.timeout
                    });
                    await this.page.waitForSelector('body', { timeout: 10000 });
                  },
                  createRetryOptions({
                    maxAttempts: this.config.maxRetries,
                    backoffBase: this.config.retryBackoffBase,
                  })
                );
                const chapterTitle = await this.page.title();

                chapters.push({
                  title: chapterTitle,
                  url: nextUrl,
                  index,
                });

                index++;
                await delay(getRequestDelay());
              } else {
                hasNext = false;
              }
            } else {
              hasNext = false;
            }
          }
        }
      }

      Logger.info(`Found ${chapters.length} chapters`);
      return chapters;
    } catch (error) {
      Logger.error('Error extracting chapters:', error);
      return chapters;
    }
  }

  async getChapterContent(chapterUrl: string, chapterTitle: string): Promise<string> {
    Logger.info(`Scraping chapter: ${chapterUrl}`);

    // Navigate with retry
    await withRetry(
      async () => {
        await this.page.goto(chapterUrl, {
          waitUntil: 'domcontentloaded',
          timeout: this.config.timeout
        });
        await this.page.waitForSelector('body', { timeout: 10000 });
      },
      createRetryOptions({
        maxAttempts: this.config.maxRetries,
        backoffBase: this.config.retryBackoffBase,
      })
    );

    await delay(getRequestDelay());

    try {
      // Wait for content to load
      await this.page.waitForSelector('article, .chapter-content, main', { timeout: 10000 });

      // Extract the main content
      const contentSelectors = [
        'article',
        '.chapter-content',
        'main',
        '[role="main"]',
        '#sbo-rt-content',
      ];

      let content = '';
      for (const selector of contentSelectors) {
        const element = await this.page.$(selector);
        if (element) {
          content = (await element.innerHTML()) || '';
          if (content.length > 0) {
            break;
          }
        }
      }

      if (!content) {
        Logger.warn('Could not find chapter content with standard selectors, using body');
        content = await this.page.content();
      }

      // Validate content
      const validation = this.validator.validateChapter(content, chapterTitle);

      if (!validation.isValid) {
        const errorMsg = `Content validation failed: ${validation.errors.join(', ')}`;
        Logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (validation.warnings.length > 0) {
        Logger.warn(`Content warnings: ${validation.warnings.join(', ')}`, {
          wordCount: validation.metadata.wordCount,
        });
      }

      Logger.debug(`Chapter content validated`, {
        wordCount: validation.metadata.wordCount,
        hasImages: validation.metadata.hasImages,
        hasCodeBlocks: validation.metadata.hasCodeBlocks,
      });

      return content;
    } catch (error) {
      Logger.error('Error extracting chapter content:', error);
      throw error;
    }
  }

  async scrapeAllChapters(
    book: Book,
    progressTracker: ProgressTracker,
    cacheManager: CacheManager
  ): Promise<Map<number, string>> {
    const chapterContents = new Map<number, string>();
    const { chapters } = book;

    // Get chapters that need to be scraped (not yet completed)
    const remainingChapters = progressTracker.getRemainingChapters();
    Logger.info(`Total chapters: ${chapters.length}, Remaining: ${remainingChapters.length}`);

    for (const chapterIndex of remainingChapters) {
      const chapter = chapters[chapterIndex];
      if (!chapter) {
        Logger.warn(`Chapter index ${chapterIndex} not found in book chapters`);
        continue;
      }

      Logger.logChapterProgress(chapterIndex + 1, chapters.length, chapter.title);

      try {
        // Mark chapter as started
        await progressTracker.startChapter(chapterIndex);

        // Check cache first
        const cachedChapter = await cacheManager.getChapter(book.id, chapterIndex);

        let content: string;
        if (cachedChapter) {
          Logger.info(`Using cached content for chapter ${chapterIndex}: ${chapter.title}`);
          content = cachedChapter.content;
        } else {
          // Scrape chapter content
          content = await this.getChapterContent(chapter.url, chapter.title);

          // Save to cache
          await cacheManager.saveChapter(book.id, {
            chapterIndex,
            title: chapter.title,
            url: chapter.url,
            content,
            scrapedAt: new Date().toISOString(),
            hash: '', // Will be calculated in saveChapter
          });

          Logger.info(`Cached chapter ${chapterIndex}: ${chapter.title}`);
        }

        // Store in memory
        chapterContents.set(chapterIndex, content);

        // Mark chapter as completed
        await progressTracker.completeChapter(chapterIndex);

        // Rate limiting
        await delay(getRequestDelay());
      } catch (error) {
        Logger.error(`Failed to scrape chapter ${chapterIndex}: ${chapter.title}`, error);

        // Mark chapter as failed
        await progressTracker.failChapter(chapterIndex);

        // Continue with next chapter (graceful degradation)
        continue;
      }
    }

    // Load any cached chapters that were already completed
    const completedChapters = chapters.length - remainingChapters.length;
    if (completedChapters > 0) {
      Logger.info(`Loading ${completedChapters} completed chapters from cache...`);

      for (let i = 0; i < chapters.length; i++) {
        if (!chapterContents.has(i)) {
          const cachedChapter = await cacheManager.getChapter(book.id, i);
          if (cachedChapter) {
            chapterContents.set(i, cachedChapter.content);
          }
        }
      }
    }

    const summary = progressTracker.getSummary();
    Logger.info('Scraping summary:', {
      total: summary.total,
      completed: summary.completed,
      failed: summary.failed,
      percentage: summary.percentage,
    });

    return chapterContents;
  }

  /**
   * Detect if current page is an anti-bot challenge
   */
  async detectAntiBotChallenge(): Promise<boolean> {
    try {
      const content = await this.page.content();
      return this.validator.isAntiBotPage(content);
    } catch (error) {
      Logger.error('Error detecting anti-bot challenge:', error);
      return false;
    }
  }

  /**
   * Handle rate limiting by waiting
   */
  async handleRateLimiting(retryAfter?: number): Promise<void> {
    const waitTime = retryAfter || 60; // Default 60 seconds
    Logger.warn(`Rate limited. Waiting ${waitTime} seconds before retry...`);
    await delay(waitTime * 1000);
  }
}
