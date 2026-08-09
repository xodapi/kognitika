import { expect, test } from '@playwright/test';
import { installSyntheticApi } from './helpers';
import {
  TOUCH_FLOOR_PX,
  beginSession,
  measureReachability,
  measureTouchTargets,
  openTrainer,
  requireMeasurement,
} from './mobile-contract';

const MOBILE_VIEWPORTS = [
  { name: 'compact phone', width: 320, height: 700 },
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'standard phone', width: 390, height: 844 },
] as const;

const ROUTE = '/schulte';
const PLAYFIELD = '[data-testid="grid-container"]';
const ABORT = '[data-testid="stop-button"]';
const CHART_SURFACES = 'svg.recharts-surface, [data-testid="responsive-container"] svg';

async function startSchulte(page: import('@playwright/test').Page): Promise<void> {
  await openTrainer(page, ROUTE);
  await beginSession(page, PLAYFIELD);
}

for (const viewport of MOBILE_VIEWPORTS) {
  test.describe(`Schulte mobile play isolation: ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test.beforeEach(async ({ page }) => {
      await installSyntheticApi(page);
    });

    test('abort is visible, tappable, and ends the session without scrolling', async ({ page }) => {
      await startSchulte(page);

      expect(await page.evaluate(() => window.scrollY)).toBe(0);

      const report = requireMeasurement(
        await measureReachability(page, ABORT),
        `Schulte abort control at ${viewport.width}px`,
      );
      expect(report.inViewport).toBe(true);
      expect(report.hitTestable).toBe(true);

      const target = requireMeasurement(
        await measureTouchTargets(page, ABORT, TOUCH_FLOOR_PX),
        `Schulte abort touch target at ${viewport.width}px`,
      );
      expect(target.measured).toBe(1);
      expect(target.violations).toEqual([]);

      await page.locator(ABORT).click();
      await expect(page.locator('[data-testid="results-section"]')).toBeVisible();
    });

    test('does not mount analytical charts during active mobile play', async ({ page }) => {
      await startSchulte(page);

      // Hidden is not good enough: a hidden Recharts tree still reconciles and
      // animates. This must be zero actual chart surfaces in the DOM.
      await expect(page.locator(CHART_SURFACES)).toHaveCount(0);
    });

    test('abort does not overlap the fixed bottom navigation', async ({ page }) => {
      await startSchulte(page);

      const layout = await page.evaluate(() => {
        const abort = document.querySelector('[data-testid="stop-button"]')?.getBoundingClientRect();
        const nav = Array.from(document.querySelectorAll('div')).find((element) =>
          String(element.className).includes('fixed left-1/2')
          && String(element.className).includes('max-w-sm'),
        )?.getBoundingClientRect();
        if (!abort || !nav) return { found: false };
        const overlaps = !(
          abort.right <= nav.left
          || abort.left >= nav.right
          || abort.bottom <= nav.top
          || abort.top >= nav.bottom
        );
        return { found: true, overlaps };
      });

      expect(layout).toEqual({ found: true, overlaps: false });
    });
  });
}

test.describe('Schulte desktop play analytics parity', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await installSyntheticApi(page);
  });

  test('keeps in-play analytics mounted on desktop and results analytics after abort', async ({ page }) => {
    await startSchulte(page);
    await expect(page.locator(CHART_SURFACES)).not.toHaveCount(0);

    await page.locator(ABORT).click();
    await expect(page.locator('[data-testid="results-section"]')).toBeVisible();
    await expect(page.locator(CHART_SURFACES)).not.toHaveCount(0);
  });
});
