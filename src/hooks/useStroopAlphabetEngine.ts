import { useCallback, useEffect, useRef, useState } from 'react';
import { emitEvent } from './useEventBus';
import {
  DEFAULT_STROOP_ALPHABET_COUNT,
  generateStroopAlphabetSet,
  type GeneratedStroopAlphabetSet,
} from '../lib/stroop-alphabet-generator';
import type { AlphabetAction } from '../lib/alphabet-table-generator';

export type StroopAlphabetPhase = 'color' | 'action';
export type StroopAlphabetOutcome = 'idle' | 'active' | 'completed' | 'aborted';

export interface StroopAlphabetState {
  items: GeneratedStroopAlphabetSet['items'];
  currentIndex: number;
  phase: StroopAlphabetPhase;
  colorErrors: number;
  actionErrors: number;
  timeMs: number;
  reactionTimeTotalMs: number;
  averageReactionTimeMs: number;
  isActive: boolean;
  isFinished: boolean;
  outcome: StroopAlphabetOutcome;
  questionCount: number;
}

const DEFAULT_STATE: StroopAlphabetState = {
  items: [],
  currentIndex: 0,
  phase: 'color',
  colorErrors: 0,
  actionErrors: 0,
  timeMs: 0,
  reactionTimeTotalMs: 0,
  averageReactionTimeMs: 0,
  isActive: false,
  isFinished: false,
  outcome: 'idle',
  questionCount: DEFAULT_STROOP_ALPHABET_COUNT,
};

export function useStroopAlphabetEngine() {
  const [state, setState] = useState(DEFAULT_STATE);
  const stateRef = useRef(state);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const promptStartTimeRef = useRef(0);
  const completionEmittedRef = useRef(false);

  const commitState = useCallback((nextState: StroopAlphabetState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  useEffect(() => () => {
    if (timerRef.current !== null) cancelAnimationFrame(timerRef.current);
  }, []);

  const startGame = useCallback((
    count = DEFAULT_STROOP_ALPHABET_COUNT,
    generatedSet?: GeneratedStroopAlphabetSet,
    seed?: number,
  ) => {
    const set = generatedSet ?? generateStroopAlphabetSet(count, seed);
    const startedAt = performance.now();
    completionEmittedRef.current = false;
    startTimeRef.current = startedAt;
    promptStartTimeRef.current = startedAt;
    if (timerRef.current !== null) cancelAnimationFrame(timerRef.current);

    commitState({
      ...DEFAULT_STATE,
      items: set.items,
      questionCount: set.items.length,
      isActive: true,
      outcome: 'active',
    });

    const updateTime = () => {
      const current = stateRef.current;
      if (!current.isActive) return;
      const timeMs = Math.floor(performance.now() - startTimeRef.current);
      if (timeMs - current.timeMs >= 50) commitState({ ...current, timeMs });
      timerRef.current = requestAnimationFrame(updateTime);
    };
    timerRef.current = requestAnimationFrame(updateTime);
  }, [commitState]);

  const stopGame = useCallback(() => {
    const current = stateRef.current;
    if (!current.isActive) return;
    if (timerRef.current !== null) cancelAnimationFrame(timerRef.current);
    commitState({
      ...current,
      isActive: false,
      isFinished: true,
      outcome: 'aborted',
      timeMs: Math.floor(performance.now() - startTimeRef.current),
    });
  }, [commitState]);

  const resetGame = useCallback(() => {
    completionEmittedRef.current = false;
    if (timerRef.current !== null) cancelAnimationFrame(timerRef.current);
    commitState(DEFAULT_STATE);
  }, [commitState]);

  const submitColor = useCallback((colorId: string) => {
    const current = stateRef.current;
    const item = current.items[current.currentIndex];
    if (!current.isActive || current.phase !== 'color' || !item) return;

    const now = performance.now();
    const reactionTimeMs = Math.max(0, Math.floor(now - promptStartTimeRef.current));
    const colorErrors = current.colorErrors + (colorId === item.wordColorId ? 0 : 1);
    const reactionTimeTotalMs = current.reactionTimeTotalMs + reactionTimeMs;
    const answerCount = current.currentIndex * 2 + 1;
    commitState({
      ...current,
      phase: 'action',
      colorErrors,
      reactionTimeTotalMs,
      averageReactionTimeMs: Math.round(reactionTimeTotalMs / answerCount),
      timeMs: Math.floor(now - startTimeRef.current),
    });
    promptStartTimeRef.current = now;
  }, [commitState]);

  const submitAction = useCallback((action: AlphabetAction) => {
    const current = stateRef.current;
    const item = current.items[current.currentIndex];
    if (!current.isActive || current.phase !== 'action' || !item) return;

    const now = performance.now();
    const reactionTimeMs = Math.max(0, Math.floor(now - promptStartTimeRef.current));
    const actionErrors = current.actionErrors + (action === item.action ? 0 : 1);
    const reactionTimeTotalMs = current.reactionTimeTotalMs + reactionTimeMs;
    const answerCount = current.currentIndex * 2 + 2;
    const nextIndex = current.currentIndex + 1;
    const isCompleted = nextIndex >= current.items.length;
    if (isCompleted && timerRef.current !== null) cancelAnimationFrame(timerRef.current);

    commitState({
      ...current,
      currentIndex: nextIndex,
      phase: 'color',
      actionErrors,
      reactionTimeTotalMs,
      averageReactionTimeMs: Math.round(reactionTimeTotalMs / answerCount),
      timeMs: Math.floor(now - startTimeRef.current),
      isActive: !isCompleted,
      isFinished: isCompleted,
      outcome: isCompleted ? 'completed' : 'active',
    });
    promptStartTimeRef.current = now;
  }, [commitState]);

  useEffect(() => {
    if (state.outcome !== 'completed' || completionEmittedRef.current) return;
    completionEmittedRef.current = true;
    const totalQuestions = state.items.length;
    const totalErrors = state.colorErrors + state.actionErrors;
    const accuracy = totalQuestions > 0
      ? ((totalQuestions * 2 - totalErrors) / (totalQuestions * 2)) * 100
      : 0;

    emitEvent('TRAINING_COMPLETE', {
      type: 'STROOP_ALPHABET',
      timeMs: state.timeMs,
      accuracy,
      errors: totalErrors,
      score: Math.round(accuracy * 10),
      metadata: {
        mode: 'stroop-alphabet',
        totalQuestions,
        colorErrors: state.colorErrors,
        actionErrors: state.actionErrors,
        averageReactionTimeMs: state.averageReactionTimeMs,
      },
    });
  }, [
    state.actionErrors,
    state.averageReactionTimeMs,
    state.colorErrors,
    state.items.length,
    state.outcome,
    state.timeMs,
  ]);

  return {
    state,
    startGame,
    stopGame,
    resetGame,
    submitColor,
    submitAction,
  };
}
