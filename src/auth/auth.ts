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

    // Create a new browser context with realistic user agent
    this.context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });
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
      const passwordField = await this.page.$('input[type="password"]');
      if (!passwordField) {
        throw new Error('Password field not found');
      }
      await passwordField.fill(config.password);
      Logger.info('Password entered');

      // Try submitting with Enter key first (more reliable than clicking)
      Logger.info('Attempting to submit with Enter key...');

      const loginResponsePromise = this.page.waitForResponse(
        (response) => response.url().includes('/auth/login'),
        { timeout: 10000 }
      ).catch(() => null);

      await passwordField.press('Enter');

      // Wait a moment to see if Enter worked
      const loginResponse = await Promise.race([
        loginResponsePromise,
        this.page.waitForTimeout(2000).then(() => null),
      ]);

      if (loginResponse) {
        Logger.info('Login API called via Enter key');
        await this.page.waitForTimeout(3000);

        const isAuth = await this.isAuthenticated();
        if (isAuth) {
          Logger.info('Successfully logged in to O\'Reilly');
          return this.page;
        }
      }

      Logger.warn('Enter key did not work, trying to click button...');

      // Find and click the sign in/submit button (must be visible)
      const signInSelectors = [
        'button:has-text("Sign in"):visible',
        'button:has-text("Sign In"):visible',
        'button:has-text("Log In"):visible',
        'button:has-text("Continue"):visible',
        'button[type="submit"]:visible',
        'input[type="submit"]:visible',
      ];

      let signInButton = null;
      for (const selector of signInSelectors) {
        const btn = await this.page.$(selector);
        if (btn && (await btn.isVisible())) {
          signInButton = btn;
          Logger.info(`Found visible sign in button with selector: ${selector}`);
          break;
        }
      }

      // Fallback: find any visible submit button
      if (!signInButton) {
        Logger.warn('Could not find button with standard selectors, trying visible submit buttons...');
        const allButtons = await this.page.$$('button');
        for (const btn of allButtons) {
          const isVisible = await btn.isVisible();
          const text = await btn.textContent();
          if (isVisible && text && (text.toLowerCase().includes('sign') || text.toLowerCase().includes('log'))) {
            signInButton = btn;
            Logger.info(`Found visible button with text: ${text.trim()}`);
            break;
          }
        }
      }

      if (!signInButton) {
        throw new Error('Could not find visible sign in button');
      }

      Logger.info('Clicking sign in button...');

      // Wait for the login API call to complete
      const loginPromise = this.page.waitForResponse(
        (response) => response.url().includes('/auth/login') && response.status() === 200,
        { timeout: 30000 }
      ).catch(() => {
        Logger.warn('Login API response timeout, checking authentication anyway...');
        return null;
      });

      await signInButton.click();

      // Wait for either the API response or navigation
      await Promise.race([
        loginPromise,
        this.page.waitForNavigation({ waitUntil: 'load', timeout: 10000 }).catch(() => null),
        this.page.waitForTimeout(5000),
      ]);

      // Wait a bit more for any redirects or JavaScript to complete
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
      this.context = await this.browser.newContext({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
      });
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
        this.context = await this.browser.newContext({
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          viewport: { width: 1920, height: 1080 },
          locale: 'en-US',
          timezoneId: 'America/New_York',
        });
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
