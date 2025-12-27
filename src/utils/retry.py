"""
Retry utilities for handling transient failures.

Implements retry logic with exponential backoff for
network requests and other potentially failing operations.
"""

import time
import asyncio
from functools import wraps
from typing import Callable, Type, Tuple, Any
from src.utils.logger import setup_logger

logger = setup_logger(__name__)


def retry(
    max_attempts: int = 3,
    backoff: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,)
) -> Callable:
    """
    Retry decorator with exponential backoff.

    Args:
        max_attempts: Maximum number of retry attempts
        backoff: Backoff multiplier for exponential delay
        exceptions: Tuple of exceptions to catch and retry

    Returns:
        Decorated function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts - 1:
                        logger.error(
                            f"Failed after {max_attempts} attempts: {e}"
                        )
                        raise
                    wait_time = backoff ** attempt
                    logger.warning(
                        f"Attempt {attempt + 1}/{max_attempts} failed: {e}. "
                        f"Retrying in {wait_time}s..."
                    )
                    time.sleep(wait_time)
        return wrapper
    return decorator


def async_retry(
    max_attempts: int = 3,
    backoff: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,)
) -> Callable:
    """
    Async retry decorator with exponential backoff.

    Args:
        max_attempts: Maximum number of retry attempts
        backoff: Backoff multiplier for exponential delay
        exceptions: Tuple of exceptions to catch and retry

    Returns:
        Decorated async function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_attempts - 1:
                        logger.error(
                            f"Failed after {max_attempts} attempts: {e}"
                        )
                        raise
                    wait_time = backoff ** attempt
                    logger.warning(
                        f"Attempt {attempt + 1}/{max_attempts} failed: {e}. "
                        f"Retrying in {wait_time}s..."
                    )
                    await asyncio.sleep(wait_time)
        return wrapper
    return decorator
