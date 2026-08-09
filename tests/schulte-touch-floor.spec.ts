import { expect, test } from '@playwright/test';
import { installSyntheticApi } from './helpers';
import {
  SUBPIXEL_TOLERANCE_PX,
  TOUCH_FLOOR_PX,
  beginSession,
  expectNoDocumentOverflow,
  expectRenderedGrid,
  innerScrollPermitted,
  measureInnerOverflow,
  measureSquareness,
  measureTouchTargets,
  openTrainer,
  requireMeasurement,
  scrollOwner,
  setSchulteMode,
  setSchulteSize,
  type TrainerContract,
} from './mobile-contract';

/**
 * Contract for issue #243: every Schulte cell must meet the repository's own
 * 44x44 CSS px touch floor on phone viewports.
 *
 * Why this matters beyond comfort: `state.errors` feeds scoring and adaptive
 * difficulty. A sub-44px cell converts a share of those errors from attention
 * lapse into finger-miss, so the instrument measures the wrong thing. The
 * hardest mode is the worst affected, because Gorbov-Schulte forces 7x7.
 *
 * Design brief: docs/mobile-first-trainer-design.md
 */

const SCHULTE: TrainerContract = {
  name: 'Schulte',
  route: '/schulte',
  playfield: '[data-testid="grid-container"]',
  // The card clips with `overflow-hidden` so nothing reaches the document; the
  // nested wrapper is what actually scrolls when the 44px floor forces the grid
  // wider than the viewport.
  scrollContainer: '[data-testid="grid-scroll"]',
  touchTargets: '[data-testid="grid-container"] button',
  targetIndicator: '[data-testid="target-indicator"]',
  abortControl: '[data-testid="stop-button"]',
  chartSurfaces: 'svg.recharts-surface, [data-testid="responsive-container"] svg',
  expectedCellCount: (size) => size * size,
  allowsInnerHorizontalScroll: false,
  // Below this width a 7-column grid cannot reach the floor at all; see
  // fitsWithoutScroll for the arithmetic, and the consistency test below for
  // the check that keeps this number and that arithmetic from drifting apart.
  innerScrollAllowedBelowPx: 340,
};

/**
 * Viewports from the issue's measurement table. 320 is the binding case and the
 * only one where the arithmetic cannot be satisfied for every size.
 */
const VIEWPORTS = [
  { name: 'compact phone', width: 320, height: 700 },
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'standard phone', width: 390, height: 844 },
] as const;

/**
 * Gap between cells that the fix is allowed to assume, in CSS px. Used only to
 * express the width budget below; the tests measure real geometry.
 */
const ASSUMED_GAP_PX = 4;

/**
 * Whether a grid of `size` columns can reach the touch floor inside `width`
 * without scrolling, given a full-bleed playfield.
 *
 * At 320px a 7-column grid needs 7*44 + 6*4 = 332px of content box, which
 * exceeds the 320px viewport no matter how the padding is redistributed. That
 * is arithmetic, not a layout preference, so the contract permits inner
 * horizontal scroll in exactly that case and forbids it everywhere else.
 * Threshold: 332px of grid plus 8px of minimal shell padding = 340px.
 */
function fitsWithoutScroll(size: number, width: number): boolean {
  const required = size * TOUCH_FLOOR_PX + (size - 1) * ASSUMED_GAP_PX;
  return required + 8 <= width;
}

/**
 * Keeps the declared exception and the arithmetic that justifies it in step.
 *
 * The threshold lives on the contract so the harness can answer "is scroll
 * permitted here" for any spec, while the arithmetic lives in this file because
 * it is specific to a square grid at a fixed gap. Two expressions of one number
 * drift, so this asserts they agree at the boundary rather than trusting that
 * whoever edits one will remember the other. Both must say: 7x7 does not fit at
 * 339px and does fit at 340px.
 */
