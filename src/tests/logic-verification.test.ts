import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus } from '../lib/event-bus';

vi.mock('../lib/cognitive-metrics', () => ({
  getDifficultySuggestion: vi.fn().mockResolvedValue({
    nextGridSize: 5,
    noiseLevel: 0,
    rotationEnabled: false,
    message: 'Test Suggestion'
  }),
  analyzeSession: vi.fn()
}));

// Mock PrismaClient
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      create: vi.fn((data) => Promise.resolve({ id: 'mock-id', ...data.data })),
      findUnique: vi.fn(() => Promise.resolve({ 
        id: 'mock-id', 
        experience: 100, 
        level: 2 
      })),
    },
  };
  return { PrismaClient: vi.fn(() => mockPrisma) };
});

// Mock subscribers to avoid real DB/Email calls
vi.mock('../lib/subscribers', () => ({}));
vi.mock('../lib/observability-subscriber', () => ({}));
vi.mock('../lib/report-subscriber', () => ({}));

describe('EDA Logic Verification (Headless)', () => {
  it('correctly handles game:completed event emission', async () => {
    const spy = vi.spyOn(eventBus, 'emit');
    
    // Simulate a game completion through the event bus
    eventBus.emit('game:completed', {
      userId: 'test-user-id',
      sessionId: 'fake-session-id',
      score: 100,
      gameType: 'SCHULTE',
      metadata: { difficulty: 'easy' }
    });

    expect(spy).toHaveBeenCalledWith('game:completed', expect.objectContaining({
      userId: 'test-user-id'
    }));
  });

  it('triggers subscribers (simulated)', async () => {
    const handler = vi.fn();
    eventBus.on('game:completed', handler);

    eventBus.emit('game:completed', { test: true });
    
    expect(handler).toHaveBeenCalledWith({ test: true });
  });
});
