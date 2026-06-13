import { expect, test } from '@playwright/test';
import { APP_ROUTE_PATHS } from '../src/lib/routes';
import { collectUnexpectedBrowserErrors, expectAppReady, installSyntheticApi } from './helpers';

const ROUTE_PATHS = [...APP_ROUTE_PATHS];

test.describe('Kognitika production smoke', () => {
  test.beforeEach(async ({ page }) => {
    await installSyntheticApi(page);
  });

  test('loads with a dirty legacy localStorage profile instead of white-screening', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('user', '{bad-json');
      window.localStorage.setItem('token', 'synthetic-legacy-token');
      window.localStorage.setItem('kognitika:ui:theme', '"dark"');
    });

    const browserErrors = collectUnexpectedBrowserErrors(page);

    await page.goto('/');
    await expectAppReady(page);

    await expect(page.locator('#kognitika-boot-recovery')).toHaveCount(0);
    expect(await page.evaluate(() => window.localStorage.getItem('user'))).toBeNull();
    expect(browserErrors).toEqual([]);
  });

  test('does not install or control the page with a service worker on a fresh profile', async ({ page }) => {
    await page.goto('/');
    await expectAppReady(page);

    const serviceWorkerState = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return { supported: false, controlled: false, registrations: 0 };
      }

      const registrations = await navigator.serviceWorker.getRegistrations();
      return {
        supported: true,
        controlled: Boolean(navigator.serviceWorker.controller),
        registrations: registrations.length,
      };
    });

    expect(serviceWorkerState.controlled).toBe(false);
    expect(serviceWorkerState.registrations).toBe(0);
  });

  test('shows inline recovery UI when the built application bundle is blocked', async ({ page }) => {
    await page.route(/\/assets\/.*\.js(\?.*)?$/, async (route) => {
      await route.abort('blockedbyclient');
    });

    await page.goto('/');

    await expect(page.locator('#kognitika-boot-recovery')).toBeVisible({ timeout: 9_000 });
    await expect(page.getByText('Не удалось запустить Когнитику')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Сбросить состояние приложения' })).toBeVisible();
    await expect(page.getByText('Brain ID').first()).toBeVisible();
  });
});

test.describe('Kognitika route and link contract', () => {
  test.beforeEach(async ({ page }) => {
    await installSyntheticApi(page);
  });

  for (const routePath of ROUTE_PATHS) {
    test(`renders ${routePath} without a blank page`, async ({ page }) => {
      const browserErrors = collectUnexpectedBrowserErrors(page);

      await page.goto(routePath);
      await expectAppReady(page);

      expect(browserErrors).toEqual([]);
    });
  }

  test('all internal anchor links found on public routes resolve to a non-blank page', async ({ page }, testInfo) => {
    test.setTimeout(120_000);

    const internalPaths = new Set<string>();

    for (const routePath of ROUTE_PATHS) {
      await page.goto(routePath);
      await expectAppReady(page);

      const hrefs = await page.locator('a[href]').evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).href),
      );
      const currentOrigin = new URL(page.url()).origin;

      for (const href of hrefs) {
        const url = new URL(href);
        if (url.origin !== currentOrigin) continue;
        internalPaths.add(url.pathname);
      }
    }

    await testInfo.attach('internal-links.json', {
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify([...internalPaths].sort(), null, 2)),
    });

    for (const path of internalPaths) {
      const browserErrors = collectUnexpectedBrowserErrors(page);

      await page.goto(path);
      await expectAppReady(page);

      expect(browserErrors).toEqual([]);
    }
  });
});
