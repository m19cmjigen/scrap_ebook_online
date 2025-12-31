# Usage Guide

## Quick Start

1. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Run the scraper**:
   ```bash
   # Using environment variable
   npm run dev

   # Or pass book URL as command line argument
   npm run dev https://learning.oreilly.com/library/view/book-title/123456789/
   ```

## Configuration

### Environment Variables

Edit your `.env` file with the following settings:

```bash
# Required: Your O'Reilly Learning Platform credentials
OREILLY_EMAIL=your-email@example.com
OREILLY_PASSWORD=your-password

# Required: Book URL to scrape (can also be passed as CLI argument)
BOOK_URL=https://learning.oreilly.com/library/view/book-title/123456789/

# Optional: Output directory (default: ./downloads)
OUTPUT_DIR=./downloads

# Optional: Browser mode (default: false = visible browser)
HEADLESS=false

# Optional: Slow down browser actions for debugging (default: 0)
SLOW_MO=100

# Optional: Delay between requests in milliseconds (default: 2000)
REQUEST_DELAY=2000

# Optional: Path to save session cookies (default: ./session/cookies.json)
COOKIES_PATH=./session/cookies.json

# Optional: Enable debug logging (default: false)
DEBUG=false
```

## How It Works

1. **Authentication**: The scraper logs into O'Reilly using your credentials and saves the session
2. **Session Reuse**: On subsequent runs, it reuses the saved session to avoid repeated logins
3. **Book Discovery**: Navigates to the provided book URL and extracts metadata
4. **Chapter Scraping**: Finds all chapters and scrapes their content
5. **PDF Generation**: Combines all chapters into a single PDF with proper formatting

## Finding Book URLs

1. Go to https://learning.oreilly.com/
2. Search for a book
3. Click on the book
4. Copy the URL from your browser address bar

Example URL format:
```
https://learning.oreilly.com/library/view/learning-python/9781449355722/
```

## Output

The scraper creates:
- `downloads/` directory with the generated PDF
- `session/` directory with saved authentication cookies
- PDF filename format: `{book_title}_{date}.pdf`

## Troubleshooting

### Authentication Issues
- Verify your email and password are correct
- Delete `session/cookies.json` and try again
- Run with `HEADLESS=false` to see the browser

### Rate Limiting
- Increase `REQUEST_DELAY` if you encounter errors
- Default delay is 2000ms (2 seconds) between requests

### Chapter Extraction Issues
- Some books may have non-standard structure
- Check the browser console with `DEBUG=true`
- Run with `HEADLESS=false` to see what's happening

## Production Use

For production use, build and run the compiled version:

```bash
npm run build
node dist/index.js <book-url>
```

## Legal Notice

This tool should only be used with:
- Valid O'Reilly Learning Platform subscription
- Content you have legal access to
- Personal backup purposes only

Please respect O'Reilly's terms of service and copyright laws.
