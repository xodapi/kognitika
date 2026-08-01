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
      if (index < 4) {
        await expect(page.getByText(`Вопрос ${index + 2} из 5:`)).toBeVisible();
      }
    }

    await expect(page.getByRole('heading', { name: 'Анализ завершен' })).toBeVisible();
    await expect(page.getByText('Таблицы Шульте')).toBeVisible();

    await page.getByRole('button', { name: /Начать рекомендованное/i }).click();

    await expect(page).toHaveURL(/\/schulte$/);
    await expectAppReady(page);
    await expect(page.getByRole('button', { name: 'Начать тест' })).toBeVisible();
    expect(browserErrors).toEqual([]);
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
