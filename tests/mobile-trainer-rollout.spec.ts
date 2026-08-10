import { expect, test } from '@playwright/test';
import { installSyntheticApi } from './helpers';
import { TOUCH_FLOOR_PX, measureReachability, measureTouchTargets, requireMeasurement } from './mobile-contract';

const PHONE_VIEWPORTS = [
  { name: 'compact phone', width: 320, height: 700 },
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'standard phone', width: 390, height: 844 },
] as const;

type Clause = 'briefing' | 'touchFloor' | 'innerScroll' | 'activeCharts' | 'abort' | 'fontAndOverflow';
type ClauseStatus = { applies: true } | { applies: false; reason: string };

interface TrainerContract {
  name: string;
  route: string;
  clauses: Record<Clause, ClauseStatus>;
}

function skipReason(status: ClauseStatus): string | undefined {
  return 'reason' in status ? status.reason : undefined;
}

const ALL_APPLY: Record<Clause, ClauseStatus> = {
  briefing: { applies: true },
  touchFloor: { applies: true },
  innerScroll: { applies: true },
  activeCharts: { applies: true },
  abort: { applies: true },
  fontAndOverflow: { applies: true },
};

const NO_ABORT: Record<Clause, ClauseStatus> = {
  ...ALL_APPLY,
  abort: { applies: false, reason: 'This trainer has no early-abort control.' },
};

// #247 rolls out to the explicit 13-trainer list, including Schulte as the
// reference implementation. Every clause must be represented; any later
// inapplicable clause needs a reason instead of silently dropping coverage.
const TRAINERS: TrainerContract[] = [
  { name: 'Alphabet table', route: '/alphabet-table', clauses: ALL_APPLY },
  {
    name: 'Cognitive trash filter',
    route: '/filter',
    clauses: {
      ...NO_ABORT,
      briefing: { applies: false, reason: 'The trainer initializes its first statement automatically.' },
    },
  },
  { name: 'Logical matrix', route: '/logical', clauses: NO_ABORT },
  { name: 'Mental math', route: '/mental-math', clauses: ALL_APPLY },
  { name: 'N-back', route: '/nback', clauses: NO_ABORT },
  { name: 'Numerical analysis', route: '/numerical', clauses: NO_ABORT },
  { name: 'Schulte', route: '/schulte', clauses: ALL_APPLY },
  {
    name: 'Schulte 90',
    route: '/schulte-90',
    clauses: {
      ...ALL_APPLY,
      innerScroll: { applies: false, reason: 'Declared 90-cell grid inner-scroll exception.' },
    },
  },
  { name: 'Situational judgment', route: '/situational', clauses: NO_ABORT },
  { name: 'Spatial concealment', route: '/spatial', clauses: NO_ABORT },
  { name: 'Speed typing', route: '/typing', clauses: NO_ABORT },
  { name: 'Stroop alphabet', route: '/stroop?mode=combined', clauses: ALL_APPLY },
  { name: 'Stroop', route: '/stroop', clauses: NO_ABORT },
];

test('every rollout row declares every mobile clause and explains skips', () => {
  expect(TRAINERS).toHaveLength(13);

  for (const trainer of TRAINERS) {
    for (const clause of Object.keys(ALL_APPLY) as Clause[]) {
      const status = trainer.clauses[clause];
      expect(status, `${trainer.name} is missing ${clause}`).toBeDefined();
      if (!status.applies) {
        expect(skipReason(status), `${trainer.name} ${clause} skip needs a reason`).not.toHaveLength(0);
      }
    }
  }
});

for (const trainer of TRAINERS) {
  for (const viewport of PHONE_VIEWPORTS) {
    test.describe(`mobile rollout: ${trainer.name} on ${viewport.name}`, () => {
      test.use({ viewport });

      test.beforeEach(async ({ page }) => {
        await installSyntheticApi(page);
      });

      test('exposes the stable briefing start control', async ({ page }) => {
        test.skip(
          !trainer.clauses.briefing.applies,
          skipReason(trainer.clauses.briefing),
        );
        await page.goto(trainer.route, { waitUntil: 'networkidle' });
        await expect(page.getByTestId('start-button')).toBeVisible();
      });

      test('keeps its abort control reachable when early exit exists', async ({ page }) => {
        test.skip(
          !trainer.clauses.abort.applies,
          skipReason(trainer.clauses.abort),
        );
        await page.goto(trainer.route, { waitUntil: 'networkidle' });
        await page.getByTestId('start-button').click();
        const initialise = page.getByRole('button', { name: /Инициализировать тест/i });
        if (await initialise.isVisible().catch(() => false)) await initialise.click();
        const visibleAbort = page.getByTestId('stop-button');
        await expect(visibleAbort).toHaveCount(1);

        const reachability = requireMeasurement(
          await measureReachability(page, '[data-testid="stop-button"]'),
          `${trainer.name} abort at ${viewport.width}px`,
        );
        expect(reachability.inViewport).toBe(true);
        expect(reachability.hitTestable).toBe(true);

        const target = requireMeasurement(
          await measureTouchTargets(page, '[data-testid="stop-button"]', TOUCH_FLOOR_PX),
          `${trainer.name} abort touch target at ${viewport.width}px`,
        );
        expect(target.violations).toEqual([]);
      });

      test('keeps document width clean and visible text at the mobile floor', async ({ page }) => {
        test.skip(
          !trainer.clauses.fontAndOverflow.applies,
          skipReason(trainer.clauses.fontAndOverflow),
        );
        await page.goto(trainer.route, { waitUntil: 'networkidle' });

        const report = await page.evaluate(() => {
          const overflowing = document.documentElement.scrollWidth > window.innerWidth;
          const belowFloor = Array.from(document.querySelectorAll<HTMLElement>(
            'label, select, textarea, [data-testid="start-button"], [data-testid="stop-button"], [data-testid="hud-timer"], [data-testid="grid-container"]',
          ))
            .filter((element) => {
              const style = getComputedStyle(element);
              return style.visibility !== 'hidden'
                && style.display !== 'none'
                && element.getBoundingClientRect().width > 0
                && Number.parseFloat(style.fontSize) < 14;
            })
            .map((element) => ({
              tag: element.tagName,
              text: (element.innerText || '').trim().slice(0, 32),
              fontSize: getComputedStyle(element).fontSize,
            }));
          return { overflowing, belowFloor };
        });

        expect(report.overflowing, `${trainer.name} overflows at ${viewport.width}px`).toBe(false);
        expect(
          report.belowFloor,
          `${trainer.name} has visible text below 14px at ${viewport.width}px`,
        ).toEqual([]);
      });
    });
  }
}
