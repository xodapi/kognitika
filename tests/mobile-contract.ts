import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Shared measurement harness for the mobile-first trainer contract.
 * Contract and rationale: docs/mobile-first-trainer-design.md
 *
 * Two rules shape this module.
 *
 * 1. It measures; it does not judge. No trainer-specific expectation lives
 *    here, so every trainer is held to the same numbers and adding a trainer
 *    is a data change (one TrainerContract entry) rather than new probe code.
 *
 * 2. "I could not measure" is never reported as "the contract is violated".
 *    Every probe returns a discriminated result, and an unmeasurable outcome
 *    fails with a distinct message class. This distinction is not theoretical:
 *    an earlier revision reported three contract failures that were really a
 *    stale bundle missing a selector, which accused the product of a defect it
 *    did not have.
 */

/** Minimum touch target. WCAG 2.2 SC 2.5.8 (Target Size, Minimum) is 24px;
 *  this repository already uses the stricter 44px of WCAG 2.1 SC 2.5.5
 *  (Target Size, Enhanced) via `min-h-11` in 39 places, so 44 is the floor. */
export const TOUCH_FLOOR_PX = 44;

/** Minimum computed font size already enforced by tests/schulte-mobile.spec.ts. */
export const FONT_FLOOR_PX = 14;

/** Sub-pixel tolerance. Layout engines round fractionally and a 43.6px cell
 *  rendered from a 44px rule is not a defect. */
export const SUBPIXEL_TOLERANCE_PX = 0.5;

/** Prefix that marks a harness limitation rather than a product defect.
 *  Grep for it in CI output to separate the two failure classes. */
export const UNMEASURABLE_PREFIX = 'HARNESS CANNOT MEASURE';

/**
 * Phone viewport matrix. 320x700 is the binding case: it is the narrowest
 * viewport already exercised by tests/mobile-shell-regression.spec.ts, so a
 * contract that passes at 390 but fails at 320 is not passing.
 */
export const PHONE_VIEWPORTS = [
  { name: 'compact phone', width: 320, height: 700 },
  { name: 'standard phone', width: 390, height: 844 },
  { name: 'large phone', width: 430, height: 932 },
] as const;

export type PhoneViewport = (typeof PHONE_VIEWPORTS)[number];

/**
 * A probe outcome.
 *
 * `unmeasurable` means the harness never obtained a number: the selector
 * matched nothing, the element had no box, the page was not in the expected
 * state. It is a defect in the harness, the fixture, or the served bundle, and
 * it must never be silently equivalent to "no violations found".
 */
export type Probe<T> =
  | { status: 'measured'; value: T }
  | { status: 'unmeasurable'; reason: string };

/**
 * Per-trainer contract configuration.
 *
 * Every selector the harness will ever query lives here, including chart
 * surfaces. Nothing is hardcoded inside a probe, because a selector buried in
 * a probe silently measures zero elements on a trainer that renders its charts
 * with a different library, and zero elements passes every threshold.
 */
export interface TrainerContract {
  /** Human-readable name used in test titles. */
  name: string;
  /** Route the trainer is mounted at. */
  route: string;
  /** Container that holds the interactive playfield. */
  playfield: string;
  /**
   * Element that owns horizontal overflow for the playfield, when the trainer
   * separates the two. The outer playfield card usually clips with
   * `overflow-hidden` so nothing reaches the document, which means measuring
   * inner overflow on the card reports zero even while a nested wrapper
   * scrolls. Defaults to `playfield` when omitted.
   */
  scrollContainer?: string;
  /** Interactive elements inside the playfield the user taps during play. */
  touchTargets: string;
  /** Element showing what the user must currently find or answer. */
  targetIndicator: string;
  /** Control that aborts an in-progress session. */
  abortControl: string;
  /** Chart surfaces that must not mount below the fold during play. */
  chartSurfaces: string;
  /**
   * Playfield cells expected for a given requested size, when the trainer
   * exposes a size control. `null` for trainers with a fixed playfield.
   */
  expectedCellCount: ((size: number) => number) | null;
  /**
   * Whether this trainer is permitted horizontal scroll inside its own
   * playfield container at every viewport. Declared per trainer in the design
   * contract; any trainer not listed there must be false.
   */
  allowsInnerHorizontalScroll: boolean;
  /**
   * Viewport width, in CSS px, below which inner horizontal scroll is tolerated
   * even though `allowsInnerHorizontalScroll` is false.
   *
   * This exists because the touch floor and the viewport can be arithmetically
   * irreconcilable. A 7-column grid at the 44px floor needs 7*44 + 6*4 = 332px
   * of content box, which no redistribution of padding fits into a 320px
   * viewport. Scrolling is then the lesser defect: shrinking the cells instead
   * would convert attention errors into finger-miss and corrupt the score the
   * trainer exists to produce. Omit the field when no such width exists.
   */
  innerScrollAllowedBelowPx?: number;
}

