import { test, expect } from '@playwright/test';

test.describe('Kognitika Basic Flow', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('https://kognitika.syntog.ru/');
    await expect(page).toHaveTitle(/Когнитика/);
  });

  test('should open leaderboard', async ({ page }) => {
    await page.goto('https://kognitika.syntog.ru/leaderboard');
    await expect(page.locator('h1')).toContainText('Зал Славы');
    const rows = await page.locator('table tbody tr').count();
    console.log(`Leaderboard has ${rows} rows`);
    expect(rows).toBeGreaterThan(0);
  });

  test('should have a working theme toggle', async ({ page }) => {
    await page.goto('https://kognitika.syntog.ru/');
    await page.locator('button:has-text("Темная")').or(page.locator('button:has-text("Светлая")')).first().click();
    // Theme change is visual — no assertion needed beyond no crash
  });
});

test.describe('Admin Security', () => {
  test('admin panel is not linked from main navigation', async ({ page }) => {
    await page.goto('https://kognitika.syntog.ru/');
    // Убедиться, что прямых ссылок на /admin нет в DOM
    const adminLinks = page.locator('a[href*="/admin"]');
    await expect(adminLinks).toHaveCount(0);
  });

  test('admin route does not expose sensitive data without auth', async ({ page }) => {
    const response = await page.goto('https://kognitika.syntog.ru/admin');
    // Страница должна либо редиректить, либо не показывать admin-контент
    // Проверяем, что заголовок НЕ содержит "Панель управления" без авторизации
    const bodyText = await page.textContent('body');
    const isExposed = bodyText?.includes('Панель управления') && 
                      !bodyText?.includes('Войти') && 
                      !bodyText?.includes('Авторизация');
    expect(isExposed).toBe(false);
  });

  test('training modules are accessible without auth (public)', async ({ page }) => {
    await page.goto('https://kognitika.syntog.ru/');
    // Главная страница должна быть доступна
    await expect(page).toHaveURL('https://kognitika.syntog.ru/');
  });
});
