# scrap_ebook_online

Ebook scraping and collection automation using Playwright for dynamic web content.

## Features

- 🎭 **Playwright-based scraping**: Handle JavaScript-rendered content
- ⚡ **Async/await support**: Concurrent scraping for better performance
- 🔄 **Rate limiting**: Respectful scraping with configurable delays
- 🔁 **Automatic retries**: Exponential backoff for transient failures
- 📝 **Comprehensive logging**: Track all operations and errors
- 🎨 **Extensible architecture**: Easy to add new scrapers and parsers
- 🧪 **Type hints**: Full type annotation support
- 🔒 **Ethical scraping**: Follows best practices and legal guidelines

## Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd scrap_ebook_online
```

2. Create and activate a virtual environment:
```bash
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Install Playwright browsers:
```bash
playwright install chromium
# Or install all browsers: playwright install
```

5. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your settings
```

## Usage

### Basic Example

```python
import asyncio
from src.scrapers.playwright_scraper import PlaywrightScraper

async def main():
    async with PlaywrightScraper(name="my_scraper", rate_limit=1.0) as scraper:
        # Scrape a single page
        data = await scraper.scrape("https://example.com")
        print(f"Title: {data['title']}")

asyncio.run(main())
```

### Custom Page Handler

```python
async def extract_book_info(page):
    """Extract specific information from a page."""
    return {
        'title': await page.locator('h1.title').text_content(),
        'author': await page.locator('.author').text_content(),
        'price': await page.locator('.price').text_content(),
    }

async with PlaywrightScraper() as scraper:
    data = await scraper.scrape(
        url="https://example.com/book/123",
        wait_for_selector='h1.title',
        custom_handler=extract_book_info
    )
```

### Multiple URLs

```python
urls = [
    "https://example.com/book/1",
    "https://example.com/book/2",
    "https://example.com/book/3",
]

async with PlaywrightScraper(rate_limit=2.0) as scraper:
    results = await scraper.scrape_multiple(
        urls,
        max_concurrent=3
    )
```

### Run Examples

```bash
python examples/basic_usage.py
```

## Project Structure

```
scrap_ebook_online/
├── src/                      # Source code
│   ├── scrapers/             # Scraper implementations
│   │   ├── base_scraper.py   # Base scraper class
│   │   └── playwright_scraper.py  # Playwright scraper
│   ├── parsers/              # HTML/data parsers
│   ├── storage/              # Data storage handlers
│   ├── utils/                # Utility functions
│   │   ├── logger.py         # Logging setup
│   │   ├── rate_limiter.py   # Rate limiting
│   │   └── retry.py          # Retry logic
│   └── config/               # Configuration
│       └── settings.py       # Settings loader
├── examples/                 # Usage examples
│   └── basic_usage.py        # Basic examples
├── tests/                    # Test files
│   ├── unit/                 # Unit tests
│   └── integration/          # Integration tests
├── data/                     # Output data (not tracked)
├── logs/                     # Application logs (not tracked)
├── CLAUDE.md                 # AI assistant guide
├── README.md                 # This file
├── requirements.txt          # Python dependencies
└── .env.example              # Example environment variables
```

## Configuration

Edit `.env` file to configure the scraper:

```bash
# Scraper settings
SCRAPER_RATE_LIMIT=1          # Requests per second
REQUEST_TIMEOUT=30            # Request timeout in seconds
MAX_RETRIES=3                 # Number of retry attempts

# Playwright settings
HEADLESS=true                 # Run browser in headless mode
BROWSER_TYPE=chromium         # chromium, firefox, or webkit
VIEWPORT_WIDTH=1920
VIEWPORT_HEIGHT=1080
NAVIGATION_TIMEOUT=30000      # Navigation timeout in milliseconds

# Logging
LOG_LEVEL=INFO                # DEBUG, INFO, WARNING, ERROR
```

## Development

### Running Tests

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest --cov=src tests/

# Run specific test file
pytest tests/unit/test_scrapers.py
```

### Code Formatting

```bash
# Format code with black
black src/ tests/ examples/

# Lint code
flake8 src/

# Type checking
mypy src/
```

### Adding a New Scraper

1. Create a new file in `src/scrapers/`
2. Inherit from `BaseScraper` or `PlaywrightScraper`
3. Implement required methods
4. Add tests in `tests/unit/`

Example:

```python
from src.scrapers.playwright_scraper import PlaywrightScraper

class CustomScraper(PlaywrightScraper):
    async def scrape_books(self, category: str):
        # Your custom implementation
        pass
```

## Legal and Ethical Considerations

⚠️ **Important**: Always scrape responsibly and ethically.

- ✅ Check and respect `robots.txt`
- ✅ Review website Terms of Service
- ✅ Implement appropriate rate limiting
- ✅ Use respectful User-Agent strings
- ✅ Only scrape publicly available data
- ✅ Consider the website's bandwidth costs
- ❌ Don't overwhelm servers with requests
- ❌ Don't scrape personal data without permission
- ❌ Don't violate copyright laws

See [CLAUDE.md](CLAUDE.md) for detailed guidelines.

## Troubleshooting

### Playwright Installation Issues

```bash
# Install browsers manually
playwright install chromium

# Install system dependencies (Linux)
playwright install-deps
```

### Import Errors

Make sure you're running from the project root or have the project in your PYTHONPATH:

```bash
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

### Rate Limiting

If you get blocked, increase the rate limit delay:

```python
PlaywrightScraper(rate_limit=0.5)  # One request every 2 seconds
```

## Contributing

1. Read [CLAUDE.md](CLAUDE.md) for guidelines
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

[Add your license here]

## Resources

- [Playwright Documentation](https://playwright.dev/python/)
- [BeautifulSoup Documentation](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
- [Ethical Web Scraping Guide](https://www.scrapehero.com/how-to-prevent-getting-blacklisted-while-scraping/)

## Support

For issues and questions:
1. Check the documentation
2. Review [CLAUDE.md](CLAUDE.md)
3. Search existing issues
4. Create a new issue with details

---

**Remember**: Always scrape responsibly and respect website owners' resources and rights.
