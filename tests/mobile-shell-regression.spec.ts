import { expect, test, type Page } from '@playwright/test';
import { expectAppReady, installSyntheticApi } from './helpers';

const MOBILE_VIEWPORTS = [
  { name: 'compact phone', width: 320, height: 700 },
  { name: 'standard phone', width: 390, height: 844 },
  { name: 'large phone', width: 430, height: 932 },
];

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
}

async function openBriefing(page: Page, route: '/schulte' | '/schulte-90') {
  await page.goto(route, { waitUntil: 'networkidle' });
  await expectAppReady(page);
  await page.getByRole('button', { name: 'Начать тест' }).click();
  await expect(page.getByRole('button', { name: /Инициализировать тест/i })).toBeVisible();
}

for (const viewport of MOBILE_VIEWPORTS) {
  test.describe(`mobile shell regression: ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installSyntheticApi(page);
    });

    test('honors reduced motion without hiding shell content', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/schulte', { waitUntil: 'networkidle' });
      await expectAppReady(page);
      await expect(page.getByRole('button', { name: 'Открыть меню' }).first()).toBeVisible();
      await page.getByRole('button', { name: 'Открыть меню' }).first().click();
      await expect(page.getByText('Центр Управления')).toBeVisible();

      const motion = await page.evaluate(() => {
        const root = document.documentElement;
        const style = getComputedStyle(root);
        const sidebar = Array.from(document.querySelectorAll<HTMLElement>('div')).find((element) =>
          element.className.includes('fixed inset-y-0 left-0'),
        );
        const durations = Array.from(document.querySelectorAll<HTMLElement>('*'))
          .map((element) => getComputedStyle(element))
          .flatMap((computed) => [
            Number.parseFloat(computed.animationDuration),
            Number.parseFloat(computed.transitionDuration),
          ])
          .filter((duration) => Number.isFinite(duration));
        return {
          mediaMatches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          rootScrollBehavior: style.scrollBehavior,
          sidebarTransform: sidebar ? getComputedStyle(sidebar).transform : null,
          maxMotionDuration: Math.max(0, ...durations),
        };
      });

      expect(motion.mediaMatches).toBe(true);
      expect(motion.rootScrollBehavior).toBe('auto');
      expect(motion.sidebarTransform).toBe('none');
      expect(motion.maxMotionDuration).toBeLessThanOrEqual(0.01);
    });

    test('keeps the drawer and fixed navigation reachable without horizontal overflow', async ({ page }) => {
      await page.goto('/schulte', { waitUntil: 'networkidle' });
      await expectAppReady(page);
      await page.getByRole('button', { name: 'Открыть меню' }).first().click();

      await expect(page.getByText('Центр Управления')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Закрыть меню' })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const layout = await page.evaluate(() => {
        const build = document.querySelector('footer[aria-label="Версия сборки"]')?.getBoundingClientRect();
        const navigation = Array.from(document.querySelectorAll('div')).find((element) =>
          String(element.className).includes('fixed left-1/2') && String(element.className).includes('max-w-sm'),
        )?.getBoundingClientRect();
        if (!build || !navigation) return { found: false };
        const overlaps = !(build.right <= navigation.left || build.left >= navigation.right || build.bottom <= navigation.top || build.top >= navigation.bottom);
        return { found: true, overlaps };
      });
      expect(layout).toEqual({ found: true, overlaps: false });
    });

    test('keeps shell controls visibly focusable from the keyboard', async ({ page }) => {
      await page.goto('/schulte', { waitUntil: 'networkidle' });
      await expectAppReady(page);

      const controls = [
        page.getByRole('button', { name: 'Открыть меню' }).first(),
        page.getByRole('button', { name: 'Главная' }),
      ];

      for (const control of controls) {
        await page.keyboard.press('Tab');
        if (!(await control.evaluate((element) => document.activeElement === element))) {
          await control.focus();
          await page.keyboard.press('Tab');
          await page.keyboard.press('Shift+Tab');
        }
        await expect(control).toBeFocused();
        await expect(control).toHaveCSS('outline-style', 'solid');
        await expect(control).toHaveCSS('outline-width', '3px');
      }

      await controls[0].click();
      const close = page.getByRole('button', { name: 'Закрыть меню' });
      await expect(close).toBeVisible();
      await close.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(close).toBeFocused();
      await expect(close).toHaveCSS('outline-style', 'solid');
      await expect(close).toHaveCSS('outline-width', '3px');
    });

    for (const route of ['/schulte', '/schulte-90'] as const) {
      test(`${route} briefing is readable, startable, and fits the phone width`, async ({ page }) => {
        await openBriefing(page, route);
        await expectNoHorizontalOverflow(page);

        const start = page.getByRole('button', { name: /Инициализировать тест/i });
        await expect(start).toBeVisible();
        await expect(start).toHaveCSS('min-height', '48px');

        await start.click();
        await expect(page.getByRole('button', { name: 'Открыть меню' }).first()).toBeVisible();
        await expectNoHorizontalOverflow(page);
      });
    }
  });
}
