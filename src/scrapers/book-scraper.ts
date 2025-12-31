import { Page } from 'playwright';
import { Logger } from '../utils/logger.js';
import { delay, getRequestDelay } from '../utils/delay.js';

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

  constructor(page: Page) {
    this.page = page;
  }

  async getBook(bookUrl: string): Promise<Book> {
    Logger.info(`Fetching book metadata from: ${bookUrl}`);

    await this.page.goto(bookUrl, { waitUntil: 'networkidle' });

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
      // Look for table of contents
      const tocSelectors = [
        '[data-testid="toc-list"]',
        '.toc-list',
        '#toc',
        'nav[aria-label="Table of Contents"]',
        '[role="navigation"] ul',
      ];

      let tocElement = null;
      for (const selector of tocSelectors) {
        tocElement = await this.page.$(selector);
        if (tocElement) {
          break;
        }
      }

      if (tocElement) {
        // Extract all chapter links
        const chapterLinks = await tocElement.$$('a[href*="/chapter/"]');

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
            const nextButton = await this.page.$('a[aria-label="Next"], a[title="Next"],.next-chapter');

            if (nextButton) {
              const nextHref = await nextButton.getAttribute('href');
              if (nextHref) {
                const nextUrl = nextHref.startsWith('http')
                  ? nextHref
                  : `https://learning.oreilly.com${nextHref}`;

                // Navigate to next chapter to get title
                await this.page.goto(nextUrl, { waitUntil: 'networkidle' });
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

  async getChapterContent(chapterUrl: string): Promise<string> {
    Logger.info(`Scraping chapter: ${chapterUrl}`);

    await this.page.goto(chapterUrl, { waitUntil: 'networkidle' });
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

      return content;
    } catch (error) {
      Logger.error('Error extracting chapter content:', error);
      throw error;
    }
  }

  async scrapeAllChapters(chapters: Chapter[]): Promise<Map<number, string>> {
    const chapterContents = new Map<number, string>();

    for (const chapter of chapters) {
      Logger.info(`Scraping chapter ${chapter.index + 1}/${chapters.length}: ${chapter.title}`);

      try {
        const content = await this.getChapterContent(chapter.url);
        chapterContents.set(chapter.index, content);

        // Rate limiting
        await delay(getRequestDelay());
      } catch (error) {
        Logger.error(`Failed to scrape chapter ${chapter.index}: ${chapter.title}`, error);
        // Continue with next chapter
      }
    }

    return chapterContents;
  }
}
