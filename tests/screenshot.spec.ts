import { test, expect } from '@playwright/test';
import { devices } from 'playwright';

test.use({
  ...devices['iPhone 12'],
});

test('capture mobile scanner overlay', async ({ page }) => {
  // Переходим на страницу сканера
  await page.goto('https://kognitika.syntog.ru/scanner');
  
  // Ждем появления кнопки "ВСЁ ПОНЯТНО, В БОЙ" и кликаем
  const startBtn = page.locator('button:has-text("ВСЁ ПОНЯТНО, В БОЙ")');
  await startBtn.waitFor({ timeout: 5000 });
  await startBtn.click();
  
  // Ждем появления карточки с цитатой
  await page.waitForTimeout(1000);
  
  // Кликаем по первой кнопке манипуляции в футере, чтобы вызвать ошибку (или правильный ответ)
  // Кнопки имеют текст правил, например "Газлайтинг"
  const firstRuleBtn = page.locator('button').filter({ hasText: /Газлайтинг|Чучело|Ad Hominem|Дилемма|Ложная дилемма/i }).first();
  await firstRuleBtn.waitFor({ timeout: 5000 });
  await firstRuleBtn.click();
  
  // Ждем отображения оверлея с результатом
  await page.waitForTimeout(1000);
  
  // Делаем скриншот всего экрана и сохраняем его в artifacts
  await page.screenshot({ path: 'C:/Users/d88u5/.gemini/antigravity/brain/3ef02b24-7196-4658-84c3-95b44d8e25c2/mobile_scanner_overlay_before.png' });
  console.log('Screenshot captured successfully.');
});