export interface BoxMeasurement {
  width: number;
  height: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TouchTargetReport {
  /** Elements that carry a real layout box and were measured. */
  measured: number;
  /** Elements matched but skipped because they are not rendered (display:none,
   *  visibility:hidden, or a zero box). Reported so a playfield that matched
   *  only invisible nodes cannot look like a clean pass. */
  skipped: number;
  minEdge: number;
  violations: Array<{ index: number; width: number; height: number; text: string }>;
}

export interface InnerOverflowReport {
  horizontal: number;
  vertical: number;
  /** True when the container can actually be scrolled by the user. */
  scrollable: boolean;
}

export interface SingleGlanceReport {
  /** True when the indicator and the top edge of the playfield share a viewport. */
  bothVisible: boolean;
  indicator: BoxMeasurement;
  playfieldTop: number;
  viewportHeight: number;
}

export interface ReachabilityReport {
  /** Inside the viewport without scrolling. */
  inViewport: boolean;
  /** Not covered at its own centre point by another element. */
  hitTestable: boolean;
  box: BoxMeasurement;
  viewportHeight: number;
  /** Tag/testid of whatever actually receives a tap at the centre point. */
  topmostAtCentre: string;
}

export interface BelowFoldChartReport {
  total: number;
  belowFold: number;
  details: string[];
}

/**
 * Unwraps a probe, converting an unmeasurable outcome into a failure that is
 * clearly labelled as a harness limitation.
 */
export function requireMeasurement<T>(probe: Probe<T>, what: string): T {
  if (probe.status === 'unmeasurable') {
    throw new Error(`${UNMEASURABLE_PREFIX}: ${what} - ${probe.reason}`);
  }
  return probe.value;
}

/**
 * Waits until layout has stopped moving.
 *
 * The app animates entry with `motion/react`. A single getBoundingClientRect
 * taken mid-animation records a transient offset, so a probe can report a
 * position the user never sees, in either direction. Waiting on running
 * animations and then two frames makes the reading reproducible.
 *
 * Two waits are deliberately bounded. An animation with an infinite iteration
 * count (a pulsing hint, a spinner) never resolves `finished`, so awaiting it
 * hangs until the test times out; those are excluded. The remainder is capped,
 * because an unbounded wait converts a slow animation into a timeout whose
 * message says nothing about layout.
 */
export async function settleLayout(page: Page, budgetMs = 1_000): Promise<void> {
  await page.evaluate(async (budget) => {
    const finite = document.getAnimations().filter((animation) => {
      if (animation.playState !== 'running') return false;
      const iterations = animation.effect?.getComputedTiming().iterations ?? 1;
      return Number.isFinite(iterations);
    });

    const settled = Promise.all(finite.map((animation) => animation.finished.catch(() => undefined)));
    const budgetExpired = new Promise((resolve) => setTimeout(resolve, budget));
    await Promise.race([settled, budgetExpired]);

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, budgetMs);
}

/**
 * Verifies every selector in a contract resolves before any measurement runs.
 *
 * Without this, a missing selector is discovered separately by each probe and
 * surfaces as several apparent contract violations. Here it surfaces once, as
 * one unmeasurable outcome naming the exact selectors, which is what tells the
 * operator to rebuild the bundle instead of opening a product bug.
 */
export async function preflight(
  page: Page,
  contract: TrainerContract,
  selectorKeys: Array<keyof TrainerContract>,
): Promise<Probe<{ checked: string[] }>> {
  const selectors = selectorKeys.map((key) => ({ key: String(key), selector: String(contract[key]) }));
  const missing = await page.evaluate(
    (entries) => entries.filter(({ selector }) => document.querySelector(selector) === null),
    selectors,
  );

  if (missing.length > 0) {
    const described = missing.map(({ key, selector }) => `${key}=${selector}`).join(', ');
    return {
      status: 'unmeasurable',
      reason:
        `contract selectors absent from the served page: ${described}. ` +
        'Most often the served bundle predates the selector; rebuild before treating this as a product defect.',
    };
  }

  return { status: 'measured', value: { checked: selectors.map(({ selector }) => selector) } };
}

/**
 * Measures elements matching `selector` and reports those below the floor.
 *
 * Elements without a layout box are skipped rather than counted as zero-sized
 * violations, and the skipped count is returned so that a selector matching
 * only hidden nodes cannot masquerade as a clean pass.
 */
export async function measureTouchTargets(
  page: Page,
  selector: string,
  floor: number = TOUCH_FLOOR_PX,
): Promise<Probe<TouchTargetReport>> {
  const result = await page.evaluate(
    ({ selector: sel, floor: minEdge, tolerance }) => {
      const elements = Array.from(document.querySelectorAll(sel));
      if (elements.length === 0) return null;

      const violations: Array<{ index: number; width: number; height: number; text: string }> = [];
      let smallest = Number.POSITIVE_INFINITY;
      let measured = 0;
      let skipped = 0;

      elements.forEach((element, index) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const rendered =
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          rect.width > 0 &&
          rect.height > 0;

        if (!rendered) {
          skipped += 1;
          return;
        }

        measured += 1;
        smallest = Math.min(smallest, rect.width, rect.height);
        if (rect.width < minEdge - tolerance || rect.height < minEdge - tolerance) {
          violations.push({
            index,
            width: Math.round(rect.width * 10) / 10,
            height: Math.round(rect.height * 10) / 10,
            text: (element.textContent || '').trim().slice(0, 20),
          });
        }
      });

      return {
        measured,
        skipped,
        minEdge: Number.isFinite(smallest) ? Math.round(smallest * 10) / 10 : 0,
        violations,
      };
    },
    { selector, floor, tolerance: SUBPIXEL_TOLERANCE_PX },
  );

  if (result === null) {
    return { status: 'unmeasurable', reason: `no element matched ${selector}` };
  }
  if (result.measured === 0) {
    return {
      status: 'unmeasurable',
      reason: `${selector} matched ${result.skipped} element(s), none of which had a layout box`,
    };
  }
  return { status: 'measured', value: result };
}

/**
 * Measures scroll overflow *inside* a container.
 *
 * The document-level check in mobile-shell-regression.spec.ts cannot see this:
 * a container with `overflow-x-auto` absorbs its child's overflow and leaves
 * `documentElement.scrollWidth` clean.
 */
export async function measureInnerOverflow(
  page: Page,
  selector: string,
): Promise<Probe<InnerOverflowReport>> {
  const result = await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return null;
    const style = getComputedStyle(element);
    const horizontal = element.scrollWidth - element.clientWidth;
    return {
      horizontal,
      vertical: element.scrollHeight - element.clientHeight,
      scrollable: horizontal > 1 && /(auto|scroll)/.test(style.overflowX),
    };
  }, selector);

  if (result === null) {
    return { status: 'unmeasurable', reason: `no element matched ${selector}` };
  }
  return { status: 'measured', value: result };
}

