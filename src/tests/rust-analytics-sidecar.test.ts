import { describe, expect, it, vi } from 'vitest';
import { analyzeSession, syntheticCellClickSession } from '../core/analyze-session/index.ts';
import {
  DEFAULT_RUST_ANALYTICS_CANARY_THRESHOLDS,
  RustAnalyticsSidecarClient,
  RustAnalyticsSidecarError,
  evaluateRustAnalyticsCanary,
  isRustAnalyticsSidecarEnabled,
} from '../server/services/rust-analytics-sidecar.ts';

const input = syntheticCellClickSession;
const typescriptOutput = analyzeSession(input);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Rust analytics sidecar adapter', () => {
  it('is disabled unless explicitly opted in', () => {
    expect(isRustAnalyticsSidecarEnabled({})).toBe(false);
    expect(isRustAnalyticsSidecarEnabled({ RUST_ANALYTICS_SIDECAR_ENABLED: 'false' })).toBe(false);
    expect(isRustAnalyticsSidecarEnabled({ RUST_ANALYTICS_SIDECAR_ENABLED: 'true' })).toBe(true);
  });

  it('selects a stable, bounded percentage of source sessions for shadow delivery', () => {
    expect(isRustAnalyticsSidecarEnabled({ RUST_ANALYTICS_SIDECAR_ENABLED: 'true' })).toBe(true);
    const zero = new RustAnalyticsSidecarClient({ baseUrl: 'http://sidecar.internal', timeoutMs: 100, rolloutPercent: 0 });
    const all = new RustAnalyticsSidecarClient({ baseUrl: 'http://sidecar.internal', timeoutMs: 100, rolloutPercent: 100 });
    const partial = new RustAnalyticsSidecarClient({ baseUrl: 'http://sidecar.internal', timeoutMs: 100, rolloutPercent: 25 });

    expect(zero.shouldAnalyze('session-synthetic-a')).toBe(false);
    expect(all.shouldAnalyze('session-synthetic-a')).toBe(true);
    expect(partial.shouldAnalyze('session-synthetic-a')).toBe(partial.shouldAnalyze('session-synthetic-a'));
  });

  it('maps the versioned input, validates response, and records only aggregate parity', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(typescriptOutput));
    const client = new RustAnalyticsSidecarClient({
      baseUrl: 'http://sidecar.internal/', timeoutMs: 100, fetchImpl,
    });

    await expect(client.analyze(input, typescriptOutput)).resolves.toEqual(typescriptOutput);
    expect(fetchImpl).toHaveBeenCalledWith('http://sidecar.internal/internal/v1/analyze-session', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'X-Kognitika-Analytics-Contract': 'analyze-session-v1' }),
      body: JSON.stringify(input),
    }));
    expect(client.getMetrics()).toEqual({
      requests: 1,
      matched: 1,
      mismatched: 0,
      failures: {
        sidecar_timeout: 0,
        sidecar_unavailable: 0,
        sidecar_rejected: 0,
        sidecar_invalid_response: 0,
      },
    });
    expect(JSON.stringify(client.getMetrics())).not.toMatch(/sessionid|moduleid|event|brainid|email|token/i);
  });

  it('records mismatch without making Rust authoritative', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ...typescriptOutput, accuracy: 0.5 }));
    const client = new RustAnalyticsSidecarClient({ baseUrl: 'http://sidecar.internal', timeoutMs: 100, fetchImpl });

    await expect(client.analyze(input, typescriptOutput)).resolves.toMatchObject({ accuracy: 0.5 });
    expect(client.getMetrics()).toMatchObject({ requests: 1, matched: 0, mismatched: 1 });
  });

  it('holds canary promotion on any aggregate threshold breach', () => {
    const healthy = {
      requests: DEFAULT_RUST_ANALYTICS_CANARY_THRESHOLDS.minRequests,
      matched: DEFAULT_RUST_ANALYTICS_CANARY_THRESHOLDS.minRequests,
      mismatched: 0,
      failures: { sidecar_timeout: 0, sidecar_unavailable: 0, sidecar_rejected: 0, sidecar_invalid_response: 0 },
    };
    expect(evaluateRustAnalyticsCanary(healthy, { oldestLagMs: 0, dead: 0 })).toEqual({ eligible: true });
    expect(evaluateRustAnalyticsCanary({ ...healthy, mismatched: 2 }, { oldestLagMs: 0, dead: 0 })).toEqual({ eligible: false, reason: 'mismatch_rate' });
    expect(evaluateRustAnalyticsCanary(healthy, { oldestLagMs: 60_001, dead: 0 })).toEqual({ eligible: false, reason: 'outbox_lag' });
    expect(evaluateRustAnalyticsCanary(healthy, { oldestLagMs: 0, dead: 1 })).toEqual({ eligible: false, reason: 'dead_letters' });
  });

  it('maps rejection, malformed output, unavailable sidecar, and timeout to safe codes', async () => {
    const cases: Array<[() => Promise<Response>, string]> = [
      [() => Promise.resolve(jsonResponse({ error: 'invalid_payload' }, 400)), 'sidecar_rejected'],
      [() => Promise.resolve(jsonResponse({ unexpected: true })), 'sidecar_invalid_response'],
      [() => Promise.resolve(jsonResponse({ error: 'unavailable' }, 503)), 'sidecar_unavailable'],
      [() => Promise.reject({ name: 'AbortError' }), 'sidecar_timeout'],
    ];

    for (const [request, code] of cases) {
      const fetchImpl = vi.fn().mockImplementation(request);
      const client = new RustAnalyticsSidecarClient({ baseUrl: 'http://sidecar.internal', timeoutMs: 100, fetchImpl });
      await expect(client.analyze(input, typescriptOutput)).rejects.toMatchObject<RustAnalyticsSidecarError>({ code });
      expect(client.getMetrics().failures[code as keyof ReturnType<typeof client.getMetrics>['failures']]).toBe(1);
    }
  });
});
