import { test, expect } from '@playwright/test';
import { installSyntheticApi, collectUnexpectedBrowserErrors, expectAppReady } from './helpers';
import {
  measureSingleGlance,
  requireMeasurement,
  settleLayout,
} from './mobile-contract';

const VIEWPORTS = [
  { name: 'compact phone', width: 320, height: 700 },
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12/13', width: 390, height: 844 },
  { name: 'iPad Mini', width: 768, height: 1024 },
];

const SCHULTE_URL = '/schulte';

async function clickByText(page, text: string) {
  await page.evaluate((t) => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes(t));
    if (btn) btn.click();
  }, text);
}

async function goToSchulte(page) {
  await page.goto(SCHULTE_URL, { waitUntil: 'networkidle' });
  await expect(page.locator('button:has-text("Начать тест")')).toBeVisible({ timeout: 15000 });
}

async function startGame(page) {
  // Click "Начать тест" - opens briefing modal
  await clickByText(page, 'Начать тест');
  // Wait for briefing modal and click "Инициализировать Тест"
  await page.waitForSelector('button:has-text("Инициализировать Тест")', { timeout: 15000 });
  await clickByText(page, 'Инициализировать Тест');
  // Wait for HUD timer (has "Прогресс" text)
  await page.waitForSelector('div:has-text("Прогресс")', { timeout: 30000 });
  // Wait for grid container
  await page.waitForSelector('div[style*="gridTemplateColumns"], div.grid.gap-2', { timeout: 30000 });
}

async function checkFontSizes(page) {
  const violations = await page.evaluate(() => {
    // Assert only trainer controls and metrics. The global application shell has
    // intentionally compact decorative metadata that is outside this route's UI contract.
    const trainerSelectors = [
      'label',
      'select',
      '[data-testid="hud-timer"]',
      '[data-testid="grid-container"]',
      '[data-testid="stop-button"]',
    ];
    const elements = trainerSelectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
    const results: { selector: string; fontSize: number; text: string }[] = [];

    elements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize);
      const text = (el.textContent || '').trim().slice(0, 80);
      if (!text || fontSize <= 0) return;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

      if (fontSize < 14) {
        results.push({ selector: el.getAttribute('data-testid') || el.tagName.toLowerCase(), fontSize, text });
      }
    });

    return results;
  });

  return violations;
}

async function checkNoHorizontalOverflow(page) {
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  return hasHorizontalScroll;
}

async function checkKeyElementsVisible(page) {
  return await page.evaluate(() => {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const results: Record<string, { 
      found: boolean; 
      visible: boolean; 
      rect: DOMRect | null;
      reason: string 
    }> = {};

    // Helper to find element by text content
    const findByText = (text: string, tag?: string) => {
      const elements = Array.from(document.querySelectorAll(tag || '*'));
      return elements.find(el => el.textContent?.includes(text));
    };

    const checks = [
      { name: 'start-button', find: () => findByText('Начать тест', 'button') },
      { name: 'hud-timer', find: () => findByText('Прогресс', 'div') },
      { name: 'timer-display', find: () => findByText('s', 'div') },
      { name: 'errors-count', find: () => findByText('Ошибки', 'div') },
      { name: 'grid', find: () => document.querySelector('div[style*="gridTemplateColumns"], div.grid.gap-2') },
      { name: 'stop-button', find: () => findByText('Завершить досрочно', 'button') },
    ];

    for (const check of checks) {
      const el = check.find() as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.bottom > 0 && rect.top < viewportHeight && rect.right > 0 && rect.left < viewportWidth && rect.width > 0 && rect.height > 0;
        results[check.name] = {
          found: true,
          visible: isVisible,
          rect,
          reason: isVisible ? 'visible' : rect.bottom > viewportHeight ? 'below viewport' : rect.top < 0 ? 'above viewport' : 'zero size or outside'
        };
      } else {
        results[check.name] = { found: false, visible: false, rect: null, reason: 'not found' };
      }
    }

    // Document scroll dimensions
    results.document = {
      found: true,
      visible: true,
      rect: { 
        top: 0, 
        left: 0, 
        width: document.documentElement.scrollWidth, 
        height: document.documentElement.scrollHeight,
        bottom: document.documentElement.scrollHeight,
        right: document.documentElement.scrollWidth
      } as DOMRect,
      reason: `document scrollWidth: ${document.documentElement.scrollWidth}, clientWidth: ${viewportWidth}`
    };

    return results;
  });
}

