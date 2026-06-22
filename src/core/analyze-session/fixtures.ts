import type { AnalyzeSessionEvent, AnalyzeSessionInput } from './session-analysis';

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

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function isoAt(ms: number) {
  return new Date(Date.UTC(2026, 0, 2, 0, 0, 0, ms)).toISOString();
}

function clampInt(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function makeReactionEvent(
  index: number,
  options: {
    tMs: number;
    kind?: 'click' | 'answer';
    reactionTimeMs: number;
    isCorrect: boolean;
  },
): AnalyzeSessionEvent {
  const normalized = (index % 100) / 99;
  return {
    tMs: options.tMs,
    kind: options.kind || 'click',
    reactionTimeMs: options.reactionTimeMs,
    isCorrect: options.isCorrect,
    x: Number(normalized.toFixed(3)),
    y: Number((1 - normalized).toFixed(3)),
  };
}

function buildSession(params: {
  sessionId: string;
  moduleId: string;
  startedAt?: string;
  completedAt?: string;
  events: AnalyzeSessionEvent[];
}): AnalyzeSessionInput {
  return {
    schemaVersion: 1,
    sessionId: params.sessionId,
    moduleId: params.moduleId,
    category: 'cognitive',
    startedAt: params.startedAt || isoAt(0),
    completedAt: params.completedAt,
    events: params.events,
  };
}

export function createThousandClickSession(): AnalyzeSessionInput {
  const random = createSeededRandom(1_001);
  const events: AnalyzeSessionEvent[] = [
    { tMs: 0, kind: 'checkpoint', checkpoint: 'route_loaded' },
  ];

  for (let index = 0; index < 1_000; index += 1) {
    const jitter = (random() - 0.5) * 36;
    events.push(makeReactionEvent(index, {
      tMs: 180 + (index * 180),
      reactionTimeMs: clampInt(210 + jitter, 120, 420),
      isCorrect: index % 37 !== 0,
    }));
  }

  events.push({ tMs: 181_000, kind: 'checkpoint', checkpoint: 'completed' });

  return buildSession({
    sessionId: 'synthetic-v2-thousand-clicks',
    moduleId: 'schulte',
    completedAt: isoAt(181_000),
    events,
  });
}

export function createTenThousandMixedSession(): AnalyzeSessionInput {
  const random = createSeededRandom(10_000);
  const events: AnalyzeSessionEvent[] = [];

  for (let index = 0; index < 10_000; index += 1) {
    const tMs = index * 60;
    if (index % 500 === 0) {
      events.push({ tMs, kind: 'checkpoint', checkpoint: `batch:${index}` });
      continue;
    }

    const kind = index % 3 === 0 ? 'answer' : 'click';
    const drift = Math.sin(index / 97) * 42;
    const jitter = (random() - 0.5) * 70;
    events.push(makeReactionEvent(index, {
      tMs,
      kind,
      reactionTimeMs: clampInt(260 + drift + jitter, 90, 720),
      isCorrect: index % 29 !== 0,
    }));
  }

  return buildSession({
    sessionId: 'synthetic-v2-ten-thousand-mixed',
    moduleId: 'dispatcher',
    completedAt: isoAt(599_940),
    events,
  });
}

export function createIrregularReactionSession(): AnalyzeSessionInput {
  const random = createSeededRandom(4_242);
  const events: AnalyzeSessionEvent[] = [
    { tMs: 0, kind: 'checkpoint', checkpoint: 'route_loaded' },
  ];

  for (let index = 0; index < 420; index += 1) {
    const burst = index % 47 === 0 ? 260 : 0;
    const dip = index % 31 === 0 ? -90 : 0;
    events.push(makeReactionEvent(index, {
      tMs: 500 + (index * 480),
      kind: 'answer',
      reactionTimeMs: clampInt(390 + burst + dip + ((random() - 0.5) * 180), 120, 1_200),
      isCorrect: index % 11 !== 0,
    }));
  }

  return buildSession({
    sessionId: 'synthetic-v2-irregular-reactions',
    moduleId: 'stroop',
    completedAt: isoAt(202_000),
    events,
  });
}

export function createFatigueCurveSession(): AnalyzeSessionInput {
  const events: AnalyzeSessionEvent[] = [
    { tMs: 0, kind: 'checkpoint', checkpoint: 'route_loaded' },
    { tMs: 120_000, kind: 'checkpoint', checkpoint: 'midpoint' },
  ];

  for (let index = 0; index < 800; index += 1) {
    const progress = index / 799;
    events.push(makeReactionEvent(index, {
      tMs: 400 + (index * 420),
      reactionTimeMs: clampInt(180 + (progress * 230) + (Math.sin(index / 13) * 18), 120, 720),
      isCorrect: index % 23 !== 0,
    }));
  }

  return buildSession({
    sessionId: 'synthetic-v2-fatigue-curve',
    moduleId: 'nback',
    completedAt: isoAt(336_000),
    events,
  });
}

export function createSuspiciousBurstSession(): AnalyzeSessionInput {
  const events: AnalyzeSessionEvent[] = [];

  for (let index = 0; index < 300; index += 1) {
    events.push(makeReactionEvent(index, {
      tMs: 80 + (index * 90),
      reactionTimeMs: 48 + (index % 3),
      isCorrect: true,
    }));
  }

  return buildSession({
    sessionId: 'synthetic-v2-suspicious-burst',
    moduleId: 'schulte',
    completedAt: isoAt(27_000),
    events,
  });
}

export function createAbandonedCheckpointSession(): AnalyzeSessionInput {
  const events: AnalyzeSessionEvent[] = [
    { tMs: 0, kind: 'checkpoint', checkpoint: 'route_loaded' },
    { tMs: 2_000, kind: 'checkpoint', checkpoint: 'instructions_viewed' },
    makeReactionEvent(0, { tMs: 3_000, reactionTimeMs: 920, isCorrect: false }),
    makeReactionEvent(1, { tMs: 4_500, reactionTimeMs: 1_100, isCorrect: false }),
    { tMs: 5_000, kind: 'checkpoint', checkpoint: 'abandoned:route_change' },
  ];

  return buildSession({
    sessionId: 'synthetic-v2-abandoned-checkpoints',
    moduleId: 'numerical',
    events,
  });
}

export function createRecoveryAfterFatigueSession(): AnalyzeSessionInput {
  const events: AnalyzeSessionEvent[] = [
    { tMs: 0, kind: 'checkpoint', checkpoint: 'route_loaded' },
    { tMs: 90_000, kind: 'checkpoint', checkpoint: 'breathing_recovered' },
  ];

  for (let index = 0; index < 600; index += 1) {
    const progress = index / 599;
    events.push(makeReactionEvent(index, {
      tMs: 300 + (index * 360),
      reactionTimeMs: clampInt(420 - (progress * 210) + (Math.sin(index / 17) * 14), 120, 620),
      isCorrect: index % 47 !== 0,
    }));
  }

  return buildSession({
    sessionId: 'synthetic-v2-recovery-after-fatigue',
    moduleId: 'focus',
    completedAt: isoAt(216_000),
    events,
  });
}

export function createGoldenV2Sessions() {
  return [
    createThousandClickSession(),
    createTenThousandMixedSession(),
    createIrregularReactionSession(),
    createFatigueCurveSession(),
    createSuspiciousBurstSession(),
    createAbandonedCheckpointSession(),
    createRecoveryAfterFatigueSession(),
  ] as const;
}

export const syntheticGoldenV2Sessions = createGoldenV2Sessions();
