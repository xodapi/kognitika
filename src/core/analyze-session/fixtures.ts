import type { AnalyzeSessionInput } from './session-analysis';

export const syntheticCellClickSession: AnalyzeSessionInput = {
  schemaVersion: 1,
  sessionId: 'synthetic-schulte-session',
  moduleId: 'schulte',
  category: 'cognitive',
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T00:00:06.000Z',
  events: [
    { tMs: 0, kind: 'checkpoint', checkpoint: 'route_loaded' },
    { tMs: 1_000, kind: 'click', reactionTimeMs: 100, isCorrect: true, x: 0.1, y: 0.1 },
    { tMs: 2_000, kind: 'click', reactionTimeMs: 120, isCorrect: true, x: 0.2, y: 0.2 },
    { tMs: 3_000, kind: 'click', reactionTimeMs: 140, isCorrect: true, x: 0.3, y: 0.3 },
    { tMs: 4_000, kind: 'click', reactionTimeMs: 160, isCorrect: true, x: 0.4, y: 0.4 },
    { tMs: 5_000, kind: 'click', reactionTimeMs: 180, isCorrect: false, x: 0.5, y: 0.5 },
    { tMs: 6_000, kind: 'click', reactionTimeMs: 220, isCorrect: true, x: 0.6, y: 0.6 },
  ],
};

export const syntheticPracticeFlowSession: AnalyzeSessionInput = {
  schemaVersion: 1,
  sessionId: 'synthetic-flow-session',
  moduleId: 'stroop',
  category: 'cognitive',
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T00:00:24.000Z',
  events: [
    { tMs: 0, kind: 'checkpoint', checkpoint: 'route_loaded' },
    { tMs: 8_000, kind: 'checkpoint', checkpoint: 'engaged_8s' },
    { tMs: 9_000, kind: 'answer', reactionTimeMs: 720, isCorrect: true },
    { tMs: 12_000, kind: 'answer', reactionTimeMs: 680, isCorrect: true },
    { tMs: 15_000, kind: 'answer', reactionTimeMs: 650, isCorrect: true },
    { tMs: 18_000, kind: 'answer', reactionTimeMs: 640, isCorrect: true },
    { tMs: 21_000, kind: 'answer', reactionTimeMs: 610, isCorrect: true },
    { tMs: 24_000, kind: 'checkpoint', checkpoint: 'completed' },
  ],
};

export const syntheticSuspiciousFastSession: AnalyzeSessionInput = {
  schemaVersion: 1,
  sessionId: 'synthetic-fast-session',
  moduleId: 'schulte',
  category: 'cognitive',
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T00:00:02.000Z',
  events: [
    { tMs: 100, kind: 'click', reactionTimeMs: 48, isCorrect: true, x: 0.1, y: 0.1 },
    { tMs: 300, kind: 'click', reactionTimeMs: 49, isCorrect: true, x: 0.2, y: 0.2 },
    { tMs: 500, kind: 'click', reactionTimeMs: 49, isCorrect: true, x: 0.3, y: 0.3 },
    { tMs: 700, kind: 'click', reactionTimeMs: 50, isCorrect: true, x: 0.4, y: 0.4 },
    { tMs: 900, kind: 'click', reactionTimeMs: 50, isCorrect: true, x: 0.5, y: 0.5 },
    { tMs: 1_100, kind: 'click', reactionTimeMs: 49, isCorrect: true, x: 0.6, y: 0.6 },
  ],
};
