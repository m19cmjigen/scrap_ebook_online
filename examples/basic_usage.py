"""
Basic usage example for the Playwright scraper.

This example demonstrates how to use the PlaywrightScraper
to scrape data from websites.
"""

import asyncio
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.scrapers.playwright_scraper import PlaywrightScraper
from src.utils.logger import setup_logger

logger = setup_logger(__name__)


async def example_basic_scraping():
    """Basic scraping example."""
    logger.info("=== Basic Scraping Example ===")

    async with PlaywrightScraper(name="example", rate_limit=1.0) as scraper:
        # Scrape a single page
        url = "https://example.com"
        data = await scraper.scrape(url)

        if data:
            logger.info(f"Title: {data['title']}")
            logger.info(f"URL: {data['url']}")
            logger.info(f"HTML length: {len(data['html'])} characters")


async def example_custom_handler():
    """Example with custom page handler."""
    logger.info("=== Custom Handler Example ===")

    async def extract_ebook_info(page):
        """Custom handler to extract ebook information."""
        # Example: Extract book title and author
        # Adjust selectors based on actual website structure
        title = await page.locator('h1.book-title').text_content() or "Unknown"
        author = await page.locator('.author-name').text_content() or "Unknown"
        description = await page.locator('.description').text_content() or ""

        return {
            'title': title.strip(),
            'author': author.strip(),
            'description': description.strip(),
            'url': page.url
        }

    async with PlaywrightScraper(name="custom", rate_limit=1.0) as scraper:
        # Note: This is a placeholder URL - replace with actual ebook site
        url = "https://example.com/book/123"

        try:
            data = await scraper.scrape(
                url,
                wait_for_selector='h1.book-title',  # Wait for title to load
                custom_handler=extract_ebook_info
            )

            if data:
                logger.info(f"Book: {data['title']}")
                logger.info(f"Author: {data['author']}")
        except Exception as e:
            logger.error(f"Error with custom handler: {e}")


async def example_multiple_urls():
    """Example scraping multiple URLs concurrently."""
    logger.info("=== Multiple URLs Example ===")

    urls = [
        "https://example.com",
        "https://example.org",
        "https://example.net",
    ]

    async with PlaywrightScraper(name="multi", rate_limit=2.0) as scraper:
        results = await scraper.scrape_multiple(
            urls,
            max_concurrent=2  # Limit concurrent requests
        )

        logger.info(f"Scraped {len(results)} pages successfully")
        for result in results:
            logger.info(f"- {result['title']}: {result['url']}")


async def example_screenshot():
    """Example taking a screenshot."""
    logger.info("=== Screenshot Example ===")

    async with PlaywrightScraper(name="screenshot") as scraper:
        output_path = Path(__file__).parent / "screenshots" / "example.png"
        output_path.parent.mkdir(parents=True, exist_ok=True)

        await scraper.screenshot(
            "https://example.com",
            str(output_path),
            full_page=True
        )
        logger.info(f"Screenshot saved to {output_path}")


async def main():
    """Run all examples."""
    logger.info("Starting Playwright Scraper Examples")
    logger.info("=" * 50)

    try:
        # Run examples
        await example_basic_scraping()
        print()

        # Uncomment to run other examples:
        # await example_custom_handler()
        # print()

        await example_multiple_urls()
        print()

        # await example_screenshot()
        # print()

        logger.info("All examples completed successfully!")

    except Exception as e:
        logger.error(f"Error running examples: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
