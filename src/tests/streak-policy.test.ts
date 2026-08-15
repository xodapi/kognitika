import { describe, expect, it } from 'vitest';
import { StreakPolicy } from '../server/services/game-save/streak-policy.ts';

const policy = new StreakPolicy();
const now = new Date(2026, 7, 12, 12);

describe('StreakPolicy', () => {
  it('starts a streak on the first completed game', () => {
    expect(policy.nextStreak({ lastPlayedAt: null, streakDays: 0 }, now)).toBe(1);
  });

  it('keeps a streak for another game on the same calendar day', () => {
    expect(policy.nextStreak({
      lastPlayedAt: new Date(2026, 7, 12, 1),
      streakDays: 4,
    }, now)).toBe(4);
  });

  it('increments a streak on the next calendar day', () => {
    expect(policy.nextStreak({
      lastPlayedAt: new Date(2026, 7, 11, 23),
      streakDays: 4,
    }, now)).toBe(5);
  });

  it('resets a streak after a missed calendar day', () => {
    expect(policy.nextStreak({
      lastPlayedAt: new Date(2026, 7, 10, 23),
      streakDays: 4,
    }, now)).toBe(1);
  });
});
