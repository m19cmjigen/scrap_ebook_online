import { promises as fs } from 'fs';
import { createWriteStream, WriteStream } from 'fs';
import path from 'path';
import type { LoggingConfig } from '../config/settings.js';

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class Logger {
  private static config: LoggingConfig | null = null;
  private static fileStream: WriteStream | null = null;
  private static logFilePath: string | null = null;
  private static initialized = false;

  /**
   * Initialize logger with configuration
   */
  static async init(config: LoggingConfig): Promise<void> {
    this.config = config;
    this.initialized = true;

    if (config.file) {
      // Create logs directory if it doesn't exist
      const logsDir = path.dirname(config.maxFileSize.toString()); // This is a hack to get logsDir from context
      // We'll pass logsDir separately in the actual implementation

      // For now, use a fixed path
      const logsDir2 = './logs';
      await fs.mkdir(logsDir2, { recursive: true });

      this.logFilePath = path.join(logsDir2, 'scraper.log');
      this.fileStream = createWriteStream(this.logFilePath, { flags: 'a' });
    }
  }

  /**
   * Flush and close log file stream
   */
  static async flush(): Promise<void> {
    if (this.fileStream) {
      return new Promise((resolve, reject) => {
        this.fileStream!.end((err?: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  /**
   * Check if a log level should be output based on configuration
   */
  private static shouldLog(level: LogLevel): boolean {
    if (!this.config) return true; // Log everything if not initialized

    const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const configLevel = levels.indexOf(this.config.level);
    const messageLevel = levels.indexOf(level);

    return messageLevel >= configLevel;
  }

  /**
   * Write log entry to file
   */
  private static writeToFile(entry: LogEntry): void {
    if (this.fileStream && this.config?.file) {
      const logLine = JSON.stringify(entry) + '\n';
      this.fileStream.write(logLine);
    }
  }

  /**
   * Format log entry for console output
   */
  private static formatConsole(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    let output = `[${level}] ${message}`;

    if (context && Object.keys(context).length > 0) {
      output += ` ${JSON.stringify(context)}`;
    }

    return output;
  }

  /**
   * Create log entry object
   */
  private static createLogEntry(
    level: LogLevel,
    message: string,
    error?: Error,
    context?: Record<string, unknown>
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (context) {
      entry.context = context;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  static info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('INFO')) return;

    const entry = this.createLogEntry('INFO', message, undefined, context);

    if (this.config?.console !== false) {
      console.log(this.formatConsole('INFO', message, context));
    }

    this.writeToFile(entry);
  }

  static error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    if (!this.shouldLog('ERROR')) return;

    const err = error instanceof Error ? error : undefined;
    const entry = this.createLogEntry('ERROR', message, err, context);

    if (this.config?.console !== false) {
      if (err) {
        console.error(this.formatConsole('ERROR', message, context), err);
      } else {
        console.error(this.formatConsole('ERROR', message, context));
      }
    }

    this.writeToFile(entry);
  }

  static warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('WARN')) return;

    const entry = this.createLogEntry('WARN', message, undefined, context);

    if (this.config?.console !== false) {
      console.warn(this.formatConsole('WARN', message, context));
    }

    this.writeToFile(entry);
  }

  static debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('DEBUG')) return;

    const entry = this.createLogEntry('DEBUG', message, undefined, context);

    if (this.config?.console !== false) {
      console.debug(this.formatConsole('DEBUG', message, context));
    }

    this.writeToFile(entry);
  }

  // New domain-specific logging methods

  /**
   * Log the start of a book scraping operation
   */
  static logScrapeStart(bookId: string, title: string): void {
    this.info('Starting book scrape', { bookId, title });
  }

  /**
   * Log chapter scraping progress
   */
  static logChapterProgress(index: number, total: number, title: string): void {
    const percentage = Math.round((index / total) * 100);
    this.info(`Progress: ${index}/${total} (${percentage}%) - ${title}`, {
      chapterIndex: index,
      totalChapters: total,
      percentage,
      chapterTitle: title,
    });
  }

  /**
   * Log retry attempt
   */
  static logRetry(attempt: number, max: number, error: Error): void {
    this.warn(`Retry attempt ${attempt}/${max}`, {
      attempt,
      maxAttempts: max,
      errorMessage: error.message,
    });
  }
}
