import { expect, test } from '@playwright/test';
import { collectUnexpectedBrowserErrors, expectAppReady, installSyntheticApi } from './helpers';

test.describe('Post-game navigation', () => {
  test.beforeEach(async ({ page }) => {
    await installSyntheticApi(page);
  });

  test('Numerical Analysis recommendation opens the next training module', async ({ page }) => {
    const browserErrors = collectUnexpectedBrowserErrors(page);

    await page.goto('/numerical');
    await expectAppReady(page);

    await page.getByRole('button', { name: 'Начать тест' }).click();

    for (let index = 0; index < 5; index += 1) {
      const answerButton = page.getByRole('button', { name: /^-?\d+%$/ }).first();
      await expect(answerButton).toBeVisible();
      await answerButton.click();
    }

    await expect(page.getByRole('heading', { name: 'Анализ завершен' })).toBeVisible();
    await expect(page.getByText('Логические матрицы')).toBeVisible();

    await page.getByRole('button', { name: /Начать рекомендованное/i }).click();

    await expect(page).toHaveURL(/\/logical$/);
    await expectAppReady(page);
    await expect(page.getByText(/Системная логика|Логическая матрица/i)).toBeVisible();
    expect(browserErrors).toEqual([]);
  });
});
