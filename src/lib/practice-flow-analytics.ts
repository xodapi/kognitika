import { z } from 'zod';

export const PracticeFlowCategorySchema = z.enum(['cognitive', 'somatic', 'safety']);
export const PracticeFlowEventNameSchema = z.enum([
  'PracticeRecommended',
  'PracticeStarted',
  'PracticeStepViewed',
  'PracticeCompleted',
  'PracticeAbandoned',
]);

const routeSchema = z.string().min(1).max(120).regex(/^\/[A-Za-z0-9/_-]*$/);
const moduleIdSchema = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);
const checkpointSchema = z.string().min(1).max(80).regex(/^[a-z0-9:_-]+$/);
const buildIdSchema = z.string().min(1).max(120).regex(/^[A-Za-z0-9._:-]+$/);
const storageSchemaVersionSchema = z.string().min(1).max(32).regex(/^[A-Za-z0-9._:-]+$/);
const anonymousSessionIdSchema = z.string().min(8).max(80).regex(/^anon-[A-Za-z0-9._:-]+$/);

const baseShape = {
  category: PracticeFlowCategorySchema,
  moduleId: moduleIdSchema,
  route: routeSchema,
  buildId: buildIdSchema,
  storageSchemaVersion: storageSchemaVersionSchema,
  anonymousSessionId: anonymousSessionIdSchema,
  timestamp: z.string().datetime(),
};

export const PracticeRecommendedFlowEventSchema = z.object({
  event: z.literal('PracticeRecommended'),
  ...baseShape,
  reason: z.enum(['weak_area', 'streak_maintenance', 'variety', 'recovery']),
  sourceSessionId: z.string().min(1).max(120).regex(/^[A-Za-z0-9._:-]+$/),
}).strict();

export const PracticeStartedFlowEventSchema = z.object({
  event: z.literal('PracticeStarted'),
  ...baseShape,
  checkpoint: checkpointSchema.default('route_loaded'),
}).strict();

export const PracticeStepViewedFlowEventSchema = z.object({
  event: z.literal('PracticeStepViewed'),
  ...baseShape,
  checkpoint: checkpointSchema,
}).strict();

export const PracticeCompletedFlowEventSchema = z.object({
  event: z.literal('PracticeCompleted'),
  ...baseShape,
  checkpoint: checkpointSchema.default('completed'),
  durationMs: z.number().int().nonnegative().max(24 * 60 * 60 * 1000).optional(),
}).strict();

export const PracticeAbandonedFlowEventSchema = z.object({
  event: z.literal('PracticeAbandoned'),
  ...baseShape,
  lastCheckpoint: checkpointSchema,
  reason: z.enum(['route_change', 'pagehide', 'inactive']),
  durationMs: z.number().int().nonnegative().max(24 * 60 * 60 * 1000).optional(),
}).strict();

export const PracticeFlowEventSchema = z.discriminatedUnion('event', [
  PracticeRecommendedFlowEventSchema,
  PracticeStartedFlowEventSchema,
  PracticeStepViewedFlowEventSchema,
  PracticeCompletedFlowEventSchema,
  PracticeAbandonedFlowEventSchema,
]);

export type PracticeFlowEvent = z.infer<typeof PracticeFlowEventSchema>;
export type PracticeFlowCategory = z.infer<typeof PracticeFlowCategorySchema>;

export const PUBLIC_PRACTICE_ROUTES = {
  '/schulte': { moduleId: 'schulte', category: 'cognitive' },
  '/numerical': { moduleId: 'numerical', category: 'cognitive' },
  '/logical': { moduleId: 'logical', category: 'cognitive' },
  '/stroop': { moduleId: 'stroop', category: 'cognitive' },
  '/nback': { moduleId: 'nback', category: 'cognitive' },
  '/situational': { moduleId: 'situational', category: 'cognitive' },
  '/typing': { moduleId: 'typing', category: 'cognitive' },
  '/spatial': { moduleId: 'spatial', category: 'cognitive' },
  '/objective': { moduleId: 'objective', category: 'cognitive' },
  '/profiling': { moduleId: 'profiling', category: 'cognitive' },
  '/anomaly': { moduleId: 'anomaly', category: 'safety' },
  '/dialogue': { moduleId: 'dialogue', category: 'cognitive' },
  '/topology': { moduleId: 'topology', category: 'cognitive' },
  '/collision': { moduleId: 'collision', category: 'cognitive' },
  '/dispatcher': { moduleId: 'dispatcher', category: 'cognitive' },
  '/noise': { moduleId: 'noise', category: 'cognitive' },
  '/scanner': { moduleId: 'scanner', category: 'safety' },
  '/decryptor': { moduleId: 'decryptor', category: 'safety' },
  '/reality': { moduleId: 'reality', category: 'safety' },
  '/silence': { moduleId: 'silence', category: 'somatic' },
  '/filter': { moduleId: 'filter', category: 'safety' },
  '/hype': { moduleId: 'hype', category: 'safety' },
  '/reframing': { moduleId: 'reframing', category: 'safety' },
  '/rejection': { moduleId: 'rejection', category: 'safety' },
  '/storytelling': { moduleId: 'storytelling', category: 'cognitive' },
  '/focus': { moduleId: 'focus', category: 'cognitive' },
} as const satisfies Record<string, { moduleId: string; category: PracticeFlowCategory }>;

export type PublicPracticeRoute = keyof typeof PUBLIC_PRACTICE_ROUTES;

const SENSITIVE_FIELD_PATTERN = /(authorization|auth|bearer|brainid|cookie|email|jwt|localstorage|password|rawstorage|refresh|screenshot|secret|token)/i;

