import { Logger } from '../utils/logger.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    wordCount: number;
    hasImages: boolean;
    hasCodeBlocks: boolean;
  };
}

export interface ContentStats {
  wordCount: number;
  paragraphCount: number;
  imageCount: number;
  codeBlockCount: number;
}

export class ContentValidator {
  private readonly MIN_WORD_COUNT = 100;

  /**
   * Validate chapter content
   */
  validateChapter(content: string, chapterTitle: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for empty content
    if (!content || content.trim().length === 0) {
      errors.push('Content is empty');
    }

    // Check for error pages
    if (this.isErrorPage(content)) {
      errors.push('Content appears to be an error page (404, 403, etc.)');
    }

    // Check for anti-bot page
    if (this.isAntiBotPage(content)) {
      errors.push('Content appears to be an anti-bot challenge page');
    }

    // Check minimum content
    if (!this.hasMinimumContent(content)) {
      warnings.push(`Content has fewer than ${this.MIN_WORD_COUNT} words`);
    }

    // Get content statistics
    const stats = this.getContentStats(content);

    // Check for suspiciously low word count
    if (stats.wordCount < 50) {
      errors.push('Word count is suspiciously low (< 50 words)');
    }

    // Validation result
    const isValid = errors.length === 0;

    if (!isValid) {
      Logger.warn(`Validation failed for chapter: ${chapterTitle}`, {
        errors,
        warnings,
        wordCount: stats.wordCount,
      });
    } else if (warnings.length > 0) {
      Logger.debug(`Validation warnings for chapter: ${chapterTitle}`, { warnings });
    }

    return {
      isValid,
      errors,
      warnings,
      metadata: {
        wordCount: stats.wordCount,
        hasImages: stats.imageCount > 0,
        hasCodeBlocks: stats.codeBlockCount > 0,
      },
    };
  }

  /**
   * Check if content is an error page
   */
  isErrorPage(content: string): boolean {
    const lowerContent = content.toLowerCase();

    const errorPatterns = [
      '404',
      'page not found',
      'not found',
      '403',
      'access denied',
      'forbidden',
      '500',
      'internal server error',
      'rate limited',
      'too many requests',
      'service unavailable',
      'error occurred',
    ];

    // Check if page title or prominent text contains error indicators
    // Look for patterns in the first 1000 characters (likely header/title area)
    const headerContent = lowerContent.substring(0, 1000);

    for (const pattern of errorPatterns) {
      if (headerContent.includes(pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if content is an anti-bot challenge page
   */
  isAntiBotPage(content: string): boolean {
    const lowerContent = content.toLowerCase();

    const antiBotPatterns = [
      'captcha',
      'recaptcha',
      'are you a robot',
      'verify you are human',
      'cloudflare',
      'checking your browser',
      'ddos protection',
      'unusual traffic',
      'automated access',
    ];

    for (const pattern of antiBotPatterns) {
      if (lowerContent.includes(pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if content has minimum expected content
   */
  hasMinimumContent(content: string, minWords?: number): boolean {
    const stats = this.getContentStats(content);
    const threshold = minWords || this.MIN_WORD_COUNT;

    return stats.wordCount >= threshold;
  }

  /**
   * Extract content statistics
   */
  getContentStats(content: string): ContentStats {
    // Remove HTML tags for word counting
    const textOnly = content.replace(/<[^>]*>/g, ' ');

    // Count words (split by whitespace, filter empty)
    const words = textOnly
      .split(/\s+/)
      .filter((word) => word.trim().length > 0)
      .filter((word) => word.length > 1); // Filter single characters

    const wordCount = words.length;

    // Count paragraphs
    const paragraphMatches = content.match(/<p[^>]*>/gi);
    const paragraphCount = paragraphMatches ? paragraphMatches.length : 0;

    // Count images
    const imageMatches = content.match(/<img[^>]*>/gi);
    const imageCount = imageMatches ? imageMatches.length : 0;

    // Count code blocks
    const codeBlockMatches = content.match(/<pre[^>]*>|<code[^>]*>/gi);
    const codeBlockCount = codeBlockMatches ? codeBlockMatches.length : 0;

    return {
      wordCount,
      paragraphCount,
      imageCount,
      codeBlockCount,
    };
  }

  /**
   * Log validation result
   */
  logValidation(chapterTitle: string, result: ValidationResult): void {
    if (!result.isValid) {
      Logger.error(`Content validation failed for ${chapterTitle}`, undefined, {
        errors: result.errors,
        warnings: result.warnings,
      });
    } else if (result.warnings.length > 0) {
      Logger.warn(`Content validation warnings for ${chapterTitle}`, {
        warnings: result.warnings,
      });
    } else {
      Logger.debug(`Content validation passed for ${chapterTitle}`, {
        wordCount: result.metadata.wordCount,
      });
    }
  }
}
