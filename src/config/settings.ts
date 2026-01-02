import { config as dotenvConfig } from 'dotenv';
import { readFileSync, existsSync } from 'fs';

dotenvConfig();

export interface ScraperConfig {
  rateLimit: number; // ms between requests
  maxRetries: number; // retry attempts
  retryBackoffBase: number; // exponential backoff base (seconds)
  timeout: number; // request timeout (ms)
  bookUrls: string[]; // URLs to scrape
}

export interface StorageConfig {
  dataDir: string; // ./data
  cacheDir: string; // ./data/cache
  booksDir: string; // ./data/books
  progressDir: string; // ./data/progress
  logsDir: string; // ./logs
}

export interface LoggingConfig {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  console: boolean;
  file: boolean;
  maxFileSize: number; // bytes
  maxFiles: number; // number of log files to keep
}

export interface Config {
  scraper: ScraperConfig;
  storage: StorageConfig;
  logging: LoggingConfig;
}

/**
 * Load book URLs from environment variables or file
 */
function loadBookUrls(): string[] {
  // Priority: BOOK_URLS_FILE > BOOK_URLS > BOOK_URL (legacy)

  // Option 1: Load from file
  if (process.env.BOOK_URLS_FILE) {
    const filePath = process.env.BOOK_URLS_FILE;
    if (!existsSync(filePath)) {
      throw new Error(`BOOK_URLS_FILE not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf-8');
    const urls = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')); // Skip empty lines and comments

    if (urls.length === 0) {
      throw new Error(`BOOK_URLS_FILE is empty: ${filePath}`);
    }

    return urls;
  }

  // Option 2: Load from comma-separated env var
  if (process.env.BOOK_URLS) {
    const urls = process.env.BOOK_URLS
      .split(',')
      .map(url => url.trim())
      .filter(url => url);

    if (urls.length === 0) {
      throw new Error('BOOK_URLS is empty');
    }

    return urls;
  }

  // Option 3: Legacy single URL
  if (process.env.BOOK_URL) {
    return [process.env.BOOK_URL];
  }

  throw new Error('No book URLs specified. Set BOOK_URL, BOOK_URLS, or BOOK_URLS_FILE');
}

/**
 * Load configuration from environment variables with sensible defaults
 */
export function loadConfig(): Config {
  const dataDir = process.env.DATA_DIR || './data';

  const config: Config = {
    scraper: {
      rateLimit: parseInt(process.env.REQUEST_DELAY || '2000', 10),
      maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
      retryBackoffBase: parseInt(process.env.RETRY_BACKOFF_BASE || '2', 10),
      timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
      bookUrls: loadBookUrls(),
    },
    storage: {
      dataDir,
      cacheDir: `${dataDir}/cache`,
      booksDir: `${dataDir}/books`,
      progressDir: `${dataDir}/progress`,
      logsDir: process.env.LOGS_DIR || './logs',
    },
    logging: {
      level: (process.env.LOG_LEVEL as LoggingConfig['level']) || 'INFO',
      console: true,
      file: process.env.LOG_TO_FILE === 'true',
      maxFileSize: parseInt(process.env.LOG_MAX_SIZE || '10485760', 10), // 10MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
    },
  };

  // Validate configuration
  validateConfig(config);

  return config;
}

/**
 * Validate configuration values
 */
function validateConfig(config: Config): void {
  if (config.scraper.rateLimit < 0) {
    throw new Error('REQUEST_DELAY must be >= 0');
  }

  if (config.scraper.maxRetries < 0) {
    throw new Error('MAX_RETRIES must be >= 0');
  }

  if (config.scraper.retryBackoffBase < 1) {
    throw new Error('RETRY_BACKOFF_BASE must be >= 1');
  }

  if (config.scraper.timeout < 1000) {
    throw new Error('REQUEST_TIMEOUT must be >= 1000ms');
  }

  if (!['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(config.logging.level)) {
    throw new Error('LOG_LEVEL must be one of: DEBUG, INFO, WARN, ERROR');
  }

  if (config.logging.maxFileSize < 1024) {
    throw new Error('LOG_MAX_SIZE must be >= 1024 bytes');
  }

  if (config.logging.maxFiles < 1) {
    throw new Error('LOG_MAX_FILES must be >= 1');
  }
}

// Export singleton instance
export const globalConfig = loadConfig();
