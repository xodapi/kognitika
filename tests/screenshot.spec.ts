import { expect, test } from '@playwright/test';
import { collectUnexpectedBrowserErrors, expectAppReady, installSyntheticApi } from './helpers';

// Numerical recommendation navigation is covered deterministically in
// src/tests/post-game-navigation.test.tsx. This browser spec exercises typing's
// complete input flow and its rendered recommendation.

test.describe('Post-game navigation', () => {
  test.beforeEach(async ({ page }) => {
    await installSyntheticApi(page);
  });

  test('Speed Typing completion offers a next-step recommendation', async ({ page }) => {
    const browserErrors = collectUnexpectedBrowserErrors(page);

    await page.goto('/typing');
    await expectAppReady(page);

    await page.getByRole('button', { name: 'Запустить тест' }).click();
    const promptText = await page.locator('div.select-none').first().innerText();
    await page.locator('textarea').fill(promptText);

    await expect(page.getByRole('heading', { name: 'Тест завершен!' })).toBeVisible();
    await expect(page.getByText('Следующий тест')).toBeVisible();
    await expect(page.getByRole('button', { name: /Начать рекомендованное/i })).toBeVisible();

    await page.getByRole('button', { name: /Начать рекомендованное/i }).click();
    await expect(page).toHaveURL(/\/schulte$/);
    await expectAppReady(page);
    expect(browserErrors).toEqual([]);
  });
});
