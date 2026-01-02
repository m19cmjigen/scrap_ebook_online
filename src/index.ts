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
  bookUrl: string;
  outputDir: string;
  headless: boolean;
  cookiesPath: string;
}

function getUserConfig(): UserConfig {
  const email = process.env.OREILLY_EMAIL;
  const password = process.env.OREILLY_PASSWORD;
  const bookUrl = process.env.BOOK_URL || process.argv[2];
  const outputDir = process.env.OUTPUT_DIR || './downloads';
  const headless = process.env.HEADLESS !== 'false';
  const cookiesPath = process.env.COOKIES_PATH || './session/cookies.json';

  if (!email || !password) {
    throw new Error('OREILLY_EMAIL and OREILLY_PASSWORD must be set in .env file');
  }

  if (!bookUrl) {
    throw new Error('BOOK_URL must be set in .env file or provided as command line argument');
  }

  return {
    email,
    password,
    bookUrl,
    outputDir,
    headless,
    cookiesPath,
  };
}

async function main() {
  console.log('O\'Reilly Ebook Scraper');
  console.log('======================\n');

  try {
    // 1. Load configurations
    const userCfg = getUserConfig();
    const appConfig = loadConfig();

    // 2. Initialize logger
    await Logger.init(appConfig.logging);
    Logger.info('Scraper starting...');
    Logger.info(`Headless mode: ${userCfg.headless}`);
    Logger.info(`Book URL: ${userCfg.bookUrl}\n`);

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

    // 4. Extract book ID
    const bookId = sanitizeBookId(userCfg.bookUrl);
    Logger.info(`Book ID: ${bookId}`);

    // 5. Check if book already scraped
    const existingEntry = await manifestManager.getBook(bookId);
    if (existingEntry?.status === 'complete') {
      Logger.info(`Book already scraped: ${existingEntry.title}`);
      Logger.info(`PDF location: ${existingEntry.outputPath}`);
      Logger.info('Use --force flag to re-scrape (not yet implemented)');
      await Logger.flush();
      return;
    }

    // 6. Initialize progress management
    const checkpointManager = new CheckpointManager(appConfig.storage.progressDir);

    // 7. Launch browser and authenticate
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
        await page.goto(userCfg.bookUrl, { waitUntil: 'domcontentloaded', timeout: appConfig.scraper.timeout });
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

      const page = await auth.getPage();

      // 8. Initialize scraper with validation and config
      const validator = new ContentValidator();
      const scraper = new BookScraper(page, validator, appConfig.scraper);

      // 9. Get book metadata
      Logger.info('Fetching book metadata...');
      const book = await scraper.getBook(userCfg.bookUrl);
      Logger.logScrapeStart(bookId, book.title);
      Logger.info(`Book: ${book.title}`);
      Logger.info(`Author: ${book.author}`);
      Logger.info(`Chapters: ${book.chapters.length}`);

      // 10. Initialize progress tracker (resume from checkpoint if exists)
      const progressTracker = new ProgressTracker(
        checkpointManager,
        bookId,
        userCfg.bookUrl,
        book.chapters.length
      );
      await progressTracker.initialize();

      const remaining = progressTracker.getRemainingChapters();
      if (remaining.length < book.chapters.length) {
        Logger.info(`Resuming from checkpoint: ${remaining.length} chapters remaining`);
      }

      // 11. Scrape all chapters with cache and progress management
      Logger.info('Starting chapter scraping...');
      const chapterContents = await scraper.scrapeAllChapters(
        book,
        progressTracker,
        cacheManager
      );

      Logger.info(`Successfully scraped ${chapterContents.size}/${book.chapters.length} chapters`);

      // 12. Save book (PDF generation + manifest update)
      Logger.info('Saving book...');
      const manifestEntry = await storageCoordinator.saveBook(page, book, chapterContents);

      Logger.info('✅ Scraping completed successfully!');
      Logger.info(`Scraped: ${chapterContents.size}/${book.chapters.length} chapters`);
      Logger.info(`PDF saved: ${manifestEntry.outputPath}`);

      // 13. Finalize progress (delete checkpoint)
      await progressTracker.finalize();

      // Clean up
      await auth.close();
      await browser.close();

      Logger.info('Done!');
    } catch (error) {
      Logger.error('Scraping failed', error);
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
