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
    await page.route(/\/(assets\/.*|src\/main\.tsx)(\?.*)?$/, async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname.endsWith('.js') || pathname.endsWith('/src/main.tsx')) {
        await route.abort('blockedbyclient');
        return;
      }

      await route.continue();
    });

    await page.goto('/');

    await expect(page.locator('#kognitika-boot-recovery')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Не удалось запустить Когнитику')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Сбросить состояние приложения' })).toBeVisible();
    await expect(page.getByText('Brain ID').first()).toBeVisible();
  });

  test('keeps waiting on a slow main bundle instead of showing fatal recovery', async ({ page }) => {
    test.setTimeout(45_000);

    let delayedMainBundle = false;
    await page.route(/\/assets\/index-.*\.js(\?.*)?$/, async (route) => {
      if (!delayedMainBundle) {
        delayedMainBundle = true;
        await new Promise((resolve) => setTimeout(resolve, 9_000));
      }

      await route.continue();
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8_000);
    await expect(page.locator('#kognitika-boot-recovery')).toHaveCount(0);

    await expectAppReady(page);
  });

  test('does not show boot recovery while a lazy route chunk is still loading', async ({ page }) => {
    test.setTimeout(45_000);

    let delayedDashboardChunk = false;
    await page.route(/\/assets\/Dashboard-.*\.js(\?.*)?$/, async (route) => {
      delayedDashboardChunk = true;
      await new Promise((resolve) => setTimeout(resolve, 9_000));
      await route.continue();
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8_000);

    expect(delayedDashboardChunk).toBe(true);
    await expect(page.locator('#kognitika-boot-recovery')).toHaveCount(0);

    await expectAppReady(page);
  });

  test('direct /admin load without admin auth mounts the app and shows access guidance', async ({ page }) => {
    const browserErrors = collectUnexpectedBrowserErrors(page);

    await page.goto('/admin');
    await expectAppReady(page);
    await expect(page.locator('#kognitika-boot-recovery')).toHaveCount(0);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: /сначала войдите через brain id/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /войти через brain id/i })).toBeVisible();

    expect(browserErrors).toEqual([]);
  });

  test('does not create horizontal overflow across QA viewports', async ({ page }) => {
    await page.addInitScript(() => {
      const user = {
        id: 'synthetic-wide-user',
        name: 'Synthetic Wide User',
        pseudonym: 'Synthetic Very Long Brain Identity',
        brainId: 'BR-SYNTHETIC-WIDE-0001',
        level: 12,
        experience: 2500,
        rating: 900,
        role: 'USER',
        streakDays: 2,
        _count: { sessions: 12 },
      };
      window.localStorage.setItem('token', 'synthetic-token');
      window.localStorage.setItem('user', JSON.stringify(user));
      window.localStorage.setItem('kognitika:auth:token', JSON.stringify('synthetic-token'));
    });

    const viewports = [
      { width: 320, height: 700 },
      { width: 375, height: 812 },
      { width: 430, height: 932 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expectAppReady(page);
      await expect(page.locator('header button[title="Synthetic Very Long Brain Identity"]')).toBeVisible();

      const layout = await page.evaluate(() => {
        const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        const viewportWidth = window.innerWidth;
        const scroller = document.scrollingElement || document.documentElement;
        const previousScrollLeft = scroller.scrollLeft;
        scroller.scrollLeft = documentWidth;
        const horizontalScroll = scroller.scrollLeft;
        scroller.scrollLeft = previousScrollLeft;
        const footer = document.querySelector('footer[aria-label="Версия сборки"]');
        const header = document.querySelector('header');
        const main = document.querySelector('main');
        const userButton = document.querySelector('header button[title="Synthetic Very Long Brain Identity"]');
        const mobileNav = Array.from(document.querySelectorAll('div')).find((el) => {
          const className = String(el.getAttribute('class') || '');
          return className.includes('fixed bottom-6') && className.includes('max-w-sm');
        });

        const rectOf = (el: Element | undefined | null) => {
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          };
        };

        const footerRect = rectOf(footer);
        const headerRect = rectOf(header);
        const mainRect = rectOf(main);
        const userButtonRect = rectOf(userButton);
        const mobileNavRect = rectOf(mobileNav);
        const overlaps = Boolean(
          footerRect &&
          mobileNavRect &&
          footerRect.width > 0 &&
          mobileNavRect.width > 0 &&
          !(footerRect.right <= mobileNavRect.left ||
            footerRect.left >= mobileNavRect.right ||
            footerRect.bottom <= mobileNavRect.top ||
            footerRect.top >= mobileNavRect.bottom),
        );

        const visibleOverflowElements = Array.from(document.querySelectorAll('body *'))
          .map((el) => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
            const hasControlSemantics = el.matches('button,a,input,select,textarea,[role]');
            const decorativeOnly =
              !hasControlSemantics &&
              !text &&
              (style.position === 'absolute' || style.position === 'fixed');

            return {
              tag: el.tagName.toLowerCase(),
              className: String(el.getAttribute('class') || ''),
              text: text.slice(0, 80),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              visible:
                rect.width > 0 &&
                rect.height > 0 &&
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                style.opacity !== '0',
              decorativeOnly,
            };
          })
          .filter(
            (item) =>
              item.visible &&
              !item.decorativeOnly &&
              (item.left < -1 || item.right > viewportWidth + 1),
          )
          .slice(0, 5);

        return {
          innerWidth: window.innerWidth,
          documentWidth,
          reportedHorizontalOverflow: documentWidth - window.innerWidth,
          horizontalScroll,
          footerText: footer?.textContent?.trim() || '',
          footerOverlapsMobileNav: overlaps,
          mainCenterOffset: mainRect ? Math.round((mainRect.left + mainRect.right) / 2 - viewportWidth / 2) : null,
          headerUserInsideViewport: Boolean(
            userButtonRect &&
            userButtonRect.left >= -1 &&
            userButtonRect.right <= viewportWidth + 1,
          ),
          headerUserInsideHeader: Boolean(
            headerRect &&
            userButtonRect &&
            userButtonRect.left >= headerRect.left - 1 &&
            userButtonRect.right <= headerRect.right + 1,
          ),
          visibleOverflowElements,
        };
      });

      expect(
        layout.horizontalScroll,
        `horizontal scroll at ${viewport.width}x${viewport.height}: ${JSON.stringify(layout)}`,
      ).toBeLessThanOrEqual(1);
      expect(
        layout.visibleOverflowElements,
        `visible element overflow at ${viewport.width}x${viewport.height}`,
      ).toEqual([]);
      expect(layout.footerText).toMatch(/^build /);
      expect(layout.footerOverlapsMobileNav, `footer overlap at ${viewport.width}x${viewport.height}`).toBe(false);
      expect(layout.headerUserInsideViewport, `header user clipping at ${viewport.width}x${viewport.height}`).toBe(true);
      expect(layout.headerUserInsideHeader, `header user outside header at ${viewport.width}x${viewport.height}`).toBe(true);
      if (viewport.width >= 1440) {
        expect(Math.abs(layout.mainCenterOffset ?? 999), `main center offset at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(12);
      }
    }
  });
});

test.describe('Kognitika route and link contract', () => {
  test.beforeEach(async ({ page }) => {
    await installSyntheticApi(page);
  });

  test('direct knowledge-base article URL loads a complete article', async ({ page }) => {
    const browserErrors = collectUnexpectedBrowserErrors(page);

    await page.goto('/wiki/stroop');
    await expectAppReady(page);

    await expect(page.getByRole('heading', { name: 'Эффект Струпа' })).toBeVisible();
    await expect(page.getByText('Что тренирует')).toBeVisible();
    await expect(page.getByText('Как проходить')).toBeVisible();
    await expect(page.getByText('Что означают метрики')).toBeVisible();

    expect(browserErrors).toEqual([]);
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
