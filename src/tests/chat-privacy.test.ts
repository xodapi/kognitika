import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/prisma', () => ({ default: {} }));

process.env.JWT_SECRET = 'synthetic-chat-privacy-secret-with-32-characters';

const { publicChatSenderId } = await import('../server/routes/chat');

describe('public chat sender identity', () => {
  it('does not expose the internal database user id', () => {
    const internalId = 'user_synthetic_internal_123';
    const senderId = publicChatSenderId(internalId);

    expect(senderId).not.toBe(internalId);
    expect(senderId).not.toContain(internalId);
    expect(senderId).toHaveLength(22);
  });

  it('is deterministic per user and distinct between users', () => {
    expect(publicChatSenderId('user-one')).toBe(publicChatSenderId('user-one'));
    expect(publicChatSenderId('user-one')).not.toBe(publicChatSenderId('user-two'));
  });
});
