# O'Reilly Ebook Scraper

TypeScript application to scrape ebooks from O'Reilly Learning Platform (https://learning.oreilly.com/) using Playwright and save them as PDFs.

**⚠️ Important**: This tool should only be used with proper authorization and in compliance with O'Reilly's terms of service. Intended for legitimate subscribers to create personal backups of content they have legal access to.

## Features

- **Multi-Book Support**: Scrape multiple books in a single run
- **Flexible Configuration**: Specify books via environment variables or external file
- Automated login to O'Reilly Learning Platform
- Scrape complete ebooks with all chapters
- Generate high-quality PDFs with preserved images
- Session persistence to avoid repeated logins
- Chapter-level caching for efficient re-scraping
- Progress tracking with checkpoint/resume capability
- Retry logic with exponential backoff
- Rate limiting to be respectful to the server
- Comprehensive error handling (continues on book failure)

## Prerequisites

- Node.js 18+
- npm or yarn
- Valid O'Reilly Learning Platform subscription

## Setup

1. Clone the repository:
```bash
git clone https://github.com/m19cmjigen/scrap_ebook_online.git
cd scrap_ebook_online
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install chromium
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your O'Reilly credentials
```

## Usage

### Single Book

Set `BOOK_URL` in `.env`:
```bash
BOOK_URL=https://learning.oreilly.com/library/view/book-title/123456/
npm run dev
```

### Multiple Books (Comma-Separated)

Set `BOOK_URLS` in `.env`:
```bash
BOOK_URLS=https://learning.oreilly.com/library/view/book1/123,https://learning.oreilly.com/library/view/book2/456,https://learning.oreilly.com/library/view/book3/789
npm run dev
```

### Multiple Books (File-Based)

Create a `books.txt` file with one URL per line:
```
https://learning.oreilly.com/library/view/book1/123
https://learning.oreilly.com/library/view/book2/456
# Comments are supported
https://learning.oreilly.com/library/view/book3/789
```

Set `BOOK_URLS_FILE` in `.env`:
```bash
BOOK_URLS_FILE=./books.txt
npm run dev
```

**Priority**: `BOOK_URLS_FILE` > `BOOK_URLS` > `BOOK_URL` (legacy)

### Build for Production

```bash
npm run build
npm start
```

## Development

- **Type checking**: `npm run type-check`
- **Linting**: `npm run lint`
- **Formatting**: `npm run format`
- **Testing**: `npm test`

## Project Structure

```
src/
├── auth/          # Authentication logic
├── scrapers/      # Book scraping logic
├── pdf/           # PDF generation
├── utils/         # Shared utilities
└── index.ts       # Entry point
```

## License

MIT
