# O'Reilly Ebook Scraper

TypeScript application to scrape ebooks from O'Reilly Learning Platform (https://learning.oreilly.com/) using Playwright and save them as PDFs.

**⚠️ Important**: This tool should only be used with proper authorization and in compliance with O'Reilly's terms of service. Intended for legitimate subscribers to create personal backups of content they have legal access to.

## Features

- Automated login to O'Reilly Learning Platform
- Scrape complete ebooks
- Generate PDFs from scraped content
- Session persistence to avoid repeated logins
- Rate limiting to be respectful to the server

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

Run the scraper:
```bash
npm run dev
```

Build for production:
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
