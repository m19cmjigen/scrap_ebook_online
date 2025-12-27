# CLAUDE.md - AI Assistant Guide for scrap_ebook_online

> **Last Updated:** 2025-12-27
> **Project:** scrap_ebook_online
> **Purpose:** Ebook scraping and collection automation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Repository Structure](#repository-structure)
3. [Development Setup](#development-setup)
4. [Coding Conventions](#coding-conventions)
5. [Git Workflow](#git-workflow)
6. [Testing Guidelines](#testing-guidelines)
7. [Common Patterns](#common-patterns)
8. [AI Assistant Guidelines](#ai-assistant-guidelines)
9. [Legal and Ethical Considerations](#legal-and-ethical-considerations)

---

## Project Overview

**scrap_ebook_online** is a web scraping project designed to collect and process ebook information from online sources.

### Current Status
- **Stage:** Initial setup
- **Commit:** c668090 (initial commit)
- **Files:** README.md only

### Key Objectives
- Scrape ebook metadata (titles, authors, descriptions, etc.)
- Handle multiple ebook sources/websites
- Store collected data efficiently
- Respect robots.txt and rate limiting
- Provide clean, documented code

---

## Repository Structure

The anticipated structure as the project develops:

```
scrap_ebook_online/
├── README.md                 # Project documentation
├── CLAUDE.md                 # This file - AI assistant guide
├── .gitignore               # Git ignore patterns
├── requirements.txt         # Python dependencies (if Python)
├── package.json             # Node dependencies (if Node.js)
├── src/                     # Source code
│   ├── scrapers/            # Scraper implementations
│   ├── parsers/             # HTML/data parsers
│   ├── storage/             # Data storage handlers
│   ├── utils/               # Utility functions
│   └── config/              # Configuration files
├── tests/                   # Test files
│   ├── unit/                # Unit tests
│   └── integration/         # Integration tests
├── data/                    # Output data directory
│   ├── raw/                 # Raw scraped data
│   └── processed/           # Processed/cleaned data
├── logs/                    # Application logs
└── docs/                    # Additional documentation
```

---

## Development Setup

### Prerequisites

When implementing the project, document:
- Language version (Python 3.x, Node.js, etc.)
- Package manager (pip, npm, yarn)
- System dependencies
- Environment variables needed

### Installation Steps

```bash
# Clone the repository
git clone <repository-url>
cd scrap_ebook_online

# Install dependencies
# (Add specific commands based on chosen stack)

# Set up configuration
# (Add config setup steps)
```

---

## Coding Conventions

### General Principles

1. **Clarity over Cleverness**: Write code that's easy to understand
2. **DRY (Don't Repeat Yourself)**: Extract common functionality
3. **Single Responsibility**: Each module/function should have one clear purpose
4. **Error Handling**: Always handle errors gracefully
5. **Logging**: Use appropriate logging levels (DEBUG, INFO, WARNING, ERROR)

### Naming Conventions

- **Files/Modules**: `lowercase_with_underscores.py` or `kebab-case.js`
- **Classes**: `PascalCase`
- **Functions/Methods**: `snake_case` (Python) or `camelCase` (JavaScript)
- **Constants**: `UPPER_CASE_WITH_UNDERSCORES`
- **Private members**: Prefix with underscore `_private_method`

### Code Organization

1. **Imports**: Group and order logically
   - Standard library
   - Third-party packages
   - Local modules

2. **Function Size**: Keep functions focused and under 50 lines when possible

3. **Comments**:
   - Use docstrings for functions/classes
   - Inline comments for complex logic only
   - Don't comment obvious code

### Example Structure (Python)

```python
"""
Module for scraping ebook website X.

This module handles connection, parsing, and data extraction
from website X's ebook listings.
"""

import logging
from typing import List, Dict, Optional

from bs4 import BeautifulSoup
import requests

from .base_scraper import BaseScraper
from ..utils.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)


class WebsiteXScraper(BaseScraper):
    """Scraper for website X ebook listings."""

    BASE_URL = "https://example.com"

    def __init__(self, rate_limit: int = 1):
        """
        Initialize the scraper.

        Args:
            rate_limit: Requests per second (default: 1)
        """
        super().__init__()
        self.rate_limiter = RateLimiter(rate_limit)

    def scrape_page(self, url: str) -> Optional[Dict]:
        """
        Scrape a single page.

        Args:
            url: URL to scrape

        Returns:
            Dictionary with scraped data or None on error
        """
        try:
            self.rate_limiter.wait()
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return self._parse_response(response)
        except requests.RequestException as e:
            logger.error(f"Failed to scrape {url}: {e}")
            return None
```

---

## Git Workflow

### Branch Naming

- **Feature branches**: `feature/<description>` or `claude/<description>-<session-id>`
- **Bug fixes**: `fix/<description>`
- **Documentation**: `docs/<description>`
- **Refactoring**: `refactor/<description>`

### Commit Messages

Follow the conventional commits format:

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**
```
feat: add amazon ebook scraper

Implemented scraper for Amazon's ebook listings with:
- Rate limiting
- Error handling
- Data validation

fix: handle timeout errors in scraper

Added retry logic for timeout errors with exponential backoff

docs: update CLAUDE.md with new conventions
```

### Workflow

1. Create/checkout feature branch
2. Make changes with focused commits
3. Test thoroughly
4. Push to remote
5. Create pull request (if applicable)

---

## Testing Guidelines

### Test Structure

```
tests/
├── unit/                    # Fast, isolated tests
│   ├── test_parsers.py
│   └── test_utils.py
└── integration/             # Tests with external dependencies
    └── test_scrapers.py
```

### Testing Best Practices

1. **Write Tests First**: Consider TDD when appropriate
2. **Test Coverage**: Aim for >80% coverage on core logic
3. **Mock External Services**: Don't hit real websites in tests
4. **Use Fixtures**: Provide sample HTML/data for testing
5. **Test Edge Cases**: Empty responses, malformed data, timeouts

### Example Test (Python with pytest)

```python
"""Tests for website X scraper."""

import pytest
from unittest.mock import Mock, patch

from src.scrapers.website_x import WebsiteXScraper


@pytest.fixture
def scraper():
    """Create a scraper instance."""
    return WebsiteXScraper(rate_limit=10)


@pytest.fixture
def sample_html():
    """Provide sample HTML response."""
    return """
    <html>
        <div class="ebook">
            <h2>Test Book</h2>
            <span class="author">Test Author</span>
        </div>
    </html>
    """


def test_scraper_initialization(scraper):
    """Test scraper initializes correctly."""
    assert scraper.BASE_URL == "https://example.com"
    assert scraper.rate_limiter is not None


@patch('requests.get')
def test_scrape_page_success(mock_get, scraper, sample_html):
    """Test successful page scraping."""
    mock_response = Mock()
    mock_response.text = sample_html
    mock_response.status_code = 200
    mock_get.return_value = mock_response

    result = scraper.scrape_page("https://example.com/book1")

    assert result is not None
    assert result['title'] == 'Test Book'
    assert result['author'] == 'Test Author'
```

---

## Common Patterns

### 1. Base Scraper Pattern

Create a base class for common scraper functionality:

```python
class BaseScraper:
    """Base class for all scrapers."""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; EbookBot/1.0)'
        })

    def get_page(self, url: str) -> requests.Response:
        """Fetch a page with standard error handling."""
        raise NotImplementedError

    def parse(self, html: str) -> Dict:
        """Parse HTML and extract data."""
        raise NotImplementedError
```

### 2. Rate Limiting

Always implement rate limiting:

```python
import time
from functools import wraps


def rate_limit(calls_per_second: int = 1):
    """Decorator to rate limit function calls."""
    min_interval = 1.0 / calls_per_second
    last_called = [0.0]

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            elapsed = time.time() - last_called[0]
            wait_time = min_interval - elapsed
            if wait_time > 0:
                time.sleep(wait_time)
            result = func(*args, **kwargs)
            last_called[0] = time.time()
            return result
        return wrapper
    return decorator
```

### 3. Retry Logic

Handle transient failures:

```python
import time
from functools import wraps


def retry(max_attempts: int = 3, backoff: float = 2.0):
    """Retry decorator with exponential backoff."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    wait_time = backoff ** attempt
                    logger.warning(
                        f"Attempt {attempt + 1} failed: {e}. "
                        f"Retrying in {wait_time}s..."
                    )
                    time.sleep(wait_time)
        return wrapper
    return decorator
```

### 4. Data Validation

Validate scraped data:

```python
from typing import Dict, Optional
from pydantic import BaseModel, HttpUrl, validator


class EbookData(BaseModel):
    """Validated ebook data model."""

    title: str
    author: str
    url: HttpUrl
    price: Optional[float] = None
    isbn: Optional[str] = None

    @validator('title', 'author')
    def not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Field cannot be empty')
        return v.strip()

    @validator('isbn')
    def valid_isbn(cls, v):
        if v and not (len(v) == 10 or len(v) == 13):
            raise ValueError('ISBN must be 10 or 13 characters')
        return v
```

---

## AI Assistant Guidelines

### When Working on This Project

1. **Read Before Modifying**: Always read existing files before making changes

2. **Respect robots.txt**: When implementing scrapers, always check and respect robots.txt

3. **Rate Limiting First**: Implement rate limiting before any web scraping code

4. **Error Handling**: Add comprehensive error handling for network requests

5. **Logging**: Use proper logging instead of print statements

6. **Data Privacy**: Never commit scraped data to the repository
   - Add data directories to .gitignore
   - Keep sample/test data minimal

7. **Documentation**: Update this CLAUDE.md when:
   - Adding new major features
   - Changing project structure
   - Establishing new conventions

8. **Security Considerations**:
   - Never hardcode credentials
   - Use environment variables for sensitive data
   - Validate and sanitize all scraped content
   - Be aware of XSS and injection risks

### Task Checklist for New Features

- [ ] Read relevant existing code
- [ ] Check for similar patterns in codebase
- [ ] Implement with proper error handling
- [ ] Add logging
- [ ] Write tests
- [ ] Update documentation
- [ ] Check for security issues
- [ ] Verify rate limiting
- [ ] Test with edge cases
- [ ] Review and commit

### Common Pitfalls to Avoid

1. **Don't scrape without rate limiting**: Can get IP banned
2. **Don't ignore robots.txt**: Ethical and legal issues
3. **Don't assume HTML structure is stable**: Websites change
4. **Don't commit large data files**: Use .gitignore
5. **Don't use synchronous code for I/O**: Consider async where appropriate
6. **Don't ignore SSL certificates**: Validate them properly
7. **Don't hardcode URLs**: Use configuration files

### Code Review Checklist

Before committing, verify:

- [ ] Code follows naming conventions
- [ ] Functions have docstrings
- [ ] Error handling is comprehensive
- [ ] Rate limiting is implemented
- [ ] No hardcoded credentials or URLs
- [ ] Tests are included
- [ ] Logging is appropriate
- [ ] No debug print statements
- [ ] No commented-out code blocks
- [ ] Dependencies are documented

---

## Legal and Ethical Considerations

### Important Reminders

1. **Copyright**: Respect copyright laws when scraping content
2. **Terms of Service**: Check if scraping violates website ToS
3. **robots.txt**: Always respect robots.txt directives
4. **Rate Limiting**: Don't overwhelm servers
5. **User-Agent**: Identify your bot properly
6. **Personal Data**: Be cautious with personal information under GDPR/privacy laws

### Best Practices

- Identify your bot with a proper User-Agent
- Provide contact information in User-Agent
- Implement respectful crawl delays (1-2 seconds minimum)
- Cache responses to avoid redundant requests
- Only scrape publicly available data
- Don't scrape data behind authentication without permission
- Consider the website's bandwidth costs

### Example Ethical User-Agent

```python
headers = {
    'User-Agent': 'EbookScraperBot/1.0 (+https://github.com/yourname/scrap_ebook_online; contact@email.com)'
}
```

---

## Configuration Management

### Environment Variables

Use a `.env` file (never commit this):

```bash
# .env
SCRAPER_RATE_LIMIT=1
LOG_LEVEL=INFO
DATABASE_URL=sqlite:///data/ebooks.db
USER_AGENT=EbookScraperBot/1.0
```

### Configuration File Structure

```python
# src/config/settings.py
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Scraper settings
RATE_LIMIT = int(os.getenv('SCRAPER_RATE_LIMIT', '1'))
REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '10'))
MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))

# Logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = BASE_DIR / 'logs' / 'scraper.log'

# Data storage
DATA_DIR = BASE_DIR / 'data'
RAW_DATA_DIR = DATA_DIR / 'raw'
PROCESSED_DATA_DIR = DATA_DIR / 'processed'

# User Agent
USER_AGENT = os.getenv(
    'USER_AGENT',
    'EbookScraperBot/1.0 (+https://github.com/yourname/scrap_ebook_online)'
)
```

---

## Logging Configuration

### Standard Logging Setup

```python
# src/utils/logger.py
import logging
import sys
from pathlib import Path
from src.config.settings import LOG_LEVEL, LOG_FILE


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

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_format)

    # File handler
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_format)

    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

    return logger
```

---

## Performance Considerations

### Async/Await for I/O Operations

For better performance with multiple requests:

```python
import asyncio
import aiohttp
from typing import List, Dict


class AsyncScraper:
    """Async scraper for better performance."""

    async def fetch_page(self, session: aiohttp.ClientSession, url: str) -> str:
        """Fetch a single page asynchronously."""
        async with session.get(url) as response:
            return await response.text()

    async def scrape_multiple(self, urls: List[str]) -> List[Dict]:
        """Scrape multiple URLs concurrently."""
        async with aiohttp.ClientSession() as session:
            tasks = [self.fetch_page(session, url) for url in urls]
            pages = await asyncio.gather(*tasks)
            return [self.parse(page) for page in pages]
```

### Caching

Implement caching to avoid redundant requests:

```python
from functools import lru_cache
import hashlib
import json
from pathlib import Path


class ResponseCache:
    """Simple file-based cache for HTTP responses."""

    def __init__(self, cache_dir: Path):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def _get_cache_key(self, url: str) -> str:
        """Generate cache key from URL."""
        return hashlib.md5(url.encode()).hexdigest()

    def get(self, url: str) -> Optional[str]:
        """Get cached response."""
        cache_file = self.cache_dir / f"{self._get_cache_key(url)}.html"
        if cache_file.exists():
            return cache_file.read_text()
        return None

    def set(self, url: str, content: str):
        """Cache response."""
        cache_file = self.cache_dir / f"{self._get_cache_key(url)}.html"
        cache_file.write_text(content)
```

---

## Useful Resources

### Web Scraping Libraries

- **BeautifulSoup4**: HTML parsing
- **lxml**: Fast XML/HTML parser
- **Scrapy**: Full-featured scraping framework
- **Selenium**: Browser automation (for JavaScript-heavy sites)
- **requests**: HTTP library
- **aiohttp**: Async HTTP client

### Data Processing

- **pandas**: Data manipulation
- **pydantic**: Data validation
- **sqlite3**: Lightweight database

### Testing

- **pytest**: Testing framework
- **responses**: Mock HTTP responses
- **faker**: Generate fake data

### Code Quality

- **black**: Code formatter
- **flake8**: Linting
- **mypy**: Type checking
- **pylint**: Code analysis

---

## Quick Reference

### File Locations

| Purpose | Location |
|---------|----------|
| Source code | `src/` |
| Tests | `tests/` |
| Configuration | `src/config/` or `.env` |
| Logs | `logs/` |
| Data output | `data/` |
| Documentation | `docs/` and `*.md` files |

### Key Commands

```bash
# Run tests
pytest tests/

# Run specific test file
pytest tests/unit/test_scraper.py

# Run with coverage
pytest --cov=src tests/

# Format code
black src/ tests/

# Lint code
flake8 src/

# Type check
mypy src/
```

---

## Changelog

### 2025-12-27
- Initial CLAUDE.md creation
- Established project structure and conventions
- Added comprehensive guidelines for AI assistants

---

## Questions?

For questions or clarifications about this documentation:
1. Check the README.md
2. Review existing code for patterns
3. Check git history for context
4. Update this file if you discover new patterns or conventions

Remember: **Keep this document updated** as the project evolves!
