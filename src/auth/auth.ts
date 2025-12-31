import { Browser, BrowserContext, Page } from 'playwright';
import { promises as fs } from 'fs';
import { Logger } from '../utils/logger.js';

export interface AuthConfig {
  email: string;
  password: string;
}

export class OReillyAuth {
  private browser: Browser;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  constructor(browser: Browser) {
    this.browser = browser;
  }

  async login(config: AuthConfig): Promise<Page> {
    Logger.info('Starting O\'Reilly login process...');

    // Create a new browser context
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();

    try {
      // Navigate to O'Reilly login page
      Logger.info('Navigating to login page...');
      await this.page.goto('https://learning.oreilly.com/accounts/login/', {
        waitUntil: 'networkidle',
      });

      // Wait for the email input field
      await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });

      // Fill in email
      Logger.info('Entering email...');
      await this.page.fill('input[type="email"]', config.email);

      // Fill in password
      Logger.info('Entering password...');
      await this.page.fill('input[type="password"]', config.password);

      // Click the sign in button
      Logger.info('Clicking sign in button...');
      await this.page.click('button[type="submit"]');

      // Wait for navigation after login
      await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 });

      // Check if login was successful
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        throw new Error('Login failed: Could not verify authentication');
      }

      Logger.info('Successfully logged in to O\'Reilly');
      return this.page;
    } catch (error) {
      Logger.error('Login failed:', error);
      throw error;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.page) {
      return false;
    }

    try {
      // Check if we're on a page that requires authentication
      const url = this.page.url();

      // If we're still on the login page, authentication failed
      if (url.includes('/accounts/login/')) {
        return false;
      }

      // Check for user menu or other authenticated indicators
      const userMenu = await this.page.$('[data-testid="user-menu"], .user-menu, nav[aria-label="User"]');
      return userMenu !== null;
    } catch (error) {
      Logger.error('Error checking authentication status:', error);
      return false;
    }
  }

  async saveCookies(path: string): Promise<void> {
    if (!this.context) {
      throw new Error('No browser context available');
    }

    try {
      const cookies = await this.context.cookies();
      await fs.writeFile(path, JSON.stringify(cookies, null, 2));
      Logger.info(`Cookies saved to ${path}`);
    } catch (error) {
      Logger.error('Failed to save cookies:', error);
      throw error;
    }
  }

  async loadCookies(path: string): Promise<void> {
    if (!this.context) {
      this.context = await this.browser.newContext();
    }

    try {
      const cookiesString = await fs.readFile(path, 'utf-8');
      const cookies = JSON.parse(cookiesString);
      await this.context.addCookies(cookies);
      Logger.info(`Cookies loaded from ${path}`);
    } catch (error) {
      Logger.error('Failed to load cookies:', error);
      throw error;
    }
  }

  async getPage(): Promise<Page> {
    if (!this.page) {
      if (!this.context) {
        this.context = await this.browser.newContext();
      }
      this.page = await this.context.newPage();
    }
    return this.page;
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
  }
}
