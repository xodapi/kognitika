import { test, expect } from '@playwright/test';

const TARGET_URL = process.env.BASE_URL || 'http://localhost:3006';

test('debug schulte page - headed', async ({ page }) => {
  // Capture console logs from the start
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto(`${TARGET_URL}/schulte`, { waitUntil: 'networkidle' });
  
  // Wait for React to hydrate - check for root element content
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    return root && root.children.length > 0;
  }, { timeout: 30000 });
  
  // Take screenshot
  await page.screenshot({ path: 'debug-schulte.png', fullPage: true });
  
  // Get page content after hydration
  const content = await page.content();
  console.log('Page content length:', content.length);
  console.log('Page title:', await page.title());
  
  // Look for any data-testid elements
  const testIds = await page.evaluate(() => {
    const elements = document.querySelectorAll('[data-testid]');
    return Array.from(elements).map(el => el.getAttribute('data-testid'));
  });
  console.log('Found data-testid attributes:', testIds);
  
  // Check if we're on the right page
  const url = page.url();
  console.log('Current URL:', url);
  
  // Check for root element
  const root = await page.$('#root');
  console.log('Root element:', root ? 'found' : 'not found');
  
  if (root) {
    const rootHtml = await root.evaluate(el => el.innerHTML);
    console.log('Root innerHTML length:', rootHtml.length);
    console.log('Root innerHTML preview:', rootHtml.slice(0, 2000));
  }
  
  // Also check for any buttons
  const buttons = await page.$$eval('button', btns => btns.map(b => ({ text: b.textContent?.trim().slice(0, 50), testid: b.getAttribute('data-testid'), class: b.className })));
  console.log('Buttons found:', buttons);
  
  // Check for any element with "start" in it
  const startElements = await page.$$eval('[data-testid*="start"], button:has-text("Начать"), button:has-text("Start")', els => els.map(e => ({ tag: e.tagName, text: e.textContent?.trim().slice(0, 50), testid: e.getAttribute('data-testid'), class: e.className })));
  console.log('Start-related elements:', startElements);
});
