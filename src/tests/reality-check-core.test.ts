import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRealityCheckEngine } from '../hooks/useRealityCheckEngine';
import { eventBus } from '../lib/event-bus';

vi.mock('../lib/cognitive-metrics', () => ({
  getSemanticConsistency: vi.fn().mockResolvedValue({ detectionAccuracy: 0.9, cognitiveVigilance: 0.8 })
}));

describe('Reality Check Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('должен загружать сессию при старте', () => {
    const { result } = renderHook(() => useRealityCheckEngine(1, 1));
    act(() => {
      result.current.startSession();
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.currentPair).toBeDefined();
    expect(result.current.pairsRemaining).toBeGreaterThan(0);
  });

  it('должен начислять очки за правильное определение галлюцинации', () => {
    const { result } = renderHook(() => useRealityCheckEngine(1, 1));
    act(() => {
      result.current.startSession();
    });

    const isHallucination = result.current.currentPair.isHallucination;
    
    act(() => {
      result.current.submitAnswer(isHallucination);
    });

    expect(result.current.score).toBe(100);
  });

  it('не должен начислять очки за неправильный ответ', () => {
    const { result } = renderHook(() => useRealityCheckEngine(1, 1));
    act(() => {
      result.current.startSession();
    });

    const isHallucination = result.current.currentPair.isHallucination;
    
    act(() => {
      result.current.submitAnswer(!isHallucination);
    });

    expect(result.current.score).toBe(0);
  });

  it('должен переходить к следующей паре после ответа', () => {
    const { result } = renderHook(() => useRealityCheckEngine(1, 1));
    act(() => {
      result.current.startSession();
    });

    const initialPair = result.current.currentPair;
    
    act(() => {
      result.current.submitAnswer(true);
    });

    expect(result.current.currentPair).not.toBe(initialPair);
  });
});
