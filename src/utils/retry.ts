import { Logger } from './logger.js';
import { delay } from './delay.js';

export interface RetryOptions {
  maxAttempts: number;
  backoffBase: number; // Base for exponential backoff (in seconds)
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { maxAttempts, backoffBase, onRetry, shouldRetry } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this error
      const canRetry = shouldRetry ? shouldRetry(lastError) : isRetryableError(lastError);

      if (!canRetry || attempt === maxAttempts - 1) {
        // Don't retry non-retryable errors or if this was the last attempt
        throw lastError;
      }

      // Calculate backoff delay with jitter
      const backoffDelay = getBackoffDelay(attempt, backoffBase);

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      } else {
        Logger.logRetry(attempt + 1, maxAttempts, lastError);
      }

      // Wait before retrying
      await delay(backoffDelay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Check if an error is retryable (network errors, timeouts, rate limits, server errors)
 */
export function isRetryableError(error: Error | unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network errors
  if (
    name.includes('networkerror') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('etimedout') ||
    message.includes('socket hang up')
  ) {
    return true;
  }

  // Timeout errors
  if (name.includes('timeouterror') || message.includes('timeout')) {
    return true;
  }

  // HTTP status code errors (if error has statusCode property)
  const statusCode = (error as any).statusCode || (error as any).status;
  if (statusCode) {
    // 429 Too Many Requests
    if (statusCode === 429) return true;

    // 5xx Server errors (except 501 Not Implemented)
    if (statusCode >= 500 && statusCode < 600 && statusCode !== 501) {
      return true;
    }
  }

  // Playwright-specific errors
  if (message.includes('page.goto') && message.includes('timeout')) {
    return true;
  }

  if (message.includes('navigation')) {
    return true;
  }

  // By default, don't retry
  return false;
}

/**
 * Calculate exponential backoff delay with jitter
 * Formula: (base^attempt * 1000ms) with ±20% random jitter
 */
export function getBackoffDelay(attempt: number, base: number): number {
  // Calculate base delay: base^attempt seconds converted to milliseconds
  const baseDelay = Math.pow(base, attempt) * 1000;

  // Add random jitter (±20%)
  const jitter = 0.2;
  const randomFactor = 1 + (Math.random() * 2 - 1) * jitter; // Range: 0.8 to 1.2

  const delayWithJitter = Math.round(baseDelay * randomFactor);

  // Cap at 60 seconds
  const maxDelay = 60000;
  return Math.min(delayWithJitter, maxDelay);
}

/**
 * Create a retry options object with default values
 */
export function createRetryOptions(overrides?: Partial<RetryOptions>): RetryOptions {
  return {
    maxAttempts: 3,
    backoffBase: 2,
    ...overrides,
  };
}
