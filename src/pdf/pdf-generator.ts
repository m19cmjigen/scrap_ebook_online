import { Page } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';
import { Logger } from '../utils/logger.js';
import { Book, Chapter } from '../scrapers/book-scraper.js';

export interface PDFOptions {
  outputPath: string;
  title?: string;
  displayHeaderFooter?: boolean;
  printBackground?: boolean;
}

export class PDFGenerator {
  async generateFromPage(page: Page, options: PDFOptions): Promise<void> {
    Logger.info(`Generating PDF: ${options.outputPath}`);

    try {
      await page.pdf({
        path: options.outputPath,
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
        displayHeaderFooter: options.displayHeaderFooter ?? false,
        printBackground: options.printBackground ?? true,
        preferCSSPageSize: false,
      });

      Logger.info(`PDF generated successfully: ${options.outputPath}`);
    } catch (error) {
      Logger.error('Failed to generate PDF:', error);
      throw error;
    }
  }

  async generateFromHTML(
    page: Page,
    html: string,
    options: PDFOptions,
    title?: string,
  ): Promise<void> {
    Logger.info(`Generating PDF from HTML: ${options.outputPath}`);

    try {
      // Fix image URLs to be absolute
      const fixedHTML = this.fixImageURLs(html);

      // Create a complete HTML document with styling
      const styledHTML = this.wrapHTMLWithStyles(fixedHTML, title);

      // Set the content and wait for network to be idle (all resources loaded)
      await page.setContent(styledHTML, { waitUntil: 'load' });

      // Wait for network idle to ensure all images are loaded
      try {
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      } catch (error) {
        // If timeout, continue anyway - some images might not load
        Logger.warn('Network idle timeout - some images may not have loaded');
      }

      // Additional wait to ensure rendering is complete
      await page.waitForTimeout(1500);

      // Generate PDF
      await this.generateFromPage(page, options);
    } catch (error) {
      Logger.error('Failed to generate PDF from HTML:', error);
      throw error;
    }
  }

  async generateBookPDF(
    page: Page,
    book: Book,
    chapterContents: Map<number, string>,
    outputDir: string,
  ): Promise<string> {
    Logger.info(`Generating book PDF for: ${book.title}`);

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Create a sanitized filename
    const sanitizedTitle = book.title
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${sanitizedTitle}_${timestamp}.pdf`;
    const outputPath = path.join(outputDir, filename);

    // Combine all chapters into one HTML document
    let combinedHTML = '';

    for (const chapter of book.chapters) {
      const content = chapterContents.get(chapter.index);
      if (content) {
        combinedHTML += `
          <div class="chapter">
            <h1 class="chapter-title">${chapter.title}</h1>
            <div class="chapter-content">
              ${content}
            </div>
          </div>
          <div class="page-break"></div>
        `;
      }
    }

    // Create the full document with title page
    const fullHTML = this.createFullDocument(book, combinedHTML);

    // Generate the PDF
    await this.generateFromHTML(page, fullHTML, { outputPath }, book.title);

    return outputPath;
  }

  private fixImageURLs(html: string): string {
    // Convert relative image URLs to absolute URLs for O'Reilly
    return html.replace(
      /<img([^>]*?)src=["'](?!https?:\/\/)([^"']+)["']/gi,
      (_match, attrs, src) => {
        // Handle different types of relative URLs
        let absoluteURL = src;

        if (src.startsWith('/')) {
          // Absolute path from domain root
          absoluteURL = `https://learning.oreilly.com${src}`;
        } else if (src.startsWith('../')) {
          // Relative path going up directories - best effort
          absoluteURL = `https://learning.oreilly.com/library/view/${src.replace(/\.\.\//g, '')}`;
        } else if (!src.startsWith('data:')) {
          // Relative path from current directory
          absoluteURL = `https://learning.oreilly.com/library/view/${src}`;
        }

        return `<img${attrs}src="${absoluteURL}"`;
      }
    );
  }

  private wrapHTMLWithStyles(content: string, title?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${title || 'Document'}</title>
          <style>
            @page {
              margin: 20mm;
            }
            body {
              font-family: Georgia, 'Times New Roman', serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
            }
            h1, h2, h3, h4, h5, h6 {
              font-family: Arial, Helvetica, sans-serif;
              color: #000;
              margin-top: 1.5em;
              margin-bottom: 0.5em;
            }
            h1 { font-size: 2em; }
            h2 { font-size: 1.5em; }
            h3 { font-size: 1.25em; }
            code {
              background-color: #f4f4f4;
              padding: 2px 6px;
              border-radius: 3px;
              font-family: 'Courier New', monospace;
            }
            pre {
              background-color: #f4f4f4;
              padding: 15px;
              border-radius: 5px;
              overflow-x: auto;
            }
            pre code {
              background-color: transparent;
              padding: 0;
            }
            img {
              max-width: 100%;
              height: auto;
              display: block;
              margin: 1em auto;
              page-break-inside: avoid;
            }
            figure {
              page-break-inside: avoid;
              margin: 1em 0;
            }
            figure img {
              margin: 0 auto;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 1em 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f4f4f4;
            }
            blockquote {
              border-left: 4px solid #ddd;
              margin: 1em 0;
              padding-left: 1em;
              color: #666;
            }
            .page-break {
              page-break-after: always;
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;
  }

  private createFullDocument(book: Book, chaptersHTML: string): string {
    const titlePage = `
      <div class="title-page" style="text-align: center; padding-top: 100px;">
        <h1 style="font-size: 3em; margin-bottom: 0.5em;">${book.title}</h1>
        <h2 style="font-size: 1.5em; color: #666; font-weight: normal;">by ${book.author}</h2>
        <p style="margin-top: 3em; color: #999;">Downloaded from O'Reilly Learning Platform</p>
      </div>
      <div class="page-break"></div>
    `;

    return this.wrapHTMLWithStyles(titlePage + chaptersHTML, book.title);
  }

  async saveChapterHTML(
    chapter: Chapter,
    content: string,
    outputDir: string,
  ): Promise<string> {
    await fs.mkdir(outputDir, { recursive: true });

    const sanitizedTitle = chapter.title
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
    const filename = `chapter_${chapter.index}_${sanitizedTitle}.html`;
    const outputPath = path.join(outputDir, filename);

    const html = this.wrapHTMLWithStyles(content, chapter.title);
    await fs.writeFile(outputPath, html);

    Logger.info(`Chapter HTML saved: ${outputPath}`);
    return outputPath;
  }
}
