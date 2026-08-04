import { describe, expect, it } from 'vitest';
import { EventRegistry } from '../core/events/event-schema';

describe('server EventBus contract schemas', () => {
  it('rejects an unstructured game completion event', () => {
    expect(EventRegistry['game:completed'].safeParse({ test: true }).success).toBe(false);
  });

  it('accepts the minimal post-persistence game completion event', () => {
    expect(EventRegistry['game:completed'].safeParse({
      userId: 'synthetic-user',
      sessionId: 'synthetic-session',
      score: 10,
      gameType: 'STROOP',
    }).success).toBe(true);
  });

  it('requires a bounded error message and numeric score updates', () => {
    expect(EventRegistry.error.safeParse({}).success).toBe(false);
    expect(EventRegistry.SCORE_UPDATE.safeParse({ points: 100 }).success).toBe(true);
    expect(EventRegistry.SCORE_UPDATE.safeParse({ points: '100' }).success).toBe(false);
  });
});