/**
 * Measures whether the target indicator and the top of the playfield occupy
 * the same viewport, which is what lets a user play without scrolling between
 * "what am I looking for" and "where do I tap".
 */
export async function measureSingleGlance(
  page: Page,
  indicatorSelector: string,
  playfieldSelector: string,
): Promise<Probe<SingleGlanceReport>> {
  const result = await page.evaluate(
    ({ indicatorSelector: indicatorSel, playfieldSelector: playfieldSel }) => {
      const indicator = document.querySelector(indicatorSel);
      const playfield = document.querySelector(playfieldSel);
      const viewportHeight = window.innerHeight;

      if (!indicator) return { missing: indicatorSel };
      if (!playfield) return { missing: playfieldSel };

      const toBox = (rect: DOMRect) => ({
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
        top: Math.round(rect.top * 10) / 10,
        bottom: Math.round(rect.bottom * 10) / 10,
        left: Math.round(rect.left * 10) / 10,
        right: Math.round(rect.right * 10) / 10,
      });

      const indicatorRect = indicator.getBoundingClientRect();
      const playfieldRect = playfield.getBoundingClientRect();

      if (indicatorRect.width === 0 && indicatorRect.height === 0) {
        return { missing: `${indicatorSel} (zero box)` };
      }

      const indicatorVisible = indicatorRect.top >= 0 && indicatorRect.bottom <= viewportHeight;
      const playfieldTopVisible = playfieldRect.top >= 0 && playfieldRect.top < viewportHeight;

      return {
        report: {
          bothVisible: indicatorVisible && playfieldTopVisible,
          indicator: toBox(indicatorRect),
          playfieldTop: Math.round(playfieldRect.top * 10) / 10,
          viewportHeight,
        },
      };
    },
    { indicatorSelector, playfieldSelector },
  );

  if ('missing' in result && result.missing) {
    return { status: 'unmeasurable', reason: `no measurable element for ${result.missing}` };
  }
  return { status: 'measured', value: (result as { report: SingleGlanceReport }).report };
}

