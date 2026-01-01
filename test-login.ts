import { chromium } from 'playwright';
import { config } from 'dotenv';

config();

async function testLogin() {
  console.log('=== O\'Reilly Login Test ===\n');

  const email = process.env.OREILLY_EMAIL;
  const password = process.env.OREILLY_PASSWORD;

  if (!email || !password) {
    console.error('ERROR: OREILLY_EMAIL and OREILLY_PASSWORD must be set in .env file');
    process.exit(1);
  }

  console.log(`Email: ${email.substring(0, 3)}***`);
  console.log(`Password: ${password.length} characters\n`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable console logging
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

  try {
    console.log('[1] Navigating to login page...');
    await page.goto('https://www.oreilly.com/member/login/', {
      waitUntil: 'load',
      timeout: 15000,
    }).catch(() => {
      console.log('Navigation timeout, but continuing...');
    });

    await page.waitForTimeout(2000);
    console.log('Current URL:', page.url());

    // Take screenshot
    await page.screenshot({ path: 'step1-initial.png' });
    console.log('Screenshot saved: step1-initial.png\n');

    console.log('[2] Looking for email input...');
    const emailInput = await page.$('input#email');
    if (!emailInput) {
      console.error('ERROR: Email input not found!');
      await page.screenshot({ path: 'error-no-email-input.png' });
      await browser.close();
      return;
    }
    console.log('✓ Email input found');

    console.log('[3] Entering email...');
    await emailInput.fill(email);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'step2-email-filled.png' });
    console.log('✓ Email entered\n');

    console.log('[4] Looking for Continue button...');
    const continueButton = await page.$('button:has-text("Continue")');
    if (!continueButton) {
      console.error('ERROR: Continue button not found!');
      await page.screenshot({ path: 'error-no-continue-button.png' });

      // List all buttons
      const buttons = await page.$$('button');
      console.log('\nAll buttons on page:');
      for (let i = 0; i < buttons.length; i++) {
        const text = await buttons[i].textContent();
        console.log(`  Button ${i + 1}: "${text}"`);
      }

      await browser.close();
      return;
    }
    console.log('✓ Continue button found');

    console.log('[5] Clicking Continue button...');
    await continueButton.click();
    await page.waitForTimeout(3000);
    console.log('Current URL:', page.url());
    await page.screenshot({ path: 'step3-after-continue.png' });
    console.log('✓ Clicked Continue\n');

    console.log('[6] Looking for password input...');
    const passwordInput = await page.waitForSelector('input[type="password"]', {
      timeout: 10000
    }).catch(() => null);

    if (!passwordInput) {
      console.error('ERROR: Password input not found!');
      await page.screenshot({ path: 'error-no-password-input.png' });

      // Check what's on the page
      const pageContent = await page.content();
      console.log('\nPage title:', await page.title());
      console.log('Page contains "password":', pageContent.toLowerCase().includes('password'));
      console.log('Page contains "sign in":', pageContent.toLowerCase().includes('sign in'));

      // List all inputs
      const inputs = await page.$$('input');
      console.log(`\nAll inputs on page (${inputs.length}):`)
      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const type = await input.getAttribute('type');
        const id = await input.getAttribute('id');
        const name = await input.getAttribute('name');
        console.log(`  Input ${i + 1}: type="${type}" id="${id}" name="${name}"`);
      }

      console.log('\nWaiting 20 seconds for you to inspect...');
      await page.waitForTimeout(20000);

      await browser.close();
      return;
    }
    console.log('✓ Password input found');

    console.log('[7] Entering password...');
    await passwordInput.fill(password);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'step4-password-filled.png' });
    console.log('✓ Password entered\n');

    console.log('[8] Looking for Sign In button...');

    // List all buttons to see what's available
    const allButtons = await page.$$('button');
    console.log(`\nFound ${allButtons.length} buttons on page:`);
    for (let i = 0; i < allButtons.length; i++) {
      const text = await allButtons[i].textContent();
      const type = await allButtons[i].getAttribute('type');
      const isVisible = await allButtons[i].isVisible();
      const className = await allButtons[i].getAttribute('class');
      console.log(`  Button ${i + 1}: "${text?.trim()}" type="${type}" visible=${isVisible}`);
      console.log(`    class="${className}"`);
    }

    // Try to find visible Sign In button
    const signInSelectors = [
      'button[type="submit"]:visible',
      'button:has-text("Sign In"):visible',
      'button:has-text("Sign in"):visible',
      'button:has-text("Log In"):visible',
      'button:has-text("Continue"):visible',
    ];

    let signInButton = null;
    for (const selector of signInSelectors) {
      signInButton = await page.$(selector);
      if (signInButton) {
        const isVisible = await signInButton.isVisible();
        console.log(`Found button with selector: ${selector}, visible: ${isVisible}`);
        if (isVisible) {
          console.log(`✓ Using this button`);
          break;
        } else {
          signInButton = null;
        }
      }
    }

    // If still not found, try finding by visible submit buttons
    if (!signInButton) {
      console.log('\nTrying to find any visible submit button...');
      const submitButtons = await page.$$('button[type="submit"]');
      for (const btn of submitButtons) {
        const isVisible = await btn.isVisible();
        if (isVisible) {
          const text = await btn.textContent();
          console.log(`✓ Found visible submit button: "${text?.trim()}"`);
          signInButton = btn;
          break;
        }
      }
    }

    if (!signInButton) {
      console.error('ERROR: No visible sign in button found!');
      await page.screenshot({ path: 'error-no-visible-signin-button.png' });
      await browser.close();
      return;
    }

    console.log('[9] Clicking Sign In button...');
    await signInButton.click();
    await page.waitForTimeout(5000);
    console.log('Current URL:', page.url());
    await page.screenshot({ path: 'step5-after-signin.png' });
    console.log('✓ Clicked Sign In\n');

    console.log('[10] Checking authentication...');
    const url = page.url();
    console.log('Final URL:', url);

    if (url.includes('/login') || url.includes('/signin')) {
      console.error('❌ Still on login page - login failed!');
    } else if (url.includes('learning.oreilly.com') || url.includes('/ebook/')) {
      console.log('✅ Login successful!');
    } else {
      console.log('⚠️  Unexpected URL - check screenshot');
    }

    console.log('\nWaiting 15 seconds for you to inspect...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    await page.screenshot({ path: 'error-exception.png' });
  } finally {
    await browser.close();
    console.log('\nBrowser closed. Check screenshots for details.');
  }
}

testLogin();
