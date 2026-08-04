import { useState, useCallback, useRef, useEffect } from 'react';
import { emitEvent } from './useEventBus';
import {
  CognitiveSessionEventCollector,
  type CompletedSessionAnalyticsJob,
} from '../core/cognitive-events';
import type { CellValue } from './useSchulteEngine';
import {
  computeSchulte90Score,
  generateSchulte90Grid,
  generateSchulte90Sequence,
  generateGorbov90Table,
  type GorbovRuleId,
  SCHULTE_90_ROWS,
  SCHULTE_90_COLS,
} from '../lib/schulte90-generator';

export type Schulte90Outcome = 'idle' | 'active' | 'completed' | 'aborted';

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
  rule: GorbovRuleId | 'classic';
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
  rule: 'classic',
};

export function useSchulte90Engine() {
  const [state, setState] = useState<Schulte90State>(DEFAULT_STATE);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const displayedTimeRef = useRef(0);
  const activeRef = useRef(false);
  const expectedIndexRef = useRef(0);
  const errorsRef = useRef(0);
  const lastClickTimeRef = useRef(0);
  const sequenceRef = useRef<CellValue[]>([]);
  const ruleRef = useRef<GorbovRuleId | 'classic'>('classic');
  const sessionStartedAtRef = useRef<string | null>(null);
  const collectorRef = useRef<CognitiveSessionEventCollector | null>(null);
  const completedAnalyticsJobRef = useRef<CompletedSessionAnalyticsJob | null>(null);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  const startGame = useCallback((ruleOrSeed: GorbovRuleId | 'classic' | number = 'classic', seed?: number) => {
    const rule = typeof ruleOrSeed === 'number' ? 'classic' : ruleOrSeed;
    const actualSeed = typeof ruleOrSeed === 'number' ? ruleOrSeed : seed;
    const gorbov = rule === 'classic' ? null : generateGorbov90Table(rule, actualSeed);
    const grid = gorbov?.grid ?? generateSchulte90Grid(actualSeed);
    const seq = gorbov?.sequence ?? generateSchulte90Sequence();
    activeRef.current = true;
    expectedIndexRef.current = 0;
    errorsRef.current = 0;
    lastClickTimeRef.current = 0;
    sequenceRef.current = seq;
    ruleRef.current = rule;
    displayedTimeRef.current = 0;
    const startedAt = new Date().toISOString();
    sessionStartedAtRef.current = startedAt;
    completedAnalyticsJobRef.current = null;
    collectorRef.current = new CognitiveSessionEventCollector({
      sessionId: `schulte-90-${Date.now()}-${rule}`,
      moduleId: 'schulte-90',
      moduleVersion: '1',
      category: 'cognitive',
      startedAt,
    });
    collectorRef.current.record({
      kind: 'trial_started',
      tMs: 0,
      trialType: 'schulte-90:cell-selection',
      difficulty: rule,
    });

    setState({
      ...DEFAULT_STATE,
      grid,
      expectedSequence: seq,
      isActive: true,
      outcome: 'active',
      rule,
    });

    startTimeRef.current = performance.now();
    if (timerRef.current) cancelAnimationFrame(timerRef.current);

    const updateTime = () => {
      if (!activeRef.current) return;
      const elapsed = Math.floor(performance.now() - startTimeRef.current);
      if (elapsed - displayedTimeRef.current >= 100) {
        displayedTimeRef.current = elapsed;
        setState((prev) => ({ ...prev, timeMs: elapsed }));
      }
      timerRef.current = requestAnimationFrame(updateTime);
    };
    timerRef.current = requestAnimationFrame(updateTime);
  }, []);

  const stopGame = useCallback(() => {
    activeRef.current = false;
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    setState((s) => ({
      ...s,
      isActive: false,
      isFinished: true,
      outcome: 'aborted',
      timeMs: Math.floor(performance.now() - startTimeRef.current),
    }));
  }, []);

  const resetGame = useCallback(() => {
    activeRef.current = false;
    expectedIndexRef.current = 0;
    errorsRef.current = 0;
    lastClickTimeRef.current = 0;
    sequenceRef.current = [];
    ruleRef.current = 'classic';
    displayedTimeRef.current = 0;
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

      const isMatch = cell.num === expected.num
        && (ruleRef.current === 'classic' || cell.color === expected.color);
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
      collectorRef.current?.record({
        kind: 'trial_answered',
        tMs: Math.max(0, currentTime),
        trialType: 'schulte-90:cell-selection',
        isCorrect: isMatch,
        ...(reactionTimeMs > 0 ? { reactionTimeMs } : {}),
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
          const collector = collectorRef.current;
          const startedAt = sessionStartedAtRef.current;
          if (collector && startedAt && !completedAnalyticsJobRef.current) {
            const completedAt = new Date(Date.parse(startedAt) + currentTime).toISOString();
            collector.complete(currentTime, completedAt);
            completedAnalyticsJobRef.current = collector.createCompletedJob(completedAt);
          }

          emitEvent('TRAINING_COMPLETE', {
            type: 'SCHULTE_90',
            timeMs: currentTime,
            accuracy,
            score: computeSchulte90Score(currentTime, errors),
            errors,
            metadata: {
              rule: ruleRef.current,
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

  const getCompletedAnalyticsJob = useCallback(() => completedAnalyticsJobRef.current, []);

  return { state, startGame, stopGame, resetGame, clickCell, getCompletedAnalyticsJob };
}
