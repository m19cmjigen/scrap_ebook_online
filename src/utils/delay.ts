/**
 * Sleep for specified milliseconds
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get delay from environment or use default
 */
export function getRequestDelay(): number {
  const delay = process.env.REQUEST_DELAY;
  return delay ? parseInt(delay, 10) : 2000;
}
