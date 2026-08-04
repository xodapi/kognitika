import { describe, expect, it } from 'vitest';
import { EventClassifications, EventRegistry } from '../core/events/event-schema';

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

  it('validates compatibility-only mistake, hit, and miss payloads', () => {
    expect(EventRegistry.MISTAKE_MADE.safeParse({ expected: 1, actual: 2 }).success).toBe(true);
    expect(EventRegistry.MISTAKE_MADE.safeParse({ expected: null, actual: 2 }).success).toBe(false);
    expect(EventRegistry.HIT.safeParse({ module: 'decryptor', xp: 100 }).success).toBe(true);
    expect(EventRegistry.HIT.safeParse({ module: 'decryptor' }).success).toBe(false);
    expect(EventRegistry.MISS.safeParse({ module: 'decryptor' }).success).toBe(true);
  });

  it('classifies every EventBus message and reserves durable analytics for its canonical contract', () => {
    expect(Object.keys(EventClassifications).sort()).toEqual(Object.keys(EventRegistry).sort());
    expect(EventClassifications['game:completed']).toBe('server-domain');
    expect(EventClassifications.TRAINING_COMPLETE).toBe('ui-local');
    expect(Object.values(EventClassifications)).not.toContain('durable-analytics');
  });
});
