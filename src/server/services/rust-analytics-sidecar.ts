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
  fetchImpl?: typeof fetch;
}

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

export class RustAnalyticsSidecarClient {
  private readonly fetchImpl: typeof fetch;
  private readonly metrics = freshMetrics();

  constructor(private readonly options: RustAnalyticsSidecarOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
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
  });
}