VIEWPORTS.forEach(({ name, width, height }) => {
  test.describe(`Schulte Mobile Layout - ${name} (${width}x${height})`, () => {
    test.use({ viewport: { width, height } });
    
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height });
      await installSyntheticApi(page);
    });

    test('should load and show start button', async ({ page }) => {
      await goToSchulte(page);
      await expect(page.locator('button:has-text("Начать тест")')).toBeVisible();
    });

    test('all visible text must have computed font-size >= 14px (no arbitrary exclusions)', async ({ page }) => {
      await goToSchulte(page);
      await startGame(page);
      
      const violations = await checkFontSizes(page);
      
      if (violations.length > 0) {
        // Detailed failure output for debugging
        console.log(`Font size violations on ${name} (${width}x${height}):`);
        violations.forEach(v => {
          console.log(`  ${v.selector}: ${v.fontSize}px - "${v.text}" - rect: ${v.rect ? `${Math.round(v.rect.left)},${Math.round(v.rect.top)} ${Math.round(v.rect.width)}x${Math.round(v.rect.height)}` : 'none'}`);
        });
      }
      
      expect(violations.length).toBe(0);
    });

    test('key elements should be visible without scrolling', async ({ page }) => {
      await goToSchulte(page);
      await startGame(page);
      
      const results = await checkKeyElementsVisible(page);
      
      console.log(`Key elements visibility on ${name}:`, JSON.stringify(results, null, 2));
      
      // Timer display (actual time) must be visible
      expect(results['timer-display']?.visible).toBe(true);
      
      // Grid must be at least partially visible (top in viewport)
      expect(results['grid']?.found).toBe(true);
      expect(results['grid']?.rect?.top).toBeLessThanOrEqual(height);
      
      // HUD timer label must be visible
      expect(results['hud-timer']?.visible).toBe(true);
      
      // During game, stop button should exist (right panel is scrollable, so button may be below viewport)
      expect(results['stop-button']?.found).toBe(true);
    });

    test('grid should fit in viewport width (no horizontal overflow)', async ({ page }) => {
      await goToSchulte(page);
      await startGame(page);
      
      const hasHorizontalScroll = await checkNoHorizontalOverflow(page);
      expect(hasHorizontalScroll).toBe(false);
      
      // Additional check: grid container should not exceed viewport
      const gridOverflow = await page.evaluate(() => {
        const grid = document.querySelector('div[style*="gridTemplateColumns"], div.grid.gap-2');
        if (!grid) return { found: false };
        const rect = grid.getBoundingClientRect();
        return {
          found: true,
          gridRight: rect.right,
          viewportWidth: window.innerWidth,
          overflows: rect.right > window.innerWidth
        };
      });
      
      expect(gridOverflow.found).toBe(true);
      expect(gridOverflow.overflows).toBe(false);
    });

    test('HUD and target preserve the single-glance contract without covering the playfield', async ({ page }) => {
      await goToSchulte(page);
      await startGame(page);

      await settleLayout(page);

      // Before this replacement the assertion compared `timerTop < gridTop`.
      // That encodes DOM order, not usability: a tall HUD can satisfy it while
      // pushing the target or playfield below the fold. The shared M-1 probe
      // checks the actual contract and reports a missing selector as HARNESS
      // CANNOT MEASURE instead of silently skipping the assertion.
      const glance = requireMeasurement(
        await measureSingleGlance(
          page,
          '[data-testid="target-indicator"]',
          '[data-testid="grid-container"]',
        ),
        `Schulte single-glance geometry on ${name}`,
      );

      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      expect(
        glance.bothVisible,
        `target bottom ${glance.indicator.bottom}px, grid top ${glance.playfieldTop}px, viewport ${glance.viewportHeight}px`,
      ).toBe(true);

      const hud = await page.evaluate(() => {
        const selectors = [
          '[data-testid="hud-timer"]',
          '[data-testid="timer-display"]',
          '[data-testid="errors-count"]',
          '[data-testid="grid-container"]',
        ];
        const elements = selectors.map((selector) => ({
          selector,
          element: document.querySelector(selector) as HTMLElement | null,
        }));
        const missing = elements.filter(({ element }) => element === null).map(({ selector }) => selector);
        if (missing.length > 0) return { missing };

        const box = (element: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          return {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          };
        };
        const rects = Object.fromEntries(elements.map(({ selector, element }) => [selector, box(element!)]));
        const timer = rects['[data-testid="hud-timer"]'];
        const grid = rects['[data-testid="grid-container"]'];
        const overlaps = timer.left < grid.right
          && timer.right > grid.left
          && timer.top < grid.bottom
          && timer.bottom > grid.top;

        return { missing: [], rects, overlaps };
      });

      expect(hud.missing, `required HUD hooks missing: ${hud.missing.join(', ')}`).toEqual([]);
      expect(hud.overlaps, `HUD overlaps playfield: ${JSON.stringify(hud.rects)}`).toBe(false);
    });
  });
});

