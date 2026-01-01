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
      // Navigate to O'Reilly Japan login page
      Logger.info('Navigating to login page...');
      await this.page.goto('https://www.oreilly.co.jp/ebook/login', {
        waitUntil: 'networkidle',
      });

      // Wait for the page to load
      await this.page.waitForLoadState('domcontentloaded');

      // Try multiple selectors for email/username field
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[name="username"]',
        'input[id="email"]',
        'input[id="username"]',
        '#login_id',
        '#email',
      ];

      let emailInput = null;
      for (const selector of emailSelectors) {
        emailInput = await this.page.$(selector);
        if (emailInput) {
          Logger.info(`Found email input with selector: ${selector}`);
          break;
        }
      }

      if (!emailInput) {
        throw new Error('Could not find email/username input field');
      }

      // Fill in email/username
      Logger.info('Entering email...');
      await emailInput.fill(config.email);

      // Try multiple selectors for password field
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[id="password"]',
        '#login_password',
      ];

      let passwordInput = null;
      for (const selector of passwordSelectors) {
        passwordInput = await this.page.$(selector);
        if (passwordInput) {
          Logger.info(`Found password input with selector: ${selector}`);
          break;
        }
      }

      if (!passwordInput) {
        throw new Error('Could not find password input field');
      }

      // Fill in password
      Logger.info('Entering password...');
      await passwordInput.fill(config.password);

      // Try multiple selectors for submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("ログイン")',
        'input[value="ログイン"]',
        '.login-button',
        '#login_button',
      ];

      let submitButton = null;
      for (const selector of submitSelectors) {
        submitButton = await this.page.$(selector);
        if (submitButton) {
          Logger.info(`Found submit button with selector: ${selector}`);
          break;
        }
      }

      if (!submitButton) {
        throw new Error('Could not find login button');
      }

      // Click the sign in button
      Logger.info('Clicking login button...');
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
          Logger.warn('Navigation timeout, but continuing...');
        }),
        submitButton.click(),
      ]);

      // Wait a bit for any redirects
      await this.page.waitForTimeout(2000);

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
