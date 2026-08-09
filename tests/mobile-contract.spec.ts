import { expect, test } from '@playwright/test';
import { expectAppReady, installSyntheticApi } from './helpers';
import {
  PHONE_VIEWPORTS,
  SUBPIXEL_TOLERANCE_PX,
  TOUCH_FLOOR_PX,
  UNMEASURABLE_PREFIX,
  beginSession,
  expectNoDocumentOverflow,
  expectRenderedGrid,
  measureBelowFoldCharts,
  measureInnerOverflow,
  measureReachability,
  measureSingleGlance,
  measureTouchTargets,
  openTrainer,
  preflight,
  requireMeasurement,
  setSchulteSize,
  settleLayout,
  startSession,
  type TrainerContract,
} from './mobile-contract';

/**
 * Executable form of docs/mobile-first-trainer-design.md.
 *
 * Failures here come in two classes and the messages keep them apart:
 * a plain assertion failure is a contract violation in the product, while a
 * message prefixed with UNMEASURABLE_PREFIX means the harness or the served
 * bundle is at fault and the product has not been assessed at all.
 */

const TRAINERS: TrainerContract[] = [
  {
    name: 'Schulte',
    route: '/schulte',
    playfield: '[data-testid="grid-container"]',
    touchTargets: '[data-testid="grid-container"] button',
    targetIndicator: '[data-testid="target-indicator"]',
    abortControl: '[data-testid="stop-button"]',
    chartSurfaces: 'svg.recharts-surface, [data-testid="responsive-container"] svg',
    expectedCellCount: (size) => size * size,
    allowsInnerHorizontalScroll: false,
  },
];

/** Largest size the Schulte size control offers, and the binding case for the
 *  touch floor: if 7x7 clears 44px then every smaller grid does too. */
const MAX_SCHULTE_SIZE = 7;

