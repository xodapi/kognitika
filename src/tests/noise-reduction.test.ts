import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useNoiseReductionEngine } from '../hooks/useNoiseReductionEngine';

describe('useNoiseReductionEngine', () => {
  it('initializes in ready state', () => {
    const { result } = renderHook(() => useNoiseReductionEngine());
    expect(result.current.state.phase).toBe('ready');
    expect(result.current.state.score).toBe(0);
  });

  it('starts training correctly', () => {
    const { result } = renderHook(() => useNoiseReductionEngine());
    act(() => {
      result.current.startGame(1);
    });
    expect(result.current.state.phase).toBe('training');
    expect(result.current.state.level).toBe(1);
  });
});