/**
 * Measures whether a control sits inside the viewport without scrolling and
 * whether a tap at its centre actually reaches it.
 *
 * Viewport containment alone is not reachability: a control under a fixed
 * overlay is on screen and untappable, and a geometry-only probe would call
 * that a pass.
 */
export async function measureReachability(
  page: Page,
  selector: string,
): Promise<Probe<ReachabilityReport>> {
  const result = await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    const viewportHeight = window.innerHeight;
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;

    const centreX = rect.left + rect.width / 2;
    const centreY = rect.top + rect.height / 2;
    const topmost = document.elementFromPoint(centreX, centreY);
    const describe = (node: Element | null) => {
      if (!node) return 'none';
      const testid = node.getAttribute('data-testid');
      return testid ? `${node.tagName.toLowerCase()}[data-testid=${testid}]` : node.tagName.toLowerCase();
    };

    return {
      inViewport: rect.top >= 0 && rect.bottom <= viewportHeight,
      hitTestable: topmost !== null && (topmost === element || element.contains(topmost) || topmost.contains(element)),
      box: {
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
        top: Math.round(rect.top * 10) / 10,
        bottom: Math.round(rect.bottom * 10) / 10,
        left: Math.round(rect.left * 10) / 10,
        right: Math.round(rect.right * 10) / 10,
      },
      viewportHeight,
      topmostAtCentre: describe(topmost),
    };
  }, selector);

  if (result === null) {
    return { status: 'unmeasurable', reason: `no measurable element matched ${selector}` };
  }
  return { status: 'measured', value: result };
}

/**
 * Counts chart surfaces mounted entirely below the fold during active play.
 *
 * Such a chart animates and recomputes where nobody can see it, in an exercise
 * whose whole purpose is undistracted attention. Absence of charts is a valid
 * measurement (zero below the fold), so this probe reports `measured` with a
 * total of zero rather than an unmeasurable outcome.
 */
export async function measureBelowFoldCharts(
  page: Page,
  chartSelector: string,
): Promise<Probe<BelowFoldChartReport>> {
  const result = await page.evaluate((sel) => {
    const viewportHeight = window.innerHeight;
    const charts = Array.from(document.querySelectorAll(sel));
    const details: string[] = [];

    charts.forEach((chart, index) => {
      const rect = chart.getBoundingClientRect();
      if (rect.height === 0 && rect.width === 0) return;
      if (rect.top >= viewportHeight) {
        details.push(`chart[${index}] top=${Math.round(rect.top)} viewport=${viewportHeight}`);
      }
    });

    return { total: charts.length, belowFold: details.length, details };
  }, chartSelector);

  return { status: 'measured', value: result };
}

/** Document-level horizontal overflow, matching the existing shell regression rule. */
export async function expectNoDocumentOverflow(page: Page): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth))
    .toBeLessThanOrEqual(1);
}

/**
 * Opens a trainer route and waits for its settings screen.
 *
 * Navigation is kept separate from starting the session on purpose: settings
 * such as grid size are chosen on this screen, and a second navigation would
 * discard them. Combining the two steps silently reset the size and made the
 * touch-floor probe measure a default grid instead of the one under test.
 */
export async function openTrainer(page: Page, route: string): Promise<void> {
  await page.goto(route, { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: 'Начать тест' })).toBeVisible();
}

/**
 * Starts a session from the already-open settings screen.
 *
 * The briefing modal is a deliberate part of the flow, so the harness goes
 * through it rather than around it.
 */
export async function beginSession(page: Page, playfield: string): Promise<void> {
  await page.getByRole('button', { name: 'Начать тест' }).click();
  const initialise = page.getByRole('button', { name: /Инициализировать тест/i });
  await expect(initialise).toBeVisible();
  await initialise.click();
  await expect(page.locator(playfield)).toBeVisible();
  await settleLayout(page);
}

/**
 * Convenience path for tests that do not change settings first.
 *
 * Prefer `openTrainer` + `beginSession` whenever a setting must be applied
 * before the session starts.
 */
export async function startSession(page: Page, contract: TrainerContract): Promise<void> {
  await openTrainer(page, contract.route);
  await beginSession(page, contract.playfield);
}

