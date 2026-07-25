import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eventBus } from '../lib/event-bus';
import { useSchulte90Engine } from '../hooks/useSchulte90Engine';
import {
  computeSchulte90Score,
  generateSchulte90Grid,
  generateSchulte90Sequence,
  generateGorbov90Table,
  GORBOV_RULES,
  SCHULTE_90_COLS,
  SCHULTE_90_ROWS,
  SCHULTE_90_TOTAL,
} from '../lib/schulte90-generator';
import { computeServerScore } from '../server/services/game-score';

describe('Schulte 1-90', () => {
  let perfTime = 1000;
  let frameId = 0;

  beforeEach(() => {
    perfTime = 1000;
    frameId = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => perfTime);
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => ++frameId));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('generator', () => {
    it('creates a deterministic 9x10 permutation of 1..90', () => {
      const first = generateSchulte90Grid(42);
      const second = generateSchulte90Grid(42);
      const numbers = first.map((cell) => cell.num).sort((a, b) => a - b);

      expect(SCHULTE_90_ROWS * SCHULTE_90_COLS).toBe(SCHULTE_90_TOTAL);
      expect(first).toHaveLength(90);
      expect(first).toEqual(second);
      expect(numbers).toEqual(Array.from({ length: 90 }, (_, index) => index + 1));
      expect(new Set(first.map((cell) => cell.id)).size).toBe(90);
      expect(first.every((cell) => cell.color === 'black')).toBe(true);
    });

    it('creates the ascending expected sequence', () => {
      const sequence = generateSchulte90Sequence();
      expect(sequence.map((cell) => cell.num)).toEqual(
        Array.from({ length: 90 }, (_, index) => index + 1),
      );
    });

    it.each(GORBOV_RULES)('generates the $id color sequence', (rule) => {
      const table = generateGorbov90Table(rule.id, 42);
      expect(table.grid).toHaveLength(SCHULTE_90_TOTAL);
      expect(table.sequence).toHaveLength(SCHULTE_90_TOTAL);
      expect(table.grid.map((cell) => cell.num).sort((a, b) => a - b)).toEqual(
        Array.from({ length: SCHULTE_90_TOTAL }, (_, index) => index + 1),
      );
      const expectedColors = Array.from({ length: SCHULTE_90_TOTAL }, (_, index) => {
        const groupSize = rule.id.endsWith('pairs') ? 2 : 1;
        const startsRed = rule.id.startsWith('red');
        return (Math.floor(index / groupSize) + (startsRed ? 1 : 0)) % 2 === 1 ? 'red' : 'black';
      });
      expect(table.sequence.map((cell) => cell.color)).toEqual(expectedColors);
      expect(table.grid.find((cell) => cell.num === 1)?.color).toBe(table.sequence[0].color);
      expect(table.grid.find((cell) => cell.num === 90)?.color).toBe(table.sequence[89].color);
    });

    it('matches the authoritative server score inputs', () => {
      const timeMs = 120000;
      const errors = 2;
      const accuracy = (SCHULTE_90_TOTAL / (SCHULTE_90_TOTAL + errors)) * 100;

      expect(computeSchulte90Score(timeMs, errors)).toBe(
        computeServerScore({
          gameType: 'SCHULTE_90',
          timeMs,
          metadata: {
            size: SCHULTE_90_COLS,
            accuracy,
            errors,
          },
        }),
      );
    });
  });

  describe('engine', () => {
    it('does not advance twice for a repeated batched click', () => {
      const { result } = renderHook(() => useSchulte90Engine());
      act(() => result.current.startGame(42));
      const first = result.current.state.grid.find((cell) => cell.num === 1)!;

      act(() => {
        result.current.clickCell(first, 0);
        result.current.clickCell(first, 0);
      });

      expect(result.current.state.expectedIndex).toBe(1);
      expect(result.current.state.errors).toBe(1);
      expect(result.current.state.clickHistory).toHaveLength(1);
    });

    it('rejects an impossible color-number click in a Gorbov mode', () => {
      const { result } = renderHook(() => useSchulte90Engine());
      act(() => result.current.startGame('red-black', 42));
      const first = result.current.state.grid.find((cell) => cell.num === 1)!;
      const impossible = { ...first, color: first.color === 'red' ? 'black' : 'red' } as typeof first;

      act(() => result.current.clickCell(impossible, 0));

      expect(result.current.state.expectedIndex).toBe(0);
      expect(result.current.state.errors).toBe(1);

      act(() => result.current.clickCell(first, 0));
      expect(result.current.state.expectedIndex).toBe(1);
    });

    it('accepts sequential batched clicks in order', () => {
      const { result } = renderHook(() => useSchulte90Engine());
      act(() => result.current.startGame(42));
      const first = result.current.state.grid.find((cell) => cell.num === 1)!;
      const second = result.current.state.grid.find((cell) => cell.num === 2)!;

      act(() => {
        result.current.clickCell(first, 0);
        result.current.clickCell(second, 1);
      });

      expect(result.current.state.expectedIndex).toBe(2);
      expect(result.current.state.errors).toBe(0);
      expect(result.current.state.clickHistory.map((click) => click.num)).toEqual([1, 2]);
    });

    it('marks an early stop as incomplete without emitting completion', () => {
      const completeSpy = vi.fn();
      const unsubscribe = eventBus.on('TRAINING_COMPLETE', completeSpy);
      const { result } = renderHook(() => useSchulte90Engine());
      act(() => result.current.startGame(42));

      perfTime += 5000;
      act(() => result.current.stopGame());

      expect(result.current.state.outcome).toBe('aborted');
      expect(result.current.state.isFinished).toBe(true);
      expect(completeSpy).not.toHaveBeenCalled();
      unsubscribe();
    });

    it('completes all 90 cells exactly once', () => {
      const completeSpy = vi.fn();
      const unsubscribe = eventBus.on('TRAINING_COMPLETE', completeSpy);
      const { result } = renderHook(() => useSchulte90Engine());
      act(() => result.current.startGame(42));

      for (let num = 1; num <= SCHULTE_90_TOTAL; num += 1) {
        perfTime += 100;
        const cell = result.current.state.grid.find((candidate) => candidate.num === num)!;
        act(() => result.current.clickCell(cell, result.current.state.grid.indexOf(cell)));
      }

      expect(result.current.state.outcome).toBe('completed');
      expect(result.current.state.expectedIndex).toBe(90);
      expect(completeSpy).toHaveBeenCalledTimes(1);
      expect(completeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SCHULTE_90',
          errors: 0,
          metadata: expect.objectContaining({ rule: 'classic' }),
        }),
      );
      unsubscribe();
    });
  });
});