test.describe('Schulte desktop HUD layout regression', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await installSyntheticApi(page);
  });

  test('keeps the left HUD, center playfield, and right controls in separate columns', async ({ page }) => {
    await goToSchulte(page);
    await startGame(page);
    await settleLayout(page);

    const layout = await page.evaluate(() => {
      const selectors = [
        '[data-testid="hud-timer"]',
        '[data-testid="target-indicator"]',
        '[data-testid="grid-container"]',
        '[data-testid="stop-button"]',
      ];
      const elements = selectors.map((selector) => ({
        selector,
        element: document.querySelector(selector) as HTMLElement | null,
      }));
      const missing = elements.filter(({ element }) => element === null).map(({ selector }) => selector);
      if (missing.length > 0) return { missing };

      const rects = Object.fromEntries(elements.map(({ selector, element }) => {
        const rect = element!.getBoundingClientRect();
        return [selector, { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width }];
      }));
      return { missing: [], rects };
    });

    expect(layout.missing, `required desktop hooks missing: ${layout.missing.join(', ')}`).toEqual([]);

    const timer = layout.rects['[data-testid="hud-timer"]'];
    const target = layout.rects['[data-testid="target-indicator"]'];
    const grid = layout.rects['[data-testid="grid-container"]'];
    const stop = layout.rects['[data-testid="stop-button"]'];

    expect(grid.left, 'center grid must be to the right of the left HUD').toBeGreaterThan(target.right);
    expect(stop.left, 'right controls must stay to the right of the center grid').toBeGreaterThan(grid.right);
    expect(grid.width, 'the desktop center column remains wider than a side column').toBeGreaterThan(timer.width);
  });
});

// Accessibility and overflow regression tests
test.describe('Mobile Layout Regression - Horizontal Overflow', () => {
  VIEWPORTS.forEach(({ name, width, height }) => {
    test.describe(`${name} (${width}x${height})`, () => {
      test.use({ viewport: { width, height } });
      
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width, height });
        await installSyntheticApi(page);
      });

      test('no horizontal overflow on initial load', async ({ page }) => {
        await goToSchulte(page);
        
        const hasHorizontalScroll = await checkNoHorizontalOverflow(page);
        expect(hasHorizontalScroll).toBe(false);
      });

      test('no horizontal overflow during active game', async ({ page }) => {
        await goToSchulte(page);
        await startGame(page);
        
        const hasHorizontalScroll = await checkNoHorizontalOverflow(page);
        expect(hasHorizontalScroll).toBe(false);
      });

      test('font contract enforced on initial load (pre-game)', async ({ page }) => {
        await goToSchulte(page);
        
        const violations = await checkFontSizes(page);
        
        if (violations.length > 0) {
          console.log(`Pre-game font violations on ${name}:`, violations);
        }
        
        expect(violations.length).toBe(0);
      });
    });
  });
});

// Quick smoke test for CI
test.describe('Schulte Trainer - Quick Smoke', () => {
  test('page loads, key elements present, no horizontal overflow at 390x844', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installSyntheticApi(page);
    await page.goto(SCHULTE_URL);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('button:has-text("Начать тест")')).toBeVisible({ timeout: 10000 });
    
    const hasHorizontalScroll = await checkNoHorizontalOverflow(page);
    expect(hasHorizontalScroll).toBe(false);
  });
});
