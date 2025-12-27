"""
Playwright-based scraper for dynamic websites.

Uses Playwright to scrape JavaScript-rendered content
from modern web applications.
"""

import asyncio
from typing import Dict, List, Optional, Any, Callable
from playwright.async_api import (
    async_playwright,
    Browser,
    BrowserContext,
    Page,
    Playwright
)

from src.scrapers.base_scraper import BaseScraper
from src.config.settings import (
    HEADLESS,
    BROWSER_TYPE,
    VIEWPORT_WIDTH,
    VIEWPORT_HEIGHT,
    NAVIGATION_TIMEOUT,
    USER_AGENT,
    REQUEST_TIMEOUT
)
from src.utils.logger import setup_logger
from src.utils.rate_limiter import RateLimiter
from src.utils.retry import async_retry

logger = setup_logger(__name__)


class PlaywrightScraper(BaseScraper):
    """
    Scraper using Playwright for browser automation.

    Supports dynamic content, JavaScript rendering, and
    complex interactions with web pages.
    """

    def __init__(
        self,
        name: str = "playwright",
        rate_limit: float = 1.0,
        headless: bool = HEADLESS,
        browser_type: str = BROWSER_TYPE
    ):
        """
        Initialize the Playwright scraper.

        Args:
            name: Name of the scraper
            rate_limit: Requests per second
            headless: Run browser in headless mode
            browser_type: Browser to use (chromium, firefox, webkit)
        """
        super().__init__(name)
        self.rate_limiter = RateLimiter(rate_limit)
        self.headless = headless
        self.browser_type = browser_type

        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None

    async def _init_browser(self):
        """Initialize Playwright and browser."""
        if self._browser is None:
            self.logger.info(f"Initializing {self.browser_type} browser")
            self._playwright = await async_playwright().start()

            browser_launcher = getattr(self._playwright, self.browser_type)
            self._browser = await browser_launcher.launch(
                headless=self.headless
            )

            self._context = await self._browser.new_context(
                viewport={'width': VIEWPORT_WIDTH, 'height': VIEWPORT_HEIGHT},
                user_agent=USER_AGENT
            )

            # Set default timeout
            self._context.set_default_navigation_timeout(NAVIGATION_TIMEOUT)
            self._context.set_default_timeout(REQUEST_TIMEOUT * 1000)

    async def _close_browser(self):
        """Close browser and Playwright."""
        if self._context:
            await self._context.close()
            self._context = None

        if self._browser:
            await self._browser.close()
            self._browser = None

        if self._playwright:
            await self._playwright.stop()
            self._playwright = None

    async def _new_page(self) -> Page:
        """
        Create a new page in the browser context.

        Returns:
            New page instance
        """
        await self._init_browser()
        return await self._context.new_page()

    @async_retry(max_attempts=3, backoff=2.0)
    async def scrape(
        self,
        url: str,
        wait_for_selector: Optional[str] = None,
        custom_handler: Optional[Callable[[Page], Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Scrape data from a URL using Playwright.

        Args:
            url: URL to scrape
            wait_for_selector: CSS selector to wait for before scraping
            custom_handler: Custom async function to handle the page

        Returns:
            Dictionary with scraped data or None on error
        """
        await self.rate_limiter.wait_async()

        page = None
        try:
            page = await self._new_page()
            self.logger.info(f"Navigating to {url}")

            # Navigate to the URL
            await page.goto(url, wait_until='domcontentloaded')

            # Wait for specific selector if provided
            if wait_for_selector:
                self.logger.debug(f"Waiting for selector: {wait_for_selector}")
                await page.wait_for_selector(wait_for_selector, timeout=NAVIGATION_TIMEOUT)

            # Use custom handler if provided
            if custom_handler:
                self.logger.debug("Using custom handler")
                result = await custom_handler(page)
                return result

            # Default: extract basic page information
            data = {
                'url': url,
                'title': await page.title(),
                'html': await page.content(),
            }

            self.logger.info(f"Successfully scraped {url}")
            return data

        except Exception as e:
            self.logger.error(f"Error scraping {url}: {e}")
            raise
        finally:
            if page:
                await page.close()

    async def scrape_multiple(
        self,
        urls: List[str],
        wait_for_selector: Optional[str] = None,
        custom_handler: Optional[Callable[[Page], Any]] = None,
        max_concurrent: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Scrape data from multiple URLs concurrently.

        Args:
            urls: List of URLs to scrape
            wait_for_selector: CSS selector to wait for before scraping
            custom_handler: Custom async function to handle the page
            max_concurrent: Maximum number of concurrent requests

        Returns:
            List of dictionaries with scraped data
        """
        self.logger.info(f"Scraping {len(urls)} URLs")

        semaphore = asyncio.Semaphore(max_concurrent)

        async def scrape_with_semaphore(url: str):
            async with semaphore:
                try:
                    return await self.scrape(url, wait_for_selector, custom_handler)
                except Exception as e:
                    self.logger.error(f"Failed to scrape {url}: {e}")
                    return None

        results = await asyncio.gather(
            *[scrape_with_semaphore(url) for url in urls]
        )

        # Filter out None results
        valid_results = [r for r in results if r is not None]
        self.logger.info(f"Successfully scraped {len(valid_results)}/{len(urls)} URLs")

        return valid_results

    async def screenshot(self, url: str, output_path: str, full_page: bool = True):
        """
        Take a screenshot of a webpage.

        Args:
            url: URL to screenshot
            output_path: Path to save screenshot
            full_page: Capture full scrollable page
        """
        page = None
        try:
            page = await self._new_page()
            await page.goto(url, wait_until='networkidle')
            await page.screenshot(path=output_path, full_page=full_page)
            self.logger.info(f"Screenshot saved to {output_path}")
        finally:
            if page:
                await page.close()

    async def __aenter__(self):
        """Async context manager entry."""
        await self._init_browser()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self._close_browser()
