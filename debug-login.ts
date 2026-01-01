import { chromium } from 'playwright';
import { config } from 'dotenv';

config();

async function debugLogin() {
  console.log('=== O\'Reilly Login Page Debugger ===\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to login page...');
    try {
      await page.goto('https://www.oreilly.com/member/login/', {
        waitUntil: 'load',
        timeout: 10000,
      });
    } catch (error) {
      console.log('Navigation timeout, but continuing...');
    }

    await page.waitForTimeout(3000);
    console.log('\nCurrent URL:', page.url());

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'login-page.png', fullPage: true });
    console.log('Screenshot saved: login-page.png');

    // Find all input fields
    console.log('\n=== Input Fields ===');
    const inputs = await page.$$('input');
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const id = await input.getAttribute('id');
      const className = await input.getAttribute('class');
      const placeholder = await input.getAttribute('placeholder');

      console.log(`Input ${i + 1}:`);
      console.log(`  type: ${type}`);
      console.log(`  name: ${name}`);
      console.log(`  id: ${id}`);
      console.log(`  class: ${className}`);
      console.log(`  placeholder: ${placeholder}\n`);
    }

    // Find all buttons
    console.log('\n=== Buttons ===');
    const buttons = await page.$$('button');
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const type = await button.getAttribute('type');
      const className = await button.getAttribute('class');
      const text = await button.textContent();

      console.log(`Button ${i + 1}:`);
      console.log(`  type: ${type}`);
      console.log(`  class: ${className}`);
      console.log(`  text: ${text}\n`);
    }

    // Check for submit inputs
    console.log('\n=== Submit Inputs ===');
    const submits = await page.$$('input[type="submit"]');
    for (let i = 0; i < submits.length; i++) {
      const submit = submits[i];
      const value = await submit.getAttribute('value');
      const id = await submit.getAttribute('id');
      const className = await submit.getAttribute('class');

      console.log(`Submit ${i + 1}:`);
      console.log(`  value: ${value}`);
      console.log(`  id: ${id}`);
      console.log(`  class: ${className}\n`);
    }

    // Check for forms
    console.log('\n=== Forms ===');
    const forms = await page.$$('form');
    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      const action = await form.getAttribute('action');
      const method = await form.getAttribute('method');
      const id = await form.getAttribute('id');

      console.log(`Form ${i + 1}:`);
      console.log(`  action: ${action}`);
      console.log(`  method: ${method}`);
      console.log(`  id: ${id}\n`);
    }

    console.log('\n=== Page will stay open for 30 seconds ===');
    console.log('Please inspect the page manually...\n');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugLogin();
