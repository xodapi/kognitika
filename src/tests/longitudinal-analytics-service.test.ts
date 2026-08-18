import { describe, expect, it, vi } from 'vitest';
import { LongitudinalAnalyticsService } from '../server/services/analytics/longitudinal-analytics.ts';
import type { LongitudinalObservationRepository } from '../server/repositories/longitudinal-observation-repository.ts';

describe('longitudinal analytics service', () => {
  it('uses a 90-day range and maps repository rows to identity-free observations', async () => {
    const findLongitudinalObservations = vi.fn<LongitudinalObservationRepository['findLongitudinalObservations']>()
      .mockResolvedValue([
        { sourceSessionId: 'session-a', occurredAt: new Date('2026-08-19T12:00:00.000Z'), accuracy: 0.8, reactionMs: 200 },
        { sourceSessionId: 'session-b', occurredAt: new Date('2026-08-18T12:00:00.000Z'), accuracy: 0.9, reactionMs: 180 },
        { sourceSessionId: 'session-c', occurredAt: new Date('2026-08-17T12:00:00.000Z'), accuracy: 1, reactionMs: 160 },
      ]);
    const asOf = new Date('2026-08-20T12:00:00.000Z');
    const service = new LongitudinalAnalyticsService({ findLongitudinalObservations }, () => asOf);

    const result = await service.getLongitudinalAnalytics('user-private', 'nback');

    expect(findLongitudinalObservations).toHaveBeenCalledWith(
      'user-private', 'nback', new Date('2026-05-22T12:00:00.000Z'), asOf,
    );
    expect(result.windows[0]).toMatchObject({
      status: 'ready',
      sessionCount: 3,
      accuracy: { mean: 0.9 },
      speed: { meanReactionMs: 180 },
    });
    expect(JSON.stringify(result)).not.toContain('session-a');
    expect(JSON.stringify(result)).not.toContain('user-private');
  });
});
