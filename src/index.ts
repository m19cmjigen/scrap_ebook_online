import { config } from 'dotenv';
import { chromium } from 'playwright';
import { OReillyAuth } from './auth/auth.js';
import { BookScraper } from './scrapers/book-scraper.js';
import { PDFGenerator } from './pdf/pdf-generator.js';
import { Logger } from './utils/logger.js';
import { loadConfig } from './config/settings.js';
import { CacheManager } from './storage/cache-manager.js';
import { ManifestManager } from './storage/manifest-manager.js';
import { StorageCoordinator } from './storage/storage-coordinator.js';
import { CheckpointManager } from './progress/checkpoint-manager.js';
import { ProgressTracker } from './progress/progress-tracker.js';
import { ContentValidator } from './scrapers/content-validator.js';
import { sanitizeBookId } from './utils/sanitize.js';
import path from 'path';
import { promises as fs } from 'fs';

config();

interface UserConfig {
  email: string;
  password: string;
  outputDir: string;
  headless: boolean;
  cookiesPath: string;
}

function getUserConfig(): UserConfig {
  const email = process.env.OREILLY_EMAIL;
  const password = process.env.OREILLY_PASSWORD;
  const outputDir = process.env.OUTPUT_DIR || './downloads';
  const headless = process.env.HEADLESS !== 'false';
  const cookiesPath = process.env.COOKIES_PATH || './session/cookies.json';

  if (!email || !password) {
    throw new Error('OREILLY_EMAIL and OREILLY_PASSWORD must be set in .env file');
  }

  return {
    email,
    password,
    outputDir,
    headless,
    cookiesPath,
  };
}

interface BookScrapingResult {
  bookUrl: string;
  bookId: string;
  success: boolean;
  title?: string;
  outputPath?: string;
  error?: Error;
  chapterCount?: number;
  scrapedChapters?: number;
}

/**
 * Scrape a single book
 */
async function scrapeBook(
  bookUrl: string,
  bookIndex: number,
  totalBooks: number,
  appConfig: ReturnType<typeof loadConfig>,
  storageCoordinator: StorageCoordinator,
  checkpointManager: CheckpointManager,
  auth: OReillyAuth
): Promise<BookScrapingResult> {
  const bookId = sanitizeBookId(bookUrl);
  const result: BookScrapingResult = {
    bookUrl,
    bookId,
    success: false,
  };

  try {
    Logger.info(`\n${'='.repeat(60)}`);
    Logger.info(`📚 Book ${bookIndex + 1}/${totalBooks}`);
    Logger.info(`URL: ${bookUrl}`);
    Logger.info(`${'='.repeat(60)}\n`);

    // Check if book already scraped
    const manifestManager = new ManifestManager(
      path.join(appConfig.storage.dataDir, 'manifest.json')
    );
    const existingEntry = await manifestManager.getBook(bookId);
    if (existingEntry?.status === 'complete') {
      Logger.info(`✓ Book already scraped: ${existingEntry.title}`);
      Logger.info(`  PDF location: ${existingEntry.outputPath}`);
      result.success = true;
      result.title = existingEntry.title;
      result.outputPath = existingEntry.outputPath;
      result.chapterCount = existingEntry.chapterCount;
      result.scrapedChapters = existingEntry.chapterCount;
      return result;
    }

    const page = await auth.getPage();

    // Initialize scraper with validation and config
    const validator = new ContentValidator();
    const scraper = new BookScraper(page, validator, appConfig.scraper);

    // Get book metadata
    Logger.info('Fetching book metadata...');
    const book = await scraper.getBook(bookUrl);
    Logger.logScrapeStart(bookId, book.title);
    Logger.info(`Book: ${book.title}`);
    Logger.info(`Author: ${book.author}`);
    Logger.info(`Chapters: ${book.chapters.length}`);

    result.title = book.title;
    result.chapterCount = book.chapters.length;

    // Initialize progress tracker (resume from checkpoint if exists)
    const progressTracker = new ProgressTracker(
      checkpointManager,
      bookId,
      bookUrl,
      book.chapters.length
    );
    await progressTracker.initialize();

    const remaining = progressTracker.getRemainingChapters();
    if (remaining.length < book.chapters.length) {
      Logger.info(`Resuming from checkpoint: ${remaining.length} chapters remaining`);
    }

    // Scrape all chapters with cache and progress management
    Logger.info('Starting chapter scraping...');
    const chapterContents = await scraper.scrapeAllChapters(
      book,
      progressTracker,
      new CacheManager(appConfig.storage.cacheDir)
    );

    Logger.info(`Successfully scraped ${chapterContents.size}/${book.chapters.length} chapters`);
    result.scrapedChapters = chapterContents.size;

    // Save book (PDF generation + manifest update)
    Logger.info('Saving book...');
    const manifestEntry = await storageCoordinator.saveBook(page, book, chapterContents);

    Logger.info('✅ Scraping completed successfully!');
    Logger.info(`Scraped: ${chapterContents.size}/${book.chapters.length} chapters`);
    Logger.info(`PDF saved: ${manifestEntry.outputPath}`);

    result.success = true;
    result.outputPath = manifestEntry.outputPath;

    // Finalize progress (delete checkpoint)
    await progressTracker.finalize();

    return result;
  } catch (error) {
    Logger.error(`Failed to scrape book ${bookIndex + 1}/${totalBooks}:`, error);
    result.error = error as Error;
    return result;
  }
}

