# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A TypeScript application that uses Playwright to scrape ebooks from O'Reilly Learning Platform (https://learning.oreilly.com/) and save them as PDFs.

**Important**: This tool should only be used with proper authorization and in compliance with O'Reilly's terms of service. Intended for legitimate subscribers to create personal backups.

## Tech Stack

- **Language**: TypeScript
- **Browser Automation**: Playwright
- **Runtime**: Node.js

## Development Commands

```bash
# Install dependencies
npm install

# Run the scraper (once implemented)
npm start

# Build TypeScript
npm run build

# Run tests
npm test

# Type checking
npm run type-check
```

## Architecture Overview

### Core Components

1. **Authentication Module** - Handles login to O'Reilly Learning Platform
2. **Book Scraper** - Navigates and extracts book content
3. **PDF Generator** - Converts scraped content to PDF format
4. **Session Management** - Maintains browser sessions and handles cookies

### Key Considerations

- **Rate Limiting**: Implement delays between requests to avoid overwhelming the server
- **Authentication**: Securely handle user credentials (never commit credentials to git)
- **Error Handling**: Robust error handling for network issues, authentication failures, and content extraction errors
- **Session Persistence**: Save session cookies to avoid repeated logins

## Project Structure

```
src/
  ├── auth/          # Authentication logic
  ├── scrapers/      # Book scraping logic
  ├── pdf/           # PDF generation
  ├── utils/         # Shared utilities
  └── index.ts       # Entry point
```
