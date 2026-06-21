import {
  type PracticeFlowCategory,
  type PracticeFlowEvent,
  normalizePracticeRoute,
  parsePracticeFlowEvent,
  routeToPracticeMeta,
} from './practice-flow-analytics';
import { STORAGE_SCHEMA_VERSION } from './storage-keys';

interface ActivePractice {
  category: PracticeFlowCategory;
  moduleId: string;
  route: string;
  startedAt: number;
  lastCheckpoint: string;
  completed: boolean;
}

const ANONYMOUS_SESSION_KEY = 'kognitika:session:practiceFlow';
let activePractice: ActivePractice | null = null;

function getBuildId() {
  return String(import.meta.env.VITE_BUILD_ID || import.meta.env.VITE_GIT_COMMIT || 'dev');
}

function getAnonymousSessionId() {
  if (typeof window === 'undefined') return 'anon-server';

  try {
    const existing = window.sessionStorage.getItem(ANONYMOUS_SESSION_KEY);
    if (existing) return existing;

    const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const next = `anon-${random}`;
    window.sessionStorage.setItem(ANONYMOUS_SESSION_KEY, next);
    return next;
  } catch {
    return `anon-${Date.now().toString(36)}`;
  }
}

function baseEvent(practice: Pick<ActivePractice, 'category' | 'moduleId' | 'route'>) {
  return {
    category: practice.category,
    moduleId: practice.moduleId,
    route: normalizePracticeRoute(practice.route),
    buildId: getBuildId(),
    storageSchemaVersion: String(STORAGE_SCHEMA_VERSION),
    anonymousSessionId: getAnonymousSessionId(),
    timestamp: new Date().toISOString(),
  };
}

function sendPracticeFlowEvent(event: PracticeFlowEvent) {
  const parsed = parsePracticeFlowEvent(event);
  if (!parsed.success || typeof window === 'undefined') return;

  const body = JSON.stringify(parsed.data);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon('/api/analytics/practice-flow', blob)) return;
  }

  void fetch('/api/analytics/practice-flow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function startPracticeFlow(pathname: string) {
  const route = normalizePracticeRoute(pathname);
  const meta = routeToPracticeMeta(route);
  if (!meta) {
    activePractice = null;
    return null;
  }

  activePractice = {
    ...meta,
    route,
    startedAt: Date.now(),
    lastCheckpoint: 'route_loaded',
    completed: false,
  };

  sendPracticeFlowEvent({
    event: 'PracticeStarted',
    ...baseEvent(activePractice),
    checkpoint: 'route_loaded',
  });

  return activePractice;
}

export function recordPracticeFlowCheckpoint(checkpoint: string) {
  if (!activePractice || activePractice.completed) return;

  activePractice.lastCheckpoint = checkpoint;
  sendPracticeFlowEvent({
    event: 'PracticeStepViewed',
    ...baseEvent(activePractice),
    checkpoint,
  });
}

export function completePracticeFlow(moduleId?: string) {
  if (!activePractice || activePractice.completed) return;
  if (moduleId && activePractice.moduleId !== moduleId) return;

  activePractice.completed = true;
  activePractice.lastCheckpoint = 'completed';
  sendPracticeFlowEvent({
    event: 'PracticeCompleted',
    ...baseEvent(activePractice),
    checkpoint: 'completed',
    durationMs: Date.now() - activePractice.startedAt,
  });
}

export function abandonPracticeFlow(reason: 'route_change' | 'pagehide' | 'inactive') {
  if (!activePractice || activePractice.completed) return;

  const abandoned = activePractice;
  activePractice = null;
  sendPracticeFlowEvent({
    event: 'PracticeAbandoned',
    ...baseEvent(abandoned),
    lastCheckpoint: abandoned.lastCheckpoint,
    reason,
    durationMs: Date.now() - abandoned.startedAt,
  });
}

export function recordPracticeRecommendedFlow(input: {
  category: PracticeFlowCategory;
  moduleId: string;
  reason: 'weak_area' | 'streak_maintenance' | 'variety' | 'recovery';
  sourceSessionId: string;
}) {
  const route = typeof window === 'undefined' ? '/' : window.location.pathname;
  sendPracticeFlowEvent({
    event: 'PracticeRecommended',
    ...baseEvent({ ...input, route }),
    reason: input.reason,
    sourceSessionId: input.sourceSessionId,
  });
}
