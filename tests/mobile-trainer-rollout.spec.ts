import { expect, test } from '@playwright/test';
import { installSyntheticApi } from './helpers';

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

const ALL_APPLY: Record<Clause, ClauseStatus> = {
  briefing: { applies: true },
  touchFloor: { applies: true },
  innerScroll: { applies: true },
  activeCharts: { applies: true },
  abort: { applies: true },
  fontAndOverflow: { applies: true },
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
      ...ALL_APPLY,
      briefing: { applies: false, reason: 'The trainer initializes its first statement automatically.' },
    },
  },
  { name: 'Logical matrix', route: '/logical', clauses: ALL_APPLY },
  { name: 'Mental math', route: '/mental-math', clauses: ALL_APPLY },
  { name: 'N-back', route: '/nback', clauses: ALL_APPLY },
  { name: 'Numerical analysis', route: '/numerical', clauses: ALL_APPLY },
  { name: 'Schulte', route: '/schulte', clauses: ALL_APPLY },
  {
    name: 'Schulte 90',
    route: '/schulte-90',
    clauses: {
      ...ALL_APPLY,
      innerScroll: { applies: false, reason: 'Declared 90-cell grid inner-scroll exception.' },
    },
  },
  { name: 'Situational judgment', route: '/situational', clauses: ALL_APPLY },
  { name: 'Spatial concealment', route: '/spatial', clauses: ALL_APPLY },
  { name: 'Speed typing', route: '/typing', clauses: ALL_APPLY },
  { name: 'Stroop alphabet', route: '/stroop?mode=combined', clauses: ALL_APPLY },
  { name: 'Stroop', route: '/stroop', clauses: ALL_APPLY },
];

test('every rollout row declares every mobile clause and explains skips', () => {
  expect(TRAINERS).toHaveLength(13);

  for (const trainer of TRAINERS) {
    for (const clause of Object.keys(ALL_APPLY) as Clause[]) {
      const status = trainer.clauses[clause];
      expect(status, `${trainer.name} is missing ${clause}`).toBeDefined();
      if (!status.applies) {
        expect(status.reason, `${trainer.name} ${clause} skip needs a reason`).not.toHaveLength(0);
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
          trainer.clauses.briefing.applies ? undefined : trainer.clauses.briefing.reason,
        );
        await page.goto(trainer.route, { waitUntil: 'networkidle' });
        await expect(page.getByTestId('start-button')).toBeVisible();
      });
    });
  }
}
