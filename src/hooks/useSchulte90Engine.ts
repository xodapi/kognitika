import { useState, useCallback, useRef, useEffect } from 'react';
import { emitEvent } from './useEventBus';
import type { CellValue } from './useSchulteEngine';
import { generateSchulte90Grid, generateSchulte90Sequence, SCHULTE_90_ROWS, SCHULTE_90_COLS, SCHULTE_90_TOTAL } from '../lib/schulte90-generator';

export interface Schulte90State {
  grid: CellValue[];
  expectedSequence: CellValue[];
  expectedIndex: number;
  timeMs: number;
  isActive: boolean;
  isFinished: boolean;
  errors: number;
  rows: number;
  cols: number;
  clickHistory: {
    num: number;
    color: string;
    timeMs: number;
    reactionTimeMs: number;
    cellId: number;
    gridIndex: number;
    x?: number;
    y?: number;
  }[];
}

const DEFAULT_STATE: Schulte90State = {
  grid: [],
  expectedSequence: [],
  expectedIndex: 0,
  timeMs: 0,
  isActive: false,
  isFinished: false,
  errors: 0,
  rows: SCHULTE_90_ROWS,
  cols: SCHULTE_90_COLS,
  clickHistory: [],
};

export function useSchulte90Engine() {
  const [state, setState] = useState<Schulte90State>(DEFAULT_STATE);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  const startGame = useCallback((seed?: number) => {
    const grid = generateSchulte90Grid(seed);
    const seq = generateSchulte90Sequence();

    setState({
      ...DEFAULT_STATE,
      grid,
      expectedSequence: seq,
      isActive: true,
    });

    startTimeRef.current = performance.now();
    if (timerRef.current) cancelAnimationFrame(timerRef.current);

    const updateTime = () => {
      setState((prev) => {
        if (!prev.isActive) return prev;
        return { ...prev, timeMs: Math.floor(performance.now() - startTimeRef.current) };
      });
      timerRef.current = requestAnimationFrame(updateTime);
    };
    timerRef.current = requestAnimationFrame(updateTime);
  }, []);

  const stopGame = useCallback(() => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    setState((s) => ({ ...s, isActive: false, isFinished: true }));
  }, []);

  const resetGame = useCallback(() => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    setState(DEFAULT_STATE);
  }, []);

  const clickCell = useCallback(
    (
      cell: CellValue,
      gridIndex: number,
      coords?: { x: number; y: number },
      onSuccess?: () => void,
      onError?: () => void
    ) => {
      if (!state.isActive) return;

      const expected = state.expectedSequence[state.expectedIndex];
      if (!expected) return;

      const isMatch = cell.num === expected.num;
      const currentTime = Math.floor(performance.now() - startTimeRef.current);
      const lastClickTime =
        state.clickHistory.length > 0
          ? state.clickHistory[state.clickHistory.length - 1].timeMs
          : 0;
      const reactionTimeMs = currentTime - lastClickTime;

      emitEvent('CELL_CLICK', {
        num: cell.num,
        color: cell.color,
        cellId: cell.id,
        gridIndex,
        reactionTimeMs,
        isCorrect: isMatch,
        x: coords?.x,
        y: coords?.y,
      });

      if (isMatch) {
        onSuccess?.();
        setState((s) => {
          const nextIndex = s.expectedIndex + 1;
          const isDone = nextIndex >= s.expectedSequence.length;
          const t = Math.floor(performance.now() - startTimeRef.current);
          const last = s.clickHistory.length > 0 ? s.clickHistory[s.clickHistory.length - 1].timeMs : 0;

          const newHistory = [
            ...s.clickHistory,
            {
              num: cell.num,
              color: cell.color,
              timeMs: t,
              reactionTimeMs: t - last,
              cellId: cell.id,
              gridIndex,
              x: coords?.x,
              y: coords?.y,
            },
          ];

          if (isDone) {
            if (timerRef.current) cancelAnimationFrame(timerRef.current);

            emitEvent('TRAINING_COMPLETE', {
              type: 'SCHULTE_90',
              size: 9,
              timeMs: t,
              accuracy: (s.expectedSequence.length / (s.expectedSequence.length + s.errors)) * 100,
              score: Math.max(0, 1000 - Math.floor(t / 10)),
              errors: s.errors,
              metadata: { rows: SCHULTE_90_ROWS, cols: SCHULTE_90_COLS },
            });

            return {
              ...s,
              expectedIndex: nextIndex,
              isActive: false,
              isFinished: true,
              timeMs: t,
              clickHistory: newHistory,
            };
          }
          return { ...s, expectedIndex: nextIndex, clickHistory: newHistory };
        });
      } else {
        onError?.();
        emitEvent('MISTAKE_MADE', {
          expected: expected.num,
          actual: cell.num,
          cellId: cell.id,
        });
        setState((s) => ({ ...s, errors: s.errors + 1 }));
      }
    },
    [state.isActive, state.expectedIndex, state.expectedSequence, state.clickHistory]
  );

  return { state, startGame, stopGame, resetGame, clickCell };
}