/**
 * Sets the Schulte grid size slider.
 *
 * Assigning `input.value` directly does not reach React: React installs its own
 * value setter on the element and compares against its last known value, so a
 * raw assignment is swallowed and only the DOM changes. Reading the input back
 * then reports the requested size while the component still renders the old
 * one, which makes a touch-target measurement pass against a grid that was
 * never resized. Going through the prototype setter is what makes React
 * observe it.
 *
 * Callers must still verify the rendered consequence (see `expectRenderedGrid`),
 * because the applied size can legitimately differ from the requested one:
 * Gorbov-Schulte forces size 7.
 */
export async function setSchulteSize(page: Page, size: number): Promise<number> {
  const slider = page.locator('input[type="range"]').first();
  await slider.evaluate((element, value) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!setter) throw new Error('HTMLInputElement value setter is unavailable');
    setter.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, size);
  return Number(await slider.inputValue());
}

/**
 * Selects a Schulte generation algorithm by its option value.
 *
 * This is a native `<select>`, so Playwright's own selectOption dispatches the
 * change event React listens for; the prototype-setter workaround needed for
 * the range input does not apply here.
 *
 * Returns the size the control reports afterwards, because choosing `gorbov`
 * forces size 7 and disables the size slider.
 */
export async function setSchulteMode(page: Page, mode: string): Promise<number> {
  const select = page.locator('select').filter({ has: page.locator('option[value="gorbov"]') }).first();
  await select.selectOption(mode);
  return Number(await page.locator('input[type="range"]').first().inputValue());
}

/**
 * Measures how far the playfield cells deviate from square.
 *
 * The touch floor alone can be satisfied by stretching one axis, which would
 * meet the number and break the instrument: a Schulte table is a spatial search
 * task and non-square cells bias the scan path. Reported as the largest
 * absolute width-minus-height across all cells.
 */
export async function measureSquareness(
  page: Page,
  selector: string,
): Promise<Probe<{ measured: number; maxDelta: number; worst: { width: number; height: number } | null }>> {
  const result = await page.evaluate((sel) => {
    const elements = Array.from(document.querySelectorAll(sel));
    let measured = 0;
    let maxDelta = 0;
    let worst: { width: number; height: number } | null = null;

    elements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      measured += 1;
      const delta = Math.abs(rect.width - rect.height);
      if (delta > maxDelta) {
        maxDelta = delta;
        worst = {
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
        };
      }
    });

    return { measured, maxDelta: Math.round(maxDelta * 10) / 10, worst };
  }, selector);

  if (result.measured === 0) {
    return { status: 'unmeasurable', reason: `no cell with a layout box matched ${selector}` };
  }
  return { status: 'measured', value: result };
}

/**
 * Asserts the playfield actually rendered the expected number of cells.
 *
 * This is the guard against a vacuous touch-target pass: without it, a grid
 * that silently stayed at its default size is measured instead of the size
 * under test, and the smaller cells the contract exists to catch are never
 * rendered at all.
 */
export async function expectRenderedGrid(
  page: Page,
  contract: TrainerContract,
  size: number,
): Promise<number> {
  if (!contract.expectedCellCount) {
    throw new Error(`${UNMEASURABLE_PREFIX}: ${contract.name} declares no expectedCellCount`);
  }
  const expected = contract.expectedCellCount(size);
  await expect
    .poll(() => page.locator(contract.touchTargets).count(), {
      message: `playfield must render ${expected} cells for a ${size}x${size} grid`,
    })
    .toBe(expected);
  return expected;
}

/**
 * Selector that owns horizontal overflow for a trainer's playfield.
 *
 * Kept as a function rather than a required field so that a trainer which does
 * not separate the two keeps a single selector and cannot fall out of sync.
 */
export function scrollOwner(contract: TrainerContract): string {
  return contract.scrollContainer ?? contract.playfield;
}

/**
 * Whether inner horizontal scroll is permitted for this trainer at this width.
 *
 * Keeping the rule here rather than in each spec means an exception is granted
 * in one place and every spec reads the same answer.
 */
export function innerScrollPermitted(contract: TrainerContract, viewportWidth: number): boolean {
  if (contract.allowsInnerHorizontalScroll) return true;
  return contract.innerScrollAllowedBelowPx !== undefined
    && viewportWidth < contract.innerScrollAllowedBelowPx;
}

/** Convenience locator for the cells of a Schulte-family grid. */
export function playfieldCells(page: Page, contract: TrainerContract): Locator {
  return page.locator(contract.touchTargets);
}
