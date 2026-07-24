import { useState, useCallback, useRef, useEffect } from 'react';
import { emitEvent } from './useEventBus';
import type { CellValue } from './useSchulteEngine';
import {
  computeSchulte90Score,
  generateSchulte90Grid,
  generateSchulte90Sequence,
  SCHULTE_90_ROWS,
  SCHULTE_90_COLS,
} from '../lib/schulte90-generator';

export type Schulte90Outcome = 'idle' | 'active' | 'completed' | 'aborted' | 'timed_out';

export interface Schulte90State {
  grid: CellValue[];
  expectedSequence: CellValue[];
  expectedIndex: number;
  timeMs: number;
  isActive: boolean;
  isFinished: boolean;
  outcome: Schulte90Outcome;
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
  outcome: 'idle',
  errors: 0,
  rows: SCHULTE_90_ROWS,
  cols: SCHULTE_90_COLS,
  clickHistory: [],
};

export function useSchulte90Engine() {
  const [state, setState] = useState<Schulte90State>(DEFAULT_STATE);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const activeRef = useRef(false);
  const expectedIndexRef = useRef(0);
  const errorsRef = useRef(0);
  const lastClickTimeRef = useRef(0);
  const sequenceRef = useRef<CellValue[]>([]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  const startGame = useCallback((seed?: number) => {
    const grid = generateSchulte90Grid(seed);
    const seq = generateSchulte90Sequence();
    activeRef.current = true;
    expectedIndexRef.current = 0;
    errorsRef.current = 0;
    lastClickTimeRef.current = 0;
    sequenceRef.current = seq;

    setState({
      ...DEFAULT_STATE,
      grid,
      expectedSequence: seq,
      isActive: true,
      outcome: 'active',
    });

    startTimeRef.current = performance.now();
    if (timerRef.current) cancelAnimationFrame(timerRef.current);

    const updateTime = () => {
      if (!activeRef.current) return;
      setState((prev) => ({
        ...prev,
        timeMs: Math.floor(performance.now() - startTimeRef.current),
      }));
      timerRef.current = requestAnimationFrame(updateTime);
    };
    timerRef.current = requestAnimationFrame(updateTime);
  }, []);

  const stopGame = useCallback((outcome: 'aborted' | 'timed_out' = 'aborted') => {
    activeRef.current = false;
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    setState((s) => ({
      ...s,
      isActive: false,
      isFinished: true,
      outcome,
      timeMs: Math.floor(performance.now() - startTimeRef.current),
    }));
  }, []);

  const resetGame = useCallback(() => {
    activeRef.current = false;
    expectedIndexRef.current = 0;
    errorsRef.current = 0;
    lastClickTimeRef.current = 0;
    sequenceRef.current = [];
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
      if (!activeRef.current) return;

      const expected = sequenceRef.current[expectedIndexRef.current];
      if (!expected) return;

      const isMatch = cell.num === expected.num;
      const currentTime = Math.floor(performance.now() - startTimeRef.current);
      const reactionTimeMs = currentTime - lastClickTimeRef.current;

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
        expectedIndexRef.current += 1;
        lastClickTimeRef.current = currentTime;
        const nextIndex = expectedIndexRef.current;
        const isDone = nextIndex >= sequenceRef.current.length;

        if (isDone) {
          activeRef.current = false;
          if (timerRef.current) cancelAnimationFrame(timerRef.current);
          const errors = errorsRef.current;
          const accuracy = (sequenceRef.current.length / (sequenceRef.current.length + errors)) * 100;

          emitEvent('TRAINING_COMPLETE', {
            type: 'SCHULTE_90',
            timeMs: currentTime,
            accuracy,
            score: computeSchulte90Score(currentTime, errors),
            errors,
            metadata: {
              rows: SCHULTE_90_ROWS,
              cols: SCHULTE_90_COLS,
              size: SCHULTE_90_COLS,
              totalQuestions: sequenceRef.current.length,
            },
          });
        }

        setState((s) => {
          const newHistory = [
            ...s.clickHistory,
            {
              num: cell.num,
              color: cell.color,
              timeMs: currentTime,
              reactionTimeMs,
              cellId: cell.id,
              gridIndex,
              x: coords?.x,
              y: coords?.y,
            },
          ];

          if (isDone) {
            return {
              ...s,
              expectedIndex: nextIndex,
              isActive: false,
              isFinished: true,
              outcome: 'completed',
              timeMs: currentTime,
              clickHistory: newHistory,
            };
          }
          return { ...s, expectedIndex: nextIndex, clickHistory: newHistory };
        });
      } else {
        onError?.();
        errorsRef.current += 1;
        emitEvent('MISTAKE_MADE', {
          expected: expected.num,
          actual: cell.num,
          cellId: cell.id,
        });
        setState((s) => ({ ...s, errors: s.errors + 1 }));
      }
    },
    []
  );

  return { state, startGame, stopGame, resetGame, clickCell };
}
