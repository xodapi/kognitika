import { expect, test } from '@playwright/test';
import { expectAppReady, installSyntheticApi } from './helpers';

test.describe('mobile training gallery', () => {
  test.use({ viewport: { width: 320, height: 700 } });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await installSyntheticApi(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await expectAppReady(page);
  });

  test('keeps domain tabs and module purposes readable at compact width', async ({ page }) => {
    const tabs = page.getByTestId('training-domain-tab');
    await expect(tabs).toHaveCount(3);
    await expect(tabs.filter({ hasText: 'База' })).toHaveAttribute('aria-pressed', 'true');

    const tabLayout = await tabs.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth };
      }),
    );
    for (const tab of tabLayout) {
      expect(tab.height).toBeGreaterThanOrEqual(44);
      expect(tab.width).toBeGreaterThanOrEqual(44);
      expect(tab.scrollWidth).toBeLessThanOrEqual(tab.clientWidth + 1);
    }

    const descriptions = page.getByTestId('training-module-card').locator('p');
    await expect(descriptions.first()).toHaveCSS('font-size', '14px');
    await expect(page.getByTestId('training-module-card').first()).toContainText('Старт');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('switches domains without clipping the selected tab or card copy', async ({ page }) => {
    const engineeringTab = page.getByTestId('training-domain-tab').filter({ hasText: 'Инжиниринг' });
    await engineeringTab.click();
    await expect(engineeringTab).toHaveAttribute('aria-pressed', 'true');
    const firstCard = page.getByTestId('training-module-card').first();
    await expect(firstCard).toContainText('Архитектура контекста');
    await expect(page.getByTestId('training-module-card').filter({ hasText: 'Таблицы Шульте' })).toHaveCount(0);

    const category = firstCard.getByText('Когнитивный инжиниринг', { exact: true });
    await expect(category).toContainText('Когнитивный инжиниринг');
    const categoryLayout = await category.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      height: element.getBoundingClientRect().height,
    }));
    expect(categoryLayout.scrollWidth).toBeLessThanOrEqual(categoryLayout.clientWidth + 1);
    expect(categoryLayout.height).toBeGreaterThanOrEqual(24);
  });
});
