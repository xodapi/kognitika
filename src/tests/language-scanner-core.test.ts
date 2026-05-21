import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLanguageScannerEngine } from '../hooks/useLanguageScannerEngine';

// Mock the eventBus and cognitive metrics
vi.mock('../hooks/useEventBus', () => ({
  emitEvent: vi.fn()
}));

vi.mock('../lib/cognitive-metrics', () => ({
  getSemanticConsistency: vi.fn().mockResolvedValue({ cognitiveVigilance: 0.9, detectionAccuracy: 0.9 })
}));

describe('Language Scanner Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('должен инициализироваться в фазе memorize', () => {
    const { result } = renderHook(() => useLanguageScannerEngine());
    act(() => {
        result.current.startGame(1, 123);
    });
    expect(result.current.state.phase).toBe('memorize');
    expect(result.current.state.rules.length).toBeGreaterThan(0);
  });

  it('должен переходить в фазу scan и показывать карточки', () => {
    const { result } = renderHook(() => useLanguageScannerEngine());
    act(() => {
        result.current.startGame(1, 123);
    });
    
    act(() => {
      result.current.startScan();
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.state.phase).toBe('scan');
    expect(result.current.state.activeCard).not.toBeNull();
  });

  it('должен корректно обрабатывать флаг нарушения', () => {
    const { result } = renderHook(() => useLanguageScannerEngine());
    act(() => {
        result.current.startGame(1, 123);
    });
    act(() => {
        result.current.startScan();
        vi.advanceTimersByTime(0);
    });

    const activeCard = result.current.state.activeCard;
    if (activeCard) {
        const isViolation = activeCard.isViolation;
        const ruleRef = activeCard.ruleRef || 999;

        act(() => {
            result.current.flagCard(ruleRef);
        });

        if (isViolation) {
            expect(result.current.state.hits).toBe(1);
        } else {
            expect(result.current.state.falsePositives).toBe(1);
        }
        expect(result.current.state.lastFeedback).not.toBeNull();
    }
  });

  it('должен пропускать карточки', () => {
    const { result } = renderHook(() => useLanguageScannerEngine());
    act(() => {
        result.current.startGame(1, 123);
    });
    act(() => {
        result.current.startScan();
        vi.advanceTimersByTime(0);
    });

    const initialHits = result.current.state.hits;
    
    act(() => {
        result.current.skipCard();
    });

    expect(result.current.state.hits).toBe(initialHits);
  });
});
