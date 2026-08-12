import { describe, expect, it } from 'vitest';
import { ReplayResolver } from '../server/services/game-save/replay-resolver.ts';

const resolver = new ReplayResolver();
const input = {
  userId: 'user_replay',
  clientRunId: 'run_replay',
  gameType: 'SCHULTE',
  timeMs: 42_000,
  score: 999,
};

describe('ReplayResolver', () => {
  it('accepts an exact replay', () => {
    expect(() => resolver.assertReplayMatches({
      userId: input.userId,
      clientRunId: input.clientRunId,
      gameType: input.gameType,
      timeMs: input.timeMs,
      score: input.score,
    }, input, input.score)).not.toThrow();
  });

  it('rejects a replay with a changed persisted field', () => {
    try {
      resolver.assertReplayMatches({
        userId: input.userId,
        clientRunId: input.clientRunId,
        gameType: input.gameType,
        timeMs: input.timeMs,
        score: input.score,
      }, { ...input, timeMs: 42_001 }, input.score);
      throw new Error('Expected replay conflict');
    } catch (error) {
      expect(error).toMatchObject({ code: 'ATTEMPT_REPLAY_CONFLICT' });
    }
  });
});
