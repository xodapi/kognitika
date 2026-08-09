import { expect, test } from '@playwright/test';
import { installSyntheticApi } from './helpers';
import {
  TOUCH_FLOOR_PX,
  beginSession,
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
const RESULTS = '[data-testid="results-section"]';
const VERDICT = '[data-testid="session-verdict"]';
const PRIMARY_ACTIONS = '[data-testid="session-primary-actions"]';
const RESULT_TABS = '[data-testid="results-view-tabs"]';
const STATS_VIEW = '[data-testid="result-stats"]';
const CURVE_VIEW = '[data-testid="result-curve"]';
const ATTENTION_VIEW = '[data-testid="result-attention"]';

async function openResults(page: import('@playwright/test').Page): Promise<void> {
  await openTrainer(page, ROUTE);
  await beginSession(page, PLAYFIELD);
  await page.getByTestId('stop-button').click();
  await expect(page.locator(RESULTS)).toBeVisible();
}

for (const viewport of MOBILE_VIEWPORTS) {
  test.describe(`Schulte results triage: ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test.beforeEach(async ({ page }) => {
      await installSyntheticApi(page);
    });

    test('keeps the verdict and primary actions in the first screen', async ({ page }) => {
      await openResults(page);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);

      for (const selector of [VERDICT, PRIMARY_ACTIONS]) {
        const box = await page.locator(selector).boundingBox();
        expect(box, `${selector} should be mounted`).not.toBeNull();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      }

      const actionTargets = requireMeasurement(
        await measureTouchTargets(page, `${PRIMARY_ACTIONS} button`, TOUCH_FLOOR_PX),
        `Schulte result actions at ${viewport.width}px`,
      );
      expect(actionTargets.measured).toBe(2);
      expect(actionTargets.violations).toEqual([]);
    });

    test('uses keyboard-operable views and mounts only the selected evidence', async ({ page }) => {
      await openResults(page);

      const tabs = page.locator(RESULT_TABS);
      await expect(tabs).toHaveAttribute('role', 'tablist');
      expect(await tabs.locator('[role="tab"]').evaluateAll((elements) =>
        elements.every((element) => Number.parseFloat(getComputedStyle(element).fontSize) >= 14),
      )).toBe(true);

      const statsTab = page.getByRole('tab', { name: 'Статистика' });
      const curveTab = page.getByRole('tab', { name: 'Кривая концентрации' });
      const attentionTab = page.getByRole('tab', { name: 'Карта внимания' });
      await expect(statsTab).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator(STATS_VIEW)).toBeVisible();
      await expect(page.locator(CURVE_VIEW)).toHaveCount(0);

      await curveTab.focus();
      await page.keyboard.press('Enter');
      await expect(curveTab).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator(CURVE_VIEW)).toBeVisible();
      await expect(page.locator(STATS_VIEW)).toHaveCount(0);
      await expect(page.locator(ATTENTION_VIEW)).toHaveCount(0);

      await attentionTab.focus();
      await page.keyboard.press('Enter');
      await expect(attentionTab).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator(ATTENTION_VIEW)).toBeVisible();
      await expect(page.locator(CURVE_VIEW)).toHaveCount(0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
    });
  });
}

test.describe('Schulte desktop results layout', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await installSyntheticApi(page);
  });

  test('retains the two-column stats and concentration curve panel', async ({ page }) => {
    await openResults(page);
    const [stats, curve] = await Promise.all([
      page.locator(STATS_VIEW).boundingBox(),
      page.locator(CURVE_VIEW).boundingBox(),
    ]);

    expect(stats).not.toBeNull();
    expect(curve).not.toBeNull();
    expect(Math.abs(stats!.y - curve!.y)).toBeLessThan(2);
    expect(stats!.x).toBeLessThan(curve!.x);
  });
});
