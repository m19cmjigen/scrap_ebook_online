import { config } from 'dotenv';
import { chromium } from 'playwright';
import { OReillyAuth } from './auth/auth.js';
import { BookScraper } from './scrapers/book-scraper.js';
import { PDFGenerator } from './pdf/pdf-generator.js';
import { Logger } from './utils/logger.js';
import path from 'path';
import { promises as fs } from 'fs';

config();

interface Config {
  email: string;
  password: string;
  bookUrl: string;
  outputDir: string;
  headless: boolean;
  cookiesPath: string;
}

function getConfig(): Config {
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
    const cfg = getConfig();

    Logger.info(`Headless mode: ${cfg.headless}`);
    Logger.info(`Output directory: ${cfg.outputDir}`);
    Logger.info(`Book URL: ${cfg.bookUrl}\n`);

    // Launch browser
    Logger.info('Launching browser...');
    const browser = await chromium.launch({
      headless: cfg.headless,
      slowMo: parseInt(process.env.SLOW_MO || '0', 10),
      args: [
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const auth = new OReillyAuth(browser);

    try {
      // Try to load existing session
      const cookiesDirPath = path.dirname(cfg.cookiesPath);
      await fs.mkdir(cookiesDirPath, { recursive: true });

      let authenticated = false;

      try {
        Logger.info('Attempting to load saved session...');
        await auth.loadCookies(cfg.cookiesPath);
        const page = await auth.getPage();
        await page.goto(cfg.bookUrl, { waitUntil: 'networkidle' });
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
          email: cfg.email,
          password: cfg.password,
        });

        // Save session for next time
        await auth.saveCookies(cfg.cookiesPath);
      }

      const page = await auth.getPage();

      // Initialize scraper
      const scraper = new BookScraper(page);

      // Get book metadata
      Logger.info('\nFetching book information...');
      const book = await scraper.getBook(cfg.bookUrl);

      Logger.info(`\nBook: ${book.title}`);
      Logger.info(`Author: ${book.author}`);
      Logger.info(`Chapters: ${book.chapters.length}\n`);

      // Scrape all chapters
      Logger.info('Starting chapter scraping...\n');
      const chapterContents = await scraper.scrapeAllChapters(book.chapters);

      Logger.info(`\nSuccessfully scraped ${chapterContents.size}/${book.chapters.length} chapters`);

      // Generate PDF
      Logger.info('\nGenerating PDF...');
      const pdfGenerator = new PDFGenerator();
      const pdfPath = await pdfGenerator.generateBookPDF(page, book, chapterContents, cfg.outputDir);

      Logger.info(`\n✓ PDF generated successfully!`);
      Logger.info(`Output: ${pdfPath}`);

      // Clean up
      await auth.close();
      await browser.close();

      Logger.info('\nDone!');
    } catch (error) {
      await auth.close();
      await browser.close();
      throw error;
    }
  } catch (error) {
    Logger.error('Fatal error:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