async function main() {
  console.log('O\'Reilly Ebook Scraper - Multi-Book Edition');
  console.log('============================================\n');

  try {
    // 1. Load configurations
    const userCfg = getUserConfig();
    const appConfig = loadConfig();

    // 2. Initialize logger
    await Logger.init(appConfig.logging);
    Logger.info('Scraper starting...');
    Logger.info(`Headless mode: ${userCfg.headless}`);
    Logger.info(`Books to scrape: ${appConfig.scraper.bookUrls.length}\n`);

    // 3. Initialize storage components
    const cacheManager = new CacheManager(appConfig.storage.cacheDir);
    const manifestManager = new ManifestManager(
      path.join(appConfig.storage.dataDir, 'manifest.json')
    );
    const pdfGenerator = new PDFGenerator();
    const storageCoordinator = new StorageCoordinator(
      cacheManager,
      manifestManager,
      pdfGenerator,
      appConfig.storage
    );
    await storageCoordinator.initialize();
    Logger.info('Storage initialized');

    // 4. Initialize progress management
    const checkpointManager = new CheckpointManager(appConfig.storage.progressDir);

    // 5. Launch browser and authenticate
    Logger.info('Launching browser...');
    const browser = await chromium.launch({
      headless: userCfg.headless,
      slowMo: parseInt(process.env.SLOW_MO || '0', 10),
      args: [
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const auth = new OReillyAuth(browser);

    try {
      // Try to load existing session
      const cookiesDirPath = path.dirname(userCfg.cookiesPath);
      await fs.mkdir(cookiesDirPath, { recursive: true });

      let authenticated = false;

      try {
        Logger.info('Attempting to load saved session...');
        await auth.loadCookies(userCfg.cookiesPath);
        const page = await auth.getPage();
        await page.goto(cfg.bookUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('body', { timeout: 10000 });
        authenticated = await auth.isAuthenticated();

        if (authenticated) {
          Logger.info('Successfully authenticated using saved session');
        } else {
          Logger.warn('Saved session is invalid, will login with credentials');
        }
      } catch (error) {
        Logger.warn('Could not load saved session, will login with credentials');
      }

      // Login if not authenticated
      if (!authenticated) {
        Logger.info('Logging in to O\'Reilly...');
        await auth.login({
          email: userCfg.email,
          password: userCfg.password,
        });

        // Save session for next time
        await auth.saveCookies(userCfg.cookiesPath);
      }

      // 6. Scrape all books
      const results: BookScrapingResult[] = [];
      const bookUrls = appConfig.scraper.bookUrls;

      for (let i = 0; i < bookUrls.length; i++) {
        const bookUrl = bookUrls[i];
        const result = await scrapeBook(
          bookUrl,
          i,
          bookUrls.length,
          appConfig,
          storageCoordinator,
          checkpointManager,
          auth
        );
        results.push(result);
      }

      // 7. Print summary
      Logger.info('\n' + '='.repeat(60));
      Logger.info('📊 Overall Summary');
      Logger.info('='.repeat(60));
      Logger.info(`Total books: ${results.length}`);
      Logger.info(`Successful: ${results.filter(r => r.success).length}`);
      Logger.info(`Failed: ${results.filter(r => !r.success).length}\n`);

      for (const result of results) {
        if (result.success) {
          Logger.info(`✅ ${result.title || result.bookId}`);
          Logger.info(`   Chapters: ${result.scrapedChapters}/${result.chapterCount}`);
          Logger.info(`   PDF: ${result.outputPath}`);
        } else {
          Logger.error(`❌ ${result.bookUrl}`);
          Logger.error(`   Error: ${result.error?.message || 'Unknown error'}`);
        }
        Logger.info('');
      }

      Logger.info('Done!');

      // Clean up
      await auth.close();
      await browser.close();
    } catch (error) {
      Logger.error('Fatal error during scraping', error);
      await auth.close();
      await browser.close();
      throw error;
    } finally {
      await Logger.flush();
    }
  } catch (error) {
    Logger.error('Fatal error:', error);
    await Logger.flush();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
