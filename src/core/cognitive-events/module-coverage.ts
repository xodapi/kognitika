import { APP_ROUTE_PATHS, RECOMMENDED_GAME_ROUTES } from '../../lib/routes.ts';
import { PUBLIC_PRACTICE_ROUTES, type PracticeFlowCategory } from '../../lib/practice-flow-analytics.ts';

export interface CognitiveModuleCoverage {
  moduleId: string;
  route: string;
  category: PracticeFlowCategory;
  trialType: string;
  currentCapture: 'legacy-events' | 'practice-flow-only' | 'not-instrumented';
}

const LEGACY_EVENT_MODULE_IDS = new Set([
  'schulte',
  'schulte-90',
  'numerical',
  'nback',
  'logical',
  'stroop',
  'mental-math',
]);

export const COGNITIVE_MODULE_COVERAGE: readonly CognitiveModuleCoverage[] = Object.entries(PUBLIC_PRACTICE_ROUTES)
  .filter(([, meta]) => meta.category === 'cognitive')
  .map(([route, meta]) => ({
    moduleId: meta.moduleId,
    route,
    category: meta.category,
    trialType: `${meta.moduleId}:trial`,
    currentCapture: LEGACY_EVENT_MODULE_IDS.has(meta.moduleId)
      ? 'legacy-events'
      : 'practice-flow-only',
  }));

export function getCognitiveModuleCoverage(route: string) {
  return COGNITIVE_MODULE_COVERAGE.find((module) => module.route === route) || null;
}

export function assertCognitiveModuleCoverage(): string[] {
  const coverageRoutes = new Set(COGNITIVE_MODULE_COVERAGE.map((module) => module.route));
  const issues: string[] = [];

  for (const route of Object.values(RECOMMENDED_GAME_ROUTES)) {
    const meta = PUBLIC_PRACTICE_ROUTES[route as keyof typeof PUBLIC_PRACTICE_ROUTES];
    if (meta?.category === 'cognitive' && !coverageRoutes.has(route)) {
      issues.push(`Missing cognitive event coverage for recommended route ${route}`);
    }
  }

  for (const module of COGNITIVE_MODULE_COVERAGE) {
    if (!(APP_ROUTE_PATHS as readonly string[]).includes(module.route)) {
      issues.push(`Coverage route ${module.route} is not an app route`);
    }
  }

  return issues;
}
