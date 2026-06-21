export const FRAME_BUDGET_TARGETS = {
  fps60FrameBudgetMs: 16.67,
  appWorkTargetMs: 10,
  longTaskMs: 50,
  inputFeedbackTargetMs: 50,
} as const;

export const FRAME_CRITICAL_ROUTES = [
  '/schulte',
  '/stroop',
  '/nback',
  '/typing',
  '/spatial',
  '/topology',
  '/collision',
  '/dispatcher',
  '/noise',
  '/scanner',
  '/decryptor',
  '/reality',
  '/numerical',
] as const;

export const NON_FRAME_CRITICAL_ROUTES = [
  '/',
  '/dashboard',
  '/admin',
  '/ideas',
  '/leaderboard',
  '/wiki',
] as const;

export interface FrameBudgetSample {
  deltaMs: number;
}

export interface LongTaskSample {
  durationMs: number;
}

export interface InputFeedbackSample {
  durationMs: number;
}

export interface FrameBudgetReport {
  frameCount: number;
  droppedFrames: number;
  droppedFrameRatio: number;
  maxFrameDeltaMs: number;
  p95FrameDeltaMs: number;
  p99FrameDeltaMs: number;
  longTaskCount: number;
  maxLongTaskMs: number;
  p95InputFeedbackMs: number;
  p99InputFeedbackMs: number;
  passesSmokeBudget: boolean;
}

export interface FrameBudgetProbeOptions {
  durationMs?: number;
  now?: () => number;
  requestAnimationFrame?: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame?: (handle: number) => void;
  addInputListeners?: (handler: EventListener) => () => void;
  observeLongTasks?: (handler: (sample: LongTaskSample) => void) => () => void;
}

export interface FrameBudgetProbeResult {
  report: FrameBudgetReport;
  samples: FrameBudgetSample[];
  longTasks: LongTaskSample[];
  inputFeedback: InputFeedbackSample[];
}

function percentile(values: number[], rank: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(rank * sorted.length) - 1);
  return Number(sorted[Math.max(0, index)].toFixed(2));
}

export function summarizeFrameBudget(
  samples: readonly FrameBudgetSample[],
  longTasks: readonly LongTaskSample[] = [],
  inputFeedback: readonly InputFeedbackSample[] = [],
): FrameBudgetReport {
  const frameBudget = FRAME_BUDGET_TARGETS.fps60FrameBudgetMs;
  const frameDeltas = samples.map((sample) => sample.deltaMs).filter(Number.isFinite);
  const longTaskDurations = longTasks.map((sample) => sample.durationMs).filter(Number.isFinite);
  const inputDurations = inputFeedback.map((sample) => sample.durationMs).filter(Number.isFinite);

  const droppedFrames = frameDeltas.reduce((sum, deltaMs) => (
    sum + Math.max(0, Math.round(deltaMs / frameBudget) - 1)
  ), 0);

  const p95FrameDeltaMs = percentile(frameDeltas, 0.95);
  const p99FrameDeltaMs = percentile(frameDeltas, 0.99);
  const p95InputFeedbackMs = percentile(inputDurations, 0.95);
  const p99InputFeedbackMs = percentile(inputDurations, 0.99);
  const maxLongTaskMs = longTaskDurations.length > 0 ? Math.max(...longTaskDurations) : 0;

  return {
    frameCount: frameDeltas.length,
    droppedFrames,
    droppedFrameRatio: frameDeltas.length > 0 ? Number((droppedFrames / frameDeltas.length).toFixed(4)) : 0,
    maxFrameDeltaMs: frameDeltas.length > 0 ? Number(Math.max(...frameDeltas).toFixed(2)) : 0,
    p95FrameDeltaMs,
    p99FrameDeltaMs,
    longTaskCount: longTaskDurations.length,
    maxLongTaskMs: Number(maxLongTaskMs.toFixed(2)),
    p95InputFeedbackMs,
    p99InputFeedbackMs,
    passesSmokeBudget:
      p95FrameDeltaMs <= frameBudget * 2 &&
      maxLongTaskMs <= FRAME_BUDGET_TARGETS.longTaskMs * 3 &&
      (inputDurations.length === 0 || p95InputFeedbackMs <= FRAME_BUDGET_TARGETS.inputFeedbackTargetMs * 2),
  };
}

function defaultNow() {
  return performance.now();
}

function defaultAddInputListeners(handler: EventListener) {
  const eventNames = ['pointerdown', 'keydown'] as const;
  eventNames.forEach((eventName) => window.addEventListener(eventName, handler, { passive: true, capture: true }));

  return () => {
    eventNames.forEach((eventName) => window.removeEventListener(eventName, handler, { capture: true }));
  };
}

function defaultObserveLongTasks(handler: (sample: LongTaskSample) => void) {
  if (typeof PerformanceObserver === 'undefined') return () => {};

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        handler({ durationMs: entry.duration });
      });
    });
    observer.observe({ type: 'longtask', buffered: true });
    return () => observer.disconnect();
  } catch {
    return () => {};
  }
}

export function runFrameBudgetProbe(options: FrameBudgetProbeOptions = {}): Promise<FrameBudgetProbeResult> {
  const durationMs = options.durationMs ?? 2_000;
  const now = options.now ?? defaultNow;
  const requestFrame = options.requestAnimationFrame ?? window.requestAnimationFrame.bind(window);
  const cancelFrame = options.cancelAnimationFrame ?? window.cancelAnimationFrame.bind(window);
  const addInputListeners = options.addInputListeners ?? defaultAddInputListeners;
  const observeLongTasks = options.observeLongTasks ?? defaultObserveLongTasks;

  const samples: FrameBudgetSample[] = [];
  const longTasks: LongTaskSample[] = [];
  const inputFeedback: InputFeedbackSample[] = [];
  const startedAt = now();
  let lastFrameAt = startedAt;
  let frameHandle = 0;

  const onInput = () => {
    const inputAt = now();
    requestFrame(() => {
      inputFeedback.push({ durationMs: now() - inputAt });
    });
  };

  const cleanupInput = addInputListeners(onInput);
  const cleanupLongTasks = observeLongTasks((sample) => longTasks.push(sample));

  return new Promise((resolve) => {
    const step: FrameRequestCallback = (timestamp) => {
      samples.push({ deltaMs: timestamp - lastFrameAt });
      lastFrameAt = timestamp;

      if (timestamp - startedAt >= durationMs) {
        cleanupInput();
        cleanupLongTasks();
        cancelFrame(frameHandle);
        resolve({
          report: summarizeFrameBudget(samples, longTasks, inputFeedback),
          samples,
          longTasks,
          inputFeedback,
        });
        return;
      }

      frameHandle = requestFrame(step);
    };

    frameHandle = requestFrame(step);
  });
}
