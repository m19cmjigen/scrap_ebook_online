"""
Base scraper class for all scraper implementations.

Provides common functionality and interface for scrapers.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from src.utils.logger import setup_logger

logger = setup_logger(__name__)


class BaseScraper(ABC):
    """Abstract base class for all scrapers."""

    def __init__(self, name: str):
        """
        Initialize the base scraper.

        Args:
            name: Name of the scraper
        """
        self.name = name
        self.logger = setup_logger(f"{__name__}.{name}")

    @abstractmethod
    async def scrape(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Scrape data from a URL.

        Args:
            url: URL to scrape

        Returns:
            Dictionary with scraped data or None on error
        """
        pass

    @abstractmethod
    async def scrape_multiple(self, urls: List[str]) -> List[Dict[str, Any]]:
        """
        Scrape data from multiple URLs.

        Args:
            urls: List of URLs to scrape

        Returns:
            List of dictionaries with scraped data
        """
        pass

    def validate_data(self, data: Dict[str, Any]) -> bool:
        """
        Validate scraped data.

        Args:
            data: Data to validate

        Returns:
            True if valid, False otherwise
        """
        # Override in subclasses for custom validation
        return data is not None and len(data) > 0

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        pass
