import { Page } from 'playwright';

export interface Book {
  id: string;
  title: string;
  url: string;
}

export class BookScraper {
  private _page: Page;

  constructor(page: Page) {
    this._page = page;
  }

  async getBook(_bookUrl: string): Promise<Book> {
    // TODO: Navigate to book and extract metadata
    throw new Error('Not yet implemented');
  }

  async getChapterContent(_chapterUrl: string): Promise<string> {
    // TODO: Extract chapter content
    throw new Error('Not yet implemented');
  }

  async getAllChapters(_bookUrl: string): Promise<string[]> {
    // TODO: Get all chapter URLs for a book
    throw new Error('Not yet implemented');
  }
}