test('the declared inner-scroll exception matches the width arithmetic', () => {
  const threshold = SCHULTE.innerScrollAllowedBelowPx;
  expect(threshold, 'the exception must be declared on the contract').toBeDefined();

  expect(fitsWithoutScroll(7, threshold! - 1)).toBe(false);
  expect(fitsWithoutScroll(7, threshold!)).toBe(true);

  expect(innerScrollPermitted(SCHULTE, threshold! - 1)).toBe(true);
  expect(innerScrollPermitted(SCHULTE, threshold!)).toBe(false);

  // 6x6 must never need the exception: it is the largest grid that fits at the
  // narrowest supported viewport, which is why the fix is not simply "scroll".
  expect(fitsWithoutScroll(6, 320)).toBe(true);
});

for (const viewport of VIEWPORTS) {
  test.describe(`Schulte touch floor on ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test.beforeEach(async ({ page }) => {
      await installSyntheticApi(page);
    });

    // 7x7 is the binding size; 6x6 is the largest that must fit at 320px
    // without an exception, so both are asserted at every viewport.
    for (const size of [6, 7]) {
      test(`${size}x${size} cells meet the ${TOUCH_FLOOR_PX}px floor and stay square`, async ({ page }) => {
        await openTrainer(page, SCHULTE.route);

        const applied = await setSchulteSize(page, size);
        expect(applied).toBe(size);

        await beginSession(page, SCHULTE.playfield);
        const expectedCells = await expectRenderedGrid(page, SCHULTE, size);

        const touch = requireMeasurement(
          await measureTouchTargets(page, SCHULTE.touchTargets),
          `${size}x${size} cells at ${viewport.width}px`,
        );
        expect(touch.measured).toBe(expectedCells);
        expect(
          touch.violations,
          `smallest edge was ${touch.minEdge}px against a ${TOUCH_FLOOR_PX}px floor`,
        ).toEqual([]);

        // A fix that meets the floor by stretching one axis would break the
        // spatial-search nature of the task, so squareness is asserted too.
        const square = requireMeasurement(
          await measureSquareness(page, SCHULTE.touchTargets),
          `${size}x${size} cell squareness at ${viewport.width}px`,
        );
        expect(
          square.maxDelta,
          `worst cell was ${JSON.stringify(square.worst)}`,
        ).toBeLessThanOrEqual(SUBPIXEL_TOLERANCE_PX * 2);

        // The document must never scroll sideways, whatever happens inside the
        // playfield container.
        await expectNoDocumentOverflow(page);

        const inner = requireMeasurement(
          await measureInnerOverflow(page, scrollOwner(SCHULTE)),
          `${size}x${size} inner overflow at ${viewport.width}px`,
        );

        if (fitsWithoutScroll(size, viewport.width)) {
          expect(
            inner.horizontal,
            `${size}x${size} fits in ${viewport.width}px by arithmetic, so the playfield must not scroll`,
          ).toBeLessThanOrEqual(1);
        } else {
          // Declared exception. Scrolling is tolerated only because the floor
          // cannot otherwise be met, and only when it is genuinely usable.
          expect(
            inner.scrollable,
            `${size}x${size} cannot meet the floor within ${viewport.width}px, so the playfield must be scrollable rather than shrink its cells`,
          ).toBe(true);
        }
      });
    }

    test(`Gorbov mode forces 7x7 and still meets the ${TOUCH_FLOOR_PX}px floor`, async ({ page }) => {
      await openTrainer(page, SCHULTE.route);

      // Gorbov is reached through the algorithm select, not the slider: the
      // slider is disabled in this mode, so the slider path cannot cover it.
      const forced = await setSchulteMode(page, 'gorbov');
      expect(forced).toBe(7);

      await beginSession(page, SCHULTE.playfield);
      const expectedCells = await expectRenderedGrid(page, SCHULTE, 7);

      const touch = requireMeasurement(
        await measureTouchTargets(page, SCHULTE.touchTargets),
        `Gorbov 7x7 cells at ${viewport.width}px`,
      );
      expect(touch.measured).toBe(expectedCells);
      expect(
        touch.violations,
        `smallest edge was ${touch.minEdge}px against a ${TOUCH_FLOOR_PX}px floor`,
      ).toEqual([]);

      await expectNoDocumentOverflow(page);
    });
  });
}