export function normalizePracticeRoute(pathname: string) {
  const route = String(pathname || '/').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return route;
}

export function routeToPracticeMeta(pathname: string) {
  const route = normalizePracticeRoute(pathname);
  return PUBLIC_PRACTICE_ROUTES[route as PublicPracticeRoute] || null;
}

function hasSensitiveKey(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(hasSensitiveKey);

  return Object.entries(value as Record<string, unknown>).some(([key, item]) => (
    SENSITIVE_FIELD_PATTERN.test(key) || hasSensitiveKey(item)
  ));
}

export function parsePracticeFlowEvent(value: unknown) {
  if (hasSensitiveKey(value)) {
    return {
      success: false as const,
      error: 'Practice flow events must not contain identity, token, raw storage, or screenshot fields',
    };
  }

  const parsed = PracticeFlowEventSchema.safeParse(value);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.format() };
  }

  return { success: true as const, data: parsed.data };
}

interface ModuleSummary {
  moduleId: string;
  category: PracticeFlowCategory;
  started: number;
  completed: number;
  abandoned: number;
  abandonmentRate: number;
  checkpoints: Record<string, number>;
}

interface RecommendationSummary {
  shown: number;
  converted: number;
  conversionRate: number;
  continuationStarts: number;
}

export interface PracticeFlowSummary {
  generatedAt: string;
  totalEvents: number;
  byModule: ModuleSummary[];
  dropOffByModuleAndCheckpoint: Array<{
    moduleId: string;
    checkpoint: string;
    abandoned: number;
  }>;
  recommendationConversion: RecommendationSummary;
  modulesWithHighAbandonment: Array<{
    moduleId: string;
    abandonmentRate: number;
    started: number;
    abandoned: number;
  }>;
}

function getOrCreateModuleSummary(
  map: Map<string, ModuleSummary>,
  moduleId: string,
  category: PracticeFlowCategory,
) {
  const existing = map.get(moduleId);
  if (existing) return existing;

  const created: ModuleSummary = {
    moduleId,
    category,
    started: 0,
    completed: 0,
    abandoned: 0,
    abandonmentRate: 0,
    checkpoints: {},
  };
  map.set(moduleId, created);
  return created;
}

export function summarizePracticeFlowEvents(events: readonly PracticeFlowEvent[]): PracticeFlowSummary {
  const byModule = new Map<string, ModuleSummary>();
  const dropOffs = new Map<string, { moduleId: string; checkpoint: string; abandoned: number }>();
  const recommendations = events.filter((event) => event.event === 'PracticeRecommended');
  let convertedRecommendations = 0;
  let continuationStarts = 0;

  for (const event of events) {
    const moduleSummary = getOrCreateModuleSummary(byModule, event.moduleId, event.category);

    if (event.event === 'PracticeStarted') {
      moduleSummary.started += 1;
      moduleSummary.checkpoints[event.checkpoint] = (moduleSummary.checkpoints[event.checkpoint] || 0) + 1;
    }

    if (event.event === 'PracticeStepViewed') {
      moduleSummary.checkpoints[event.checkpoint] = (moduleSummary.checkpoints[event.checkpoint] || 0) + 1;
    }

    if (event.event === 'PracticeCompleted') {
      moduleSummary.completed += 1;
      moduleSummary.checkpoints[event.checkpoint] = (moduleSummary.checkpoints[event.checkpoint] || 0) + 1;
    }

    if (event.event === 'PracticeAbandoned') {
      moduleSummary.abandoned += 1;
      moduleSummary.checkpoints[event.lastCheckpoint] = (moduleSummary.checkpoints[event.lastCheckpoint] || 0) + 1;

      const key = `${event.moduleId}:${event.lastCheckpoint}`;
      const current = dropOffs.get(key) || {
        moduleId: event.moduleId,
        checkpoint: event.lastCheckpoint,
        abandoned: 0,
      };
      current.abandoned += 1;
      dropOffs.set(key, current);
    }
  }

  for (const recommendation of recommendations) {
    const recommendedAt = Date.parse(recommendation.timestamp);
    const laterStarts = events.filter((event) => (
      event.event === 'PracticeStarted' &&
      event.anonymousSessionId === recommendation.anonymousSessionId &&
      event.moduleId === recommendation.moduleId &&
      Date.parse(event.timestamp) >= recommendedAt
    ));

    if (laterStarts.length > 0) {
      convertedRecommendations += 1;
      continuationStarts += laterStarts.length;
    }
  }

  const modules = Array.from(byModule.values()).map((moduleSummary) => ({
    ...moduleSummary,
    abandonmentRate: moduleSummary.started > 0
      ? Number((moduleSummary.abandoned / moduleSummary.started).toFixed(3))
      : 0,
  }));

  return {
    generatedAt: new Date().toISOString(),
    totalEvents: events.length,
    byModule: modules.sort((a, b) => a.moduleId.localeCompare(b.moduleId)),
    dropOffByModuleAndCheckpoint: Array.from(dropOffs.values()).sort((a, b) => b.abandoned - a.abandoned),
    recommendationConversion: {
      shown: recommendations.length,
      converted: convertedRecommendations,
      conversionRate: recommendations.length > 0
        ? Number((convertedRecommendations / recommendations.length).toFixed(3))
        : 0,
      continuationStarts,
    },
    modulesWithHighAbandonment: modules
      .filter((moduleSummary) => moduleSummary.started >= 2 && moduleSummary.abandonmentRate >= 0.5)
      .sort((a, b) => b.abandonmentRate - a.abandonmentRate)
      .map(({ moduleId, abandonmentRate, started, abandoned }) => ({
        moduleId,
        abandonmentRate,
        started,
        abandoned,
      })),
  };
}
