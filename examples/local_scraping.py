"""
Local file scraping example using Playwright.

This example demonstrates scraping from a local HTML file
without requiring internet connectivity.
"""

import asyncio
from pathlib import Path
import sys
import json

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.scrapers.playwright_scraper import PlaywrightScraper
from src.utils.logger import setup_logger

logger = setup_logger(__name__)


async def extract_book_info(page):
    """Extract book information from the page."""
    books = []

    # Find all book elements
    book_elements = await page.locator('.book').all()

    for book in book_elements:
        try:
            title_elem = book.locator('h1.book-title')
            author_elem = book.locator('.author-name')
            price_elem = book.locator('.price')
            description_elem = book.locator('.description')
            isbn_elem = book.locator('.isbn')
            rating_elem = book.locator('.rating')

            book_data = {
                'title': await title_elem.text_content() or "Unknown",
                'author': await author_elem.text_content() or "Unknown",
                'price': await price_elem.text_content() or "N/A",
                'description': await description_elem.text_content() or "",
                'isbn': await isbn_elem.text_content() or "",
                'rating': await rating_elem.text_content() or "",
            }

            # Clean up whitespace
            for key in book_data:
                if isinstance(book_data[key], str):
                    book_data[key] = book_data[key].strip()

            books.append(book_data)
        except Exception as e:
            logger.error(f"Error extracting book info: {e}")

    return books


async def main():
    """Run the local file scraping example."""
    logger.info("=== Local File Scraping Example ===")

    # Get the path to the test HTML file
    html_file = Path(__file__).parent / "test_books.html"
    file_url = f"file://{html_file.absolute()}"

    logger.info(f"Scraping from: {file_url}")

    async with PlaywrightScraper(name="local_test", rate_limit=10.0) as scraper:
        try:
            # Scrape the local file
            books = await scraper.scrape(
                file_url,
                wait_for_selector='.book',
                custom_handler=extract_book_info
            )

            if books:
                logger.info(f"Successfully extracted {len(books)} books!")
                print("\n" + "="*80)

                for i, book in enumerate(books, 1):
                    print(f"\n📚 Book {i}:")
                    print(f"   Title:       {book['title']}")
                    print(f"   Author:      {book['author']}")
                    print(f"   Price:       {book['price']}")
                    print(f"   Rating:      {book['rating']}")
                    print(f"   ISBN:        {book['isbn']}")
                    print(f"   Description: {book['description'][:100]}...")

                print("\n" + "="*80)

                # Save to JSON
                output_dir = Path(__file__).parent.parent / "data" / "raw"
                output_dir.mkdir(parents=True, exist_ok=True)
                output_file = output_dir / "scraped_books.json"

                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(books, f, ensure_ascii=False, indent=2)

                logger.info(f"Data saved to: {output_file}")
            else:
                logger.warning("No books found!")

        except Exception as e:
            logger.error(f"Error during scraping: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
