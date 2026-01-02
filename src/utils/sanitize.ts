/**
 * Sanitize a string to be safe for use as a filename
 * Removes or replaces invalid filename characters
 */
export function sanitizeFilename(input: string): string {
  // Remove invalid filename characters: / \ : * ? " < > |
  let sanitized = input.replace(/[/\\:*?"<>|]/g, '_');

  // Collapse multiple underscores/hyphens into single
  sanitized = sanitized.replace(/_{2,}/g, '_').replace(/-{2,}/g, '-');

  // Trim leading/trailing underscores and hyphens
  sanitized = sanitized.replace(/^[_-]+|[_-]+$/g, '');

  // Truncate to safe length (255 chars is typical max filename length)
  const maxLength = 200; // Leave room for extensions and timestamps
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    // Trim trailing underscores/hyphens after truncation
    sanitized = sanitized.replace(/[_-]+$/, '');
  }

  // If somehow empty after sanitization, provide default
  if (!sanitized) {
    sanitized = 'untitled';
  }

  return sanitized;
}

/**
 * Extract and sanitize book ID from O'Reilly URL
 * Example: https://learning.oreilly.com/library/view/book-title/9781234567890/
 * Returns: 9781234567890 or book-title
 */
export function sanitizeBookId(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter((part) => part.length > 0);

    // O'Reilly URLs typically: /library/view/{book-title}/{book-id}/...
    // Try to get the book ID (usually the last meaningful part before chapter paths)
    if (pathParts.length >= 4 && pathParts[0] === 'library' && pathParts[1] === 'view') {
      // Prefer numeric ID (ISBN) if available
      const possibleId = pathParts[3];
      if (possibleId && /^\d+$/.test(possibleId)) {
        return possibleId;
      }

      // Fall back to book title
      const bookTitle = pathParts[2];
      return sanitizeFilename(bookTitle);
    }

    // Fallback: use sanitized path
    return sanitizeFilename(pathParts.join('_'));
  } catch (error) {
    // If URL parsing fails, use sanitized input
    return sanitizeFilename(url);
  }
}

/**
 * Create a timestamp string suitable for filenames
 * Format: YYYY-MM-DD_HH-mm-ss
 */
export function createTimestamp(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Create a sanitized filename with timestamp
 * Example: "My Book Title" -> "My_Book_Title_2025-01-02_15-30-45"
 */
export function createTimestampedFilename(baseName: string, extension?: string): string {
  const sanitized = sanitizeFilename(baseName);
  const timestamp = createTimestamp();
  const ext = extension ? `.${extension.replace(/^\./, '')}` : '';

  return `${sanitized}_${timestamp}${ext}`;
}