for (const trainer of TRAINERS) {
  for (const viewport of PHONE_VIEWPORTS) {
    test.describe(`mobile contract: ${trainer.name} on ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test.beforeEach(async ({ page }) => {
        await installSyntheticApi(page);
      });

      /**
       * Runs first in each file order so that a stale bundle is reported once,
       * as a harness limitation, instead of once per contract clause as a
       * product defect.
       */
      test('preflight: every contract selector resolves during play', async ({ page }) => {
        await startSession(page, trainer);
        const probe = await preflight(page, trainer, [
          'playfield',
          'touchTargets',
          'targetIndicator',
          'abortControl',
        ]);
        const { checked } = requireMeasurement(probe, `${trainer.name} contract selectors`);
        expect(checked.length).toBe(4);
      });

      /** Contract §4.2, touch floor. */
      test('playfield touch targets meet the 44px floor at maximum grid size', async ({ page }) => {
        await openTrainer(page, trainer.route);
        await expectAppReady(page);

        const applied = await setSchulteSize(page, MAX_SCHULTE_SIZE);
        expect(applied).toBe(MAX_SCHULTE_SIZE);

        await beginSession(page, trainer.playfield);

        // The rendered cell count is the real evidence that the grid resized.
        // Reading the slider back only proves the DOM changed, which a React
        // controlled input can report while still rendering the previous size.
        const expectedCells = await expectRenderedGrid(page, trainer, MAX_SCHULTE_SIZE);

        const report = requireMeasurement(
          await measureTouchTargets(page, trainer.touchTargets),
          `${trainer.name} touch targets`,
        );

        expect(report.measured).toBe(expectedCells);
        expect(report.skipped, 'every playfield cell must be rendered').toBe(0);
        expect(
          report.violations,
          `smallest edge was ${report.minEdge}px, floor is ${TOUCH_FLOOR_PX}px`,
        ).toEqual([]);
      });

      /**
       * Contract §4.1, single-glance rule. The user must not have to scroll
       * between the target and the playfield.
       */
      test('target indicator and playfield share one viewport during play', async ({ page }) => {
        await startSession(page, trainer);

        const report = requireMeasurement(
          await measureSingleGlance(page, trainer.targetIndicator, trainer.playfield),
          `${trainer.name} single-glance geometry`,
        );

        expect(
          report.bothVisible,
          `indicator bottom ${report.indicator.bottom}px, playfield top ${report.playfieldTop}px, viewport ${report.viewportHeight}px`,
        ).toBe(true);
      });

      /** Contract §4.4, the abort control must be reachable and tappable. */
      test('abort control is reachable without scrolling during play', async ({ page }) => {
        await startSession(page, trainer);

        const report = requireMeasurement(
          await measureReachability(page, trainer.abortControl),
          `${trainer.name} abort control`,
        );

        expect(
          report.inViewport,
          `abort control spans ${report.box.top}..${report.box.bottom}px in a ${report.viewportHeight}px viewport`,
        ).toBe(true);
        expect(
          report.hitTestable,
          `a tap at the control centre lands on ${report.topmostAtCentre}`,
        ).toBe(true);
      });

      /** Contract §4.5, no analytics surface may animate below the fold in play. */
      test('no chart is mounted below the fold during play', async ({ page }) => {
        await startSession(page, trainer);

        const report = requireMeasurement(
          await measureBelowFoldCharts(page, trainer.chartSurfaces),
          `${trainer.name} chart surfaces`,
        );

        expect(report.belowFold, report.details.join('; ')).toBe(0);
      });

      /** Contract §4.3, inner overflow. */
      test('playfield does not scroll horizontally inside its container', async ({ page }) => {
        await openTrainer(page, trainer.route);
        await setSchulteSize(page, MAX_SCHULTE_SIZE);
        await beginSession(page, trainer.playfield);
        await expectRenderedGrid(page, trainer, MAX_SCHULTE_SIZE);

        const report = requireMeasurement(
          await measureInnerOverflow(page, trainer.playfield),
          `${trainer.name} playfield overflow`,
        );

        if (trainer.allowsInnerHorizontalScroll) {
          expect(report.scrollable, 'declared inner scroll must remain user-scrollable').toBe(true);
        } else {
          expect(
            report.horizontal,
            `inner horizontal overflow of ${report.horizontal}px`,
          ).toBeLessThanOrEqual(1);
        }
      });

      /** Contract §4.7, existing guarantees must not regress. */
      test('document-level horizontal overflow stays clean during play', async ({ page }) => {
        await startSession(page, trainer);
        await expectNoDocumentOverflow(page);
      });
    });
  }
}

/**
 * Guards the harness itself.
 *
 * These tests do not touch the product. They build DOM fixtures with known
 * geometry and assert each probe reaches the known answer, in both directions:
 * a probe that only ever reports "no violations" passes a one-sided test and
 * fails here. Asserting a constant against its own literal, which an earlier
 * revision did, proves nothing at all.
 */
test.describe('mobile contract harness self-check', () => {
  const viewport = PHONE_VIEWPORTS[0];
  test.use({ viewport: { width: viewport.width, height: viewport.height } });

  test.beforeEach(async ({ page }) => {
    await installSyntheticApi(page);
    await page.goto('/schulte', { waitUntil: 'networkidle' });
    await expectAppReady(page);
  });

  /** Replaces the page body with a controlled fixture. */
  async function mountFixture(page: import('@playwright/test').Page, html: string): Promise<void> {
    await page.evaluate((markup) => {
      document.body.innerHTML = markup;
    }, html);
    await settleLayout(page);
  }

  test('touch probe reports a violation for a known-undersized target', async ({ page }) => {
    await mountFixture(
      page,
      `<div id="pf"><button style="width:20px;height:20px">1</button>
                    <button style="width:60px;height:60px">2</button></div>`,
    );

    const report = requireMeasurement(
      await measureTouchTargets(page, '#pf button'),
      'fixture touch targets',
    );

    expect(report.measured).toBe(2);
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0].width).toBe(20);
    expect(report.minEdge).toBe(20);
  });

  test('touch probe accepts a target exactly at the floor', async ({ page }) => {
    await mountFixture(
      page,
      `<div id="pf"><button style="width:${TOUCH_FLOOR_PX}px;height:${TOUCH_FLOOR_PX}px">1</button></div>`,
    );

    const report = requireMeasurement(
      await measureTouchTargets(page, '#pf button'),
      'fixture touch targets',
    );

    expect(report.violations).toEqual([]);
    expect(report.minEdge).toBe(TOUCH_FLOOR_PX);
  });

  test('touch probe tolerates sub-pixel rounding but not a real shortfall', async ({ page }) => {
    const withinTolerance = TOUCH_FLOOR_PX - SUBPIXEL_TOLERANCE_PX / 2;
    const beyondTolerance = TOUCH_FLOOR_PX - SUBPIXEL_TOLERANCE_PX * 4;
    await mountFixture(
      page,
      `<div id="a"><button style="width:${withinTolerance}px;height:${TOUCH_FLOOR_PX}px">a</button></div>
       <div id="b"><button style="width:${beyondTolerance}px;height:${TOUCH_FLOOR_PX}px">b</button></div>`,
    );

    const tolerated = requireMeasurement(await measureTouchTargets(page, '#a button'), 'fixture a');
    const flagged = requireMeasurement(await measureTouchTargets(page, '#b button'), 'fixture b');

    expect(tolerated.violations).toEqual([]);
    expect(flagged.violations).toHaveLength(1);
  });

  test('touch probe treats a hidden-only match as unmeasurable, not as a pass', async ({ page }) => {
    await mountFixture(
      page,
      `<div id="pf"><button style="display:none">1</button></div>`,
    );

    const probe = await measureTouchTargets(page, '#pf button');
    expect(probe.status).toBe('unmeasurable');
    expect(() => requireMeasurement(probe, 'hidden fixture')).toThrow(UNMEASURABLE_PREFIX);
  });

  /**
   * The case the document-level check in mobile-shell-regression.spec.ts cannot
   * see. If this ever passes with horizontal === 0, the inner-overflow clause
   * of the contract is not being enforced at all.
   */
  test('inner-overflow probe sees overflow that the document-level check misses', async ({ page }) => {
    await mountFixture(
      page,
      `<div id="scroller" style="width:200px;overflow-x:auto">
         <div style="width:600px;height:20px"></div>
       </div>`,
    );

    const inner = requireMeasurement(
      await measureInnerOverflow(page, '#scroller'),
      'fixture inner overflow',
    );
    const documentOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );

    expect(inner.horizontal).toBeGreaterThan(300);
    expect(inner.scrollable).toBe(true);
    expect(documentOverflow, 'document level must stay clean, which is the blind spot').toBeLessThanOrEqual(1);
  });

  test('reachability probe reports an occluded control as not hit-testable', async ({ page }) => {
    await mountFixture(
      page,
      `<button data-testid="target" style="position:fixed;top:100px;left:10px;width:80px;height:44px">stop</button>
       <div data-testid="overlay" style="position:fixed;top:0;left:0;right:0;bottom:0"></div>`,
    );

    const report = requireMeasurement(
      await measureReachability(page, '[data-testid="target"]'),
      'fixture reachability',
    );

    expect(report.inViewport, 'the control is on screen').toBe(true);
    expect(report.hitTestable, 'but a tap cannot reach it').toBe(false);
    expect(report.topmostAtCentre).toContain('overlay');
  });

  test('reachability probe accepts an unobstructed control', async ({ page }) => {
    await mountFixture(
      page,
      `<button data-testid="target" style="position:fixed;top:100px;left:10px;width:80px;height:44px">stop</button>`,
    );

    const report = requireMeasurement(
      await measureReachability(page, '[data-testid="target"]'),
      'fixture reachability',
    );

    expect(report.inViewport).toBe(true);
    expect(report.hitTestable).toBe(true);
  });

  test('reachability probe reports an off-screen control as in-DOM but out of viewport', async ({ page }) => {
    await mountFixture(
      page,
      `<button data-testid="target" style="position:absolute;top:5000px;left:10px;width:80px;height:44px">stop</button>`,
    );

    const report = requireMeasurement(
      await measureReachability(page, '[data-testid="target"]'),
      'fixture reachability',
    );

    expect(report.inViewport).toBe(false);
  });

  test('below-fold chart probe distinguishes a visible chart from one past the fold', async ({ page }) => {
    await mountFixture(
      page,
      `<svg class="recharts-surface" style="position:absolute;top:10px;width:100px;height:50px"></svg>
       <svg class="recharts-surface" style="position:absolute;top:5000px;width:100px;height:50px"></svg>`,
    );

    const report = requireMeasurement(
      await measureBelowFoldCharts(page, 'svg.recharts-surface'),
      'fixture charts',
    );

    expect(report.total).toBe(2);
    expect(report.belowFold).toBe(1);
  });

  test('single-glance probe reports an indicator scrolled off the top', async ({ page }) => {
    await mountFixture(
      page,
      `<div data-testid="ind" style="position:absolute;top:-200px;width:100px;height:40px">7</div>
       <div data-testid="pf" style="position:absolute;top:100px;width:100px;height:200px"></div>`,
    );

    const report = requireMeasurement(
      await measureSingleGlance(page, '[data-testid="ind"]', '[data-testid="pf"]'),
      'fixture single glance',
    );

    expect(report.bothVisible).toBe(false);
    expect(report.indicator.top).toBeLessThan(0);
  });

  test('probes report absence rather than passing vacuously', async ({ page }) => {
    const absent = '[data-testid="selector-that-cannot-exist"]';

    expect((await measureTouchTargets(page, absent)).status).toBe('unmeasurable');
    expect((await measureInnerOverflow(page, absent)).status).toBe('unmeasurable');
    expect((await measureSingleGlance(page, absent, absent)).status).toBe('unmeasurable');
    expect((await measureReachability(page, absent)).status).toBe('unmeasurable');
  });

  test('preflight names the exact selector that is missing', async ({ page }) => {
    const probe = await preflight(
      page,
      { ...TRAINERS[0], targetIndicator: '[data-testid="definitely-absent"]' },
      ['targetIndicator'],
    );

    expect(probe.status).toBe('unmeasurable');
    if (probe.status === 'unmeasurable') {
      expect(probe.reason).toContain('definitely-absent');
      expect(probe.reason).toContain('rebuild');
    }
  });
});
