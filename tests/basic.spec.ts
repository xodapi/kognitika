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

  test('does not create horizontal overflow across QA viewports', async ({ page }) => {
    const viewports = [
      { width: 320, height: 700 },
      { width: 375, height: 812 },
      { width: 430, height: 932 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await expectAppReady(page);

      const layout = await page.evaluate(() => {
        const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        const viewportWidth = window.innerWidth;
        const scroller = document.scrollingElement || document.documentElement;
        const previousScrollLeft = scroller.scrollLeft;
        scroller.scrollLeft = documentWidth;
        const horizontalScroll = scroller.scrollLeft;
        scroller.scrollLeft = previousScrollLeft;
        const footer = document.querySelector('footer[aria-label="Версия сборки"]');
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
    }
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
