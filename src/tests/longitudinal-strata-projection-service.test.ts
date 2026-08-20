import { describe, expect, it, vi } from 'vitest';
import { LongitudinalStrataProjectionService } from '../server/services/analytics/longitudinal-strata-projection.ts';

describe('LongitudinalStrataProjectionService', () => {
  it('returns identity-free quality aggregates grouped by explicit strata', async () => {
    const findLongitudinalStrataProjection = vi.fn().mockResolvedValue({
      exclusions: { strata_unknown_difficulty: 1 },
      rows: [
        {
          occurredAt: new Date('2026-08-19T12:00:00.000Z'),
          stratum: { moduleId: 'nback', moduleVersion: '1', difficulty: 'n-2', label: 'n-2' },
          completed: true, eventCount: 2, suspiciousPatternScore: 1, accuracy: 0.8, reactionMs: 200,
        },
      ],
    });
    const result = await new LongitudinalStrataProjectionService(
      { findLongitudinalStrataProjection },
      () => new Date('2026-08-20T12:00:00.000Z'),
    ).getProjection('user-private', 'nback');

    expect(findLongitudinalStrataProjection).toHaveBeenCalledWith(
      'user-private', 'nback', new Date('2026-05-22T12:00:00.000Z'), new Date('2026-08-20T12:00:00.000Z'),
    );
    expect(result).toMatchObject({
      version: 'longitudinal-strata-projection-v1',
      policyVersion: { strata: 'longitudinal-strata-policy-v1', quality: 'longitudinal-quality-policy-v1' },
      exclusions: { strata_unknown_difficulty: 1 },
      strata: [{ label: 'n-2' }],
    });
    expect(result.strata[0].analytics.windows[0].quality.eligibleCount).toBe(1);
    expect(JSON.stringify(result)).not.toMatch(/user-private|sessionId|jobId|payload|threshold/i);
  });
});
