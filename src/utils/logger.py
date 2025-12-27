"""
Logging utility for the ebook scraper.

Provides a standardized logger configuration for all modules.
"""

import logging
import sys
from pathlib import Path
from src.config.settings import LOG_LEVEL, LOG_FILE, LOG_FORMAT, LOG_DATE_FORMAT


def setup_logger(name: str) -> logging.Logger:
    """
    Configure and return a logger instance.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(LOG_LEVEL)

    # Avoid adding handlers multiple times
    if logger.handlers:
        return logger

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt=LOG_DATE_FORMAT
    )
    console_handler.setFormatter(console_format)

    # File handler
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT)
    file_handler.setFormatter(file_format)

    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

    return logger
