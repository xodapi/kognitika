import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12/13', width: 390, height: 844 },
];

const SCHULTE_URL = '/schulte';

test.describe('Schulte Trainer - Mobile Layout Verification', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test('should load trainer page without errors', async ({ page }) => {
        await page.goto(SCHULTE_URL);
        await page.waitForLoadState('networkidle');
        
        // Wait for the page to render
        await expect(page.locator('[data-testid="start-button"]')).toBeVisible({ timeout: 10000 });
      });

      test('all text elements should have font-size >= 14px', async ({ page }) => {
        await page.goto(SCHULTE_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('[data-testid="start-button"]', { state: 'visible', timeout: 10000 });

        const smallTextElements = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('*'));
          return elements
            .filter(el => {
              const style = window.getComputedStyle(el);
              const fontSize = parseFloat(style.fontSize);
              const text = el.textContent?.trim();
              return fontSize > 0 && fontSize < 14 && text && text.length > 0;
            })
            .map(el => ({
              tagName: el.tagName,
              className: el.className,
              fontSize: parseFloat(window.getComputedStyle(el).fontSize),
              text: el.textContent?.trim().slice(0, 50),
            }));
        });

        if (smallTextElements.length > 0) {
          console.warn('Elements with font-size < 14px:', smallTextElements);
        }
        
        expect(smallTextElements.length).toBe(0);
      });

      test('key elements should be visible without scrolling (bottom <= viewport height)', async ({ page }) => {
        await page.goto(SCHULTE_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('[data-testid="start-button"]', { state: 'visible', timeout: 10000 });

        const keyElementsVisible = await page.evaluate(() => {
          const viewportHeight = window.innerHeight;
          const selectors = [
            '[data-testid="start-button"]',
            '[data-testid="hud-timer"]',
            '[data-testid="timer-display"]',
            '[data-testid="errors-count"]',
            'button[type="button"]', // generic buttons
          ];

          const results: Record<string, { bottom: number; visible: boolean; exists: boolean }> = {};

          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              const element = elements[0] as HTMLElement;
              const rect = element.getBoundingClientRect();
              results[selector] = {
                bottom: rect.bottom,
                visible: rect.bottom <= viewportHeight && rect.top >= 0,
                exists: true,
              };
            } else {
              results[selector] = { bottom: -1, visible: false, exists: false };
            }
          }

          return { viewportHeight, elements: results };
        });

        console.log('Viewport check results:', JSON.stringify(keyElementsVisible, null, 2));

        // Check that key elements exist and are visible
        expect(keyElementsVisible.elements['[data-testid="start-button"]']?.exists).toBe(true);
        expect(keyElementsVisible.elements['[data-testid="start-button"]']?.visible).toBe(true);
        
        // Timer HUD should be visible
        expect(keyElementsVisible.elements['[data-testid="hud-timer"]']?.exists).toBe(true);
        expect(keyElementsVisible.elements['[data-testid="hud-timer"]']?.visible).toBe(true);
      });

      test('grid should be visible and properly sized', async ({ page }) => {
        await page.goto(SCHULTE_URL);
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('[data-testid="start-button"]', { state: 'visible', timeout: 10000 });

        // Click start to see the grid
        await page.click('[data-testid="start-button"]');
        
        // Wait for briefing modal and confirm
        await page.waitForSelector('button:has-text("Инициализировать Тест")', { state: 'visible', timeout: 5000 });
        await page.click('button:has-text("Инициализировать Тест")');

        // Wait for game to start
        await page.waitForTimeout(1000);

        const gridInfo = await page.evaluate(() => {
          const grid = document.querySelector('[style*="gridTemplateColumns"]') || document.querySelector('.grid');
          const cells = document.querySelectorAll('button[style*="gridTemplateColumns"], button.aspect-square');
          
          return {
            gridExists: !!grid,
            cellCount: cells.length,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
          };
        });

        console.log('Grid info:', gridInfo);
        expect(gridInfo.gridExists).toBe(true);
      });
    });
  }
});

test.describe('Mobile layout regression - quick check', () => {
  test('Schulte page loads and key elements are present', async ({ page }) => {
    await page.goto('/schulte');
    await page.waitForLoadState('networkidle');
    
    // Check page title
    await expect(page).toHaveTitle(/Когнитика|Schulte/);
    
    // Check main elements exist
    await expect(page.locator('[data-testid="start-button"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="hud-timer"]')).toBeVisible();
  });
});
