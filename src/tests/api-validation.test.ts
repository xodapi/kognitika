import { describe, it, expect } from 'vitest';
import { resumeSchema } from '../server/schemas/auth.ts';
import { saveGameSchema } from '../server/schemas/game.ts';
import { computeServerScore } from '../server/services/game-score.ts';

describe('API Validation Schemas', () => {
  describe('Auth Schemas', () => {
    it('resumeSchema должен требовать Brain ID', () => {
      const invalid = resumeSchema.safeParse({ brainId: '' });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0].message).toBe('ID сессии обязателен');
      }

      const valid = resumeSchema.safeParse({ brainId: 'BR-SYNTHETIC-001' });
      expect(valid.success).toBe(true);
    });
  });

  describe('Game Schemas', () => {
    it('saveGameSchema должен требовать gameType', () => {
      const invalid = saveGameSchema.safeParse({ timeMs: 1000 });
      expect(invalid.success).toBe(false);
    });

    it('saveGameSchema должен принимать корректные данные', () => {
      const valid = saveGameSchema.safeParse({ 
        gameType: 'SCHULTE',
        timeMs: 5000,
        metadata: { size: 5 }
      });
      expect(valid.success).toBe(true);
    });

    it('saveGameSchema должен отклонять client-side score на верхнем уровне', () => {
      const invalid = saveGameSchema.safeParse({
        gameType: 'SCHULTE',
        timeMs: 5000,
        score: 999999,
        metadata: { size: 5 }
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('Game Score Contract', () => {
    it('computeServerScore ограничивает результат и не принимает готовый client score', () => {
      const score = computeServerScore({
        gameType: 'SCHULTE',
        timeMs: 5000,
        metadata: { score: 999999, size: 5, errors: 1 },
      });

      expect(score).toBeGreaterThanOrEqual(10);
      expect(score).toBeLessThanOrEqual(1000);
      expect(score).not.toBe(999999);
    });
  });
});
