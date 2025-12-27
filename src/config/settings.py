"""
Configuration settings for the ebook scraper.

This module loads environment variables and provides
configuration constants for the application.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Scraper settings
RATE_LIMIT = int(os.getenv('SCRAPER_RATE_LIMIT', '1'))
REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '30'))
MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
RETRY_BACKOFF = float(os.getenv('RETRY_BACKOFF', '2.0'))

# Playwright settings
HEADLESS = os.getenv('HEADLESS', 'true').lower() == 'true'
BROWSER_TYPE = os.getenv('BROWSER_TYPE', 'chromium')  # chromium, firefox, webkit
VIEWPORT_WIDTH = int(os.getenv('VIEWPORT_WIDTH', '1920'))
VIEWPORT_HEIGHT = int(os.getenv('VIEWPORT_HEIGHT', '1080'))
NAVIGATION_TIMEOUT = int(os.getenv('NAVIGATION_TIMEOUT', '30000'))  # milliseconds

# Logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = BASE_DIR / 'logs' / 'scraper.log'
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s'
LOG_DATE_FORMAT = '%Y-%m-%d %H:%M:%S'

# Data storage
DATA_DIR = BASE_DIR / 'data'
RAW_DATA_DIR = DATA_DIR / 'raw'
PROCESSED_DATA_DIR = DATA_DIR / 'processed'
CACHE_DIR = DATA_DIR / 'cache'

# Database
DATABASE_URL = os.getenv('DATABASE_URL', f'sqlite:///{DATA_DIR}/ebooks.db')

# User Agent
USER_AGENT = os.getenv(
    'USER_AGENT',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
)

# Create necessary directories
for directory in [LOG_FILE.parent, RAW_DATA_DIR, PROCESSED_DATA_DIR, CACHE_DIR]:
    directory.mkdir(parents=True, exist_ok=True)
