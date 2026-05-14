import { describe, it, expect } from 'vitest';
import { magicLinkSchema, loginSchema, registerSchema } from '../server/schemas/auth.ts';
import { saveGameSchema } from '../server/schemas/game.ts';

describe('API Validation Schemas', () => {
  describe('Auth Schemas', () => {
    it('magicLinkSchema должен требовать корректный email', () => {
      const invalid = magicLinkSchema.safeParse({ email: 'invalid-email' });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        // Тестируем то самое свойство .issues, из-за которого была ошибка
        expect(invalid.error.issues[0].message).toBe('Некорректный email');
      }

      const valid = magicLinkSchema.safeParse({ email: 'test@example.com' });
      expect(valid.success).toBe(true);
    });

    it('loginSchema должен проверять длину пароля', () => {
      const invalid = loginSchema.safeParse({ email: 'test@example.com', password: '123' });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0].message).toBe('Пароль должен быть не менее 6 символов');
      }
    });

    it('registerSchema должен проверять имя', () => {
      const invalid = registerSchema.safeParse({ 
        email: 'test@example.com', 
        password: 'password123',
        name: 'a' 
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.issues[0].message).toBe('Имя должно быть не менее 2 символов');
      }
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
        score: 100,
        metadata: { size: 5 }
      });
      expect(valid.success).toBe(true);
    });
  });
});
