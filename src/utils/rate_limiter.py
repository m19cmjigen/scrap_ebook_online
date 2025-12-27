"""
Rate limiting utilities for web scraping.

Implements rate limiting to avoid overwhelming target servers
and to respect ethical scraping practices.
"""

import time
import asyncio
from functools import wraps
from typing import Callable, Any
from src.utils.logger import setup_logger

logger = setup_logger(__name__)


class RateLimiter:
    """Rate limiter for controlling request frequency."""

    def __init__(self, calls_per_second: float = 1.0):
        """
        Initialize the rate limiter.

        Args:
            calls_per_second: Maximum number of calls allowed per second
        """
        self.min_interval = 1.0 / calls_per_second
        self.last_called = 0.0

    def wait(self):
        """Wait if necessary to respect the rate limit."""
        elapsed = time.time() - self.last_called
        wait_time = self.min_interval - elapsed
        if wait_time > 0:
            logger.debug(f"Rate limiting: waiting {wait_time:.2f}s")
            time.sleep(wait_time)
        self.last_called = time.time()

    async def wait_async(self):
        """Async version of wait."""
        elapsed = time.time() - self.last_called
        wait_time = self.min_interval - elapsed
        if wait_time > 0:
            logger.debug(f"Rate limiting: waiting {wait_time:.2f}s")
            await asyncio.sleep(wait_time)
        self.last_called = time.time()


def rate_limit(calls_per_second: float = 1.0) -> Callable:
    """
    Decorator to rate limit function calls.

    Args:
        calls_per_second: Maximum number of calls allowed per second

    Returns:
        Decorated function
    """
    min_interval = 1.0 / calls_per_second
    last_called = [0.0]

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            elapsed = time.time() - last_called[0]
            wait_time = min_interval - elapsed
            if wait_time > 0:
                time.sleep(wait_time)
            result = func(*args, **kwargs)
            last_called[0] = time.time()
            return result
        return wrapper
    return decorator


def async_rate_limit(calls_per_second: float = 1.0) -> Callable:
    """
    Async decorator to rate limit function calls.

    Args:
        calls_per_second: Maximum number of calls allowed per second

    Returns:
        Decorated async function
    """
    min_interval = 1.0 / calls_per_second
    last_called = [0.0]

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            elapsed = time.time() - last_called[0]
            wait_time = min_interval - elapsed
            if wait_time > 0:
                await asyncio.sleep(wait_time)
            result = await func(*args, **kwargs)
            last_called[0] = time.time()
            return result
        return wrapper
    return decorator
