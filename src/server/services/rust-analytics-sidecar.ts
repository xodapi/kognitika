import {
  AnalyzeSessionInputSchema,
  AnalyzeSessionOutputSchema,
  type AnalyzeSessionInput,
  type AnalyzeSessionOutput,
} from '../../core/analyze-session/index.ts';

export const RUST_ANALYTICS_SIDECAR_CONTRACT_VERSION = 'analyze-session-v1' as const;

export type RustAnalyticsShadowErrorCode =
  | 'sidecar_timeout'
  | 'sidecar_unavailable'
  | 'sidecar_rejected'
  | 'sidecar_invalid_response';

export class RustAnalyticsSidecarError extends Error {
  constructor(readonly code: RustAnalyticsShadowErrorCode) {
    super(code);
  }
}

export interface RustAnalyticsSidecarMetrics {
  requests: number;
  matched: number;
  mismatched: number;
  failures: Record<RustAnalyticsShadowErrorCode, number>;
}

export interface RustAnalyticsSidecarOptions {
  baseUrl: string;
  timeoutMs: number;
  rolloutPercent?: number;
  fetchImpl?: typeof fetch;
}

export interface RustAnalyticsCanaryThresholds {
  minRequests: number;
  maxMismatchRate: number;
  maxTimeoutRate: number;
  maxOutboxLagMs: number;
  maxDeadLetters: number;
}

export const DEFAULT_RUST_ANALYTICS_CANARY_THRESHOLDS: RustAnalyticsCanaryThresholds = {
  minRequests: 100,
  maxMismatchRate: 0.01,
  maxTimeoutRate: 0.02,
  maxOutboxLagMs: 60_000,
  maxDeadLetters: 0,
};

export type RustAnalyticsCanaryDecision =
  | { eligible: false; reason: 'insufficient_samples' | 'mismatch_rate' | 'timeout_rate' | 'outbox_lag' | 'dead_letters' }
  | { eligible: true };

function freshMetrics(): RustAnalyticsSidecarMetrics {
  return {
    requests: 0,
    matched: 0,
    mismatched: 0,
    failures: {
      sidecar_timeout: 0,
      sidecar_unavailable: 0,
      sidecar_rejected: 0,
      sidecar_invalid_response: 0,
    },
  };
}

function normalizedOutput(value: AnalyzeSessionOutput) {
  return JSON.stringify({
    ...value,
    recommendationSignals: [...value.recommendationSignals].sort(),
  });
}

function normalizedRolloutPercent(value: number | undefined) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.floor(value!)));
}

export function isRustAnalyticsShadowSelected(sourceSessionId: string, rolloutPercent: number) {
  const normalized = normalizedRolloutPercent(rolloutPercent);
  if (normalized === 0) return false;
  if (normalized === 100) return true;

  let hash = 0;
  for (let index = 0; index < sourceSessionId.length; index += 1) {
    hash = ((hash << 5) - hash + sourceSessionId.charCodeAt(index)) | 0;
  }
  return (hash >>> 0) % 100 < normalized;
}

export function evaluateRustAnalyticsCanary(
  metrics: RustAnalyticsSidecarMetrics,
  outbox: { oldestLagMs: number; dead: number },
  thresholds: RustAnalyticsCanaryThresholds = DEFAULT_RUST_ANALYTICS_CANARY_THRESHOLDS,
): RustAnalyticsCanaryDecision {
  if (metrics.requests < thresholds.minRequests) return { eligible: false, reason: 'insufficient_samples' };
  if (metrics.mismatched / metrics.requests > thresholds.maxMismatchRate) return { eligible: false, reason: 'mismatch_rate' };
  if (metrics.failures.sidecar_timeout / metrics.requests > thresholds.maxTimeoutRate) return { eligible: false, reason: 'timeout_rate' };
  if (outbox.oldestLagMs > thresholds.maxOutboxLagMs) return { eligible: false, reason: 'outbox_lag' };
  if (outbox.dead > thresholds.maxDeadLetters) return { eligible: false, reason: 'dead_letters' };
  return { eligible: true };
}

export class RustAnalyticsSidecarClient {
  private readonly fetchImpl: typeof fetch;
  private readonly metrics = freshMetrics();

  constructor(private readonly options: RustAnalyticsSidecarOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  shouldAnalyze(sourceSessionId: string) {
    return isRustAnalyticsShadowSelected(sourceSessionId, this.options.rolloutPercent ?? 0);
  }

  async analyze(input: AnalyzeSessionInput, typescriptOutput: AnalyzeSessionOutput): Promise<AnalyzeSessionOutput> {
    if (!AnalyzeSessionInputSchema.safeParse(input).success) {
      throw new RustAnalyticsSidecarError('sidecar_rejected');
    }

    this.metrics.requests += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.options.baseUrl.replace(/\/+$/, '')}/internal/v1/analyze-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Kognitika-Analytics-Contract': RUST_ANALYTICS_SIDECAR_CONTRACT_VERSION,
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      if (response.status === 400) throw new RustAnalyticsSidecarError('sidecar_rejected');
      if (!response.ok) throw new RustAnalyticsSidecarError('sidecar_unavailable');

      const parsed = AnalyzeSessionOutputSchema.safeParse(await response.json());
      if (!parsed.success) throw new RustAnalyticsSidecarError('sidecar_invalid_response');
      if (normalizedOutput(parsed.data) === normalizedOutput(typescriptOutput)) {
        this.metrics.matched += 1;
      } else {
        this.metrics.mismatched += 1;
      }
      return parsed.data;
    } catch (error) {
      const sidecarError = error instanceof RustAnalyticsSidecarError
        ? error
        : new RustAnalyticsSidecarError(
          typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
            ? 'sidecar_timeout'
            : 'sidecar_unavailable',
        );
      this.metrics.failures[sidecarError.code] += 1;
      throw sidecarError;
    } finally {
      clearTimeout(timeout);
    }
  }

  getMetrics(): RustAnalyticsSidecarMetrics {
    return structuredClone(this.metrics);
  }
}

export function isRustAnalyticsSidecarEnabled(environment: Record<string, string | undefined> = process.env): boolean {
  return environment.RUST_ANALYTICS_SIDECAR_ENABLED === 'true';
}

export function createRustAnalyticsSidecarClient(environment: Record<string, string | undefined> = process.env) {
  if (!isRustAnalyticsSidecarEnabled(environment)) return null;
  return new RustAnalyticsSidecarClient({
    baseUrl: environment.RUST_ANALYTICS_SIDECAR_URL || 'http://127.0.0.1:3010',
    timeoutMs: Number(environment.RUST_ANALYTICS_SIDECAR_TIMEOUT_MS) || 1_000,
    rolloutPercent: Number(environment.RUST_ANALYTICS_SIDECAR_ROLLOUT_PERCENT) || 0,
  });
}
