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
      await this.page.goto('https://www.oreilly.com/member/login/', {
        waitUntil: 'load',
        timeout: 15000,
      }).catch(() => {
        Logger.warn('Navigation timeout, but continuing...');
      });

      await this.page.waitForTimeout(2000);

      // STEP 1: Enter email and click Continue
      Logger.info('Step 1: Entering email address...');

      // Wait for email input
      await this.page.waitForSelector('input[type="email"], input#email', { timeout: 10000 });

      // Fill in email
      await this.page.fill('input#email', config.email);
      Logger.info('Email entered');

      // Click Continue button
      Logger.info('Clicking Continue button...');
      const continueButton = await this.page.$('button:has-text("Continue")');
      if (!continueButton) {
        throw new Error('Could not find Continue button');
      }

      await continueButton.click();

      // Wait for password page to load
      Logger.info('Waiting for password page...');
      await this.page.waitForTimeout(2000);

      // STEP 2: Enter password and submit
      Logger.info('Step 2: Entering password...');

      // Wait for password field to appear
      await this.page.waitForSelector('input[type="password"]', { timeout: 10000 });

      // Fill in password
      await this.page.fill('input[type="password"]', config.password);
      Logger.info('Password entered');

      // Find and click the sign in/submit button
      const signInSelectors = [
        'button[type="submit"]',
        'button:has-text("Sign In")',
        'button:has-text("Log In")',
        'button:has-text("Continue")',
        'input[type="submit"]',
      ];

      let signInButton = null;
      for (const selector of signInSelectors) {
        signInButton = await this.page.$(selector);
        if (signInButton) {
          Logger.info(`Found sign in button with selector: ${selector}`);
          break;
        }
      }

      if (!signInButton) {
        throw new Error('Could not find sign in button');
      }

      Logger.info('Clicking sign in button...');
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'load', timeout: 30000 }).catch(() => {
          Logger.warn('Navigation timeout after login, but continuing...');
        }),
        signInButton.click(),
      ]);

      // Wait for login to complete
      await this.page.waitForTimeout(3000);

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
      if (url.includes('/login') || url.includes('/signin')) {
        return false;
      }

      // If we're on the ebook page, we're likely authenticated
      if (url.includes('/ebook/') || url.includes('learning.oreilly.com')) {
        return true;
      }

      // Check for user menu or other authenticated indicators
      const authIndicators = [
        '[data-testid="user-menu"]',
        '.user-menu',
        'nav[aria-label="User"]',
        '.logout',
        'a[href*="logout"]',
        '.user-info',
      ];

      for (const selector of authIndicators) {
        const element = await this.page.$(selector);
        if (element) {
          return true;
        }
      }

      // If we got here and we're not on the login page, assume authenticated
      return !url.includes('/login');
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
