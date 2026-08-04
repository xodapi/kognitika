import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CognitiveSessionEventCollector,
  type CompletedSessionAnalyticsJob,
} from '../core/cognitive-events';
import {
  DEFAULT_ALPHABET_QUESTION_COUNT,
  generateAlphabetTable,
  type AlphabetAction,
  type AlphabetTablePreset,
  type GeneratedAlphabetTable,
} from '../lib/alphabet-table-generator';
import { emitEvent } from './useEventBus';

export type AlphabetTableOutcome = 'idle' | 'active' | 'completed' | 'aborted';

export interface AlphabetTableState {
  items: GeneratedAlphabetTable['items'];
  currentIndex: number;
  correctAnswers: number;
  errors: number;
  timeMs: number;
  reactionTimeTotalMs: number;
  averageReactionTimeMs: number;
  isActive: boolean;
  isFinished: boolean;
  outcome: AlphabetTableOutcome;
  preset: AlphabetTablePreset;
  questionCount: number;
}

const DEFAULT_STATE: AlphabetTableState = {
  items: [],
  currentIndex: 0,
  correctAnswers: 0,
  errors: 0,
  timeMs: 0,
  reactionTimeTotalMs: 0,
  averageReactionTimeMs: 0,
  isActive: false,
  isFinished: false,
  outcome: 'idle',
  preset: 'balanced',
  questionCount: DEFAULT_ALPHABET_QUESTION_COUNT,
};

export function useAlphabetTableEngine() {
  const [state, setState] = useState<AlphabetTableState>(DEFAULT_STATE);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const lastActionTimeRef = useRef(0);
  const displayedTimeRef = useRef(0);
  const activeRef = useRef(false);
  const sessionStartedAtRef = useRef<string | null>(null);
  const collectorRef = useRef<CognitiveSessionEventCollector | null>(null);
  const completedAnalyticsJobRef = useRef<CompletedSessionAnalyticsJob | null>(null);
  const completionEmittedRef = useRef(false);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (timerRef.current !== null) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  const startGame = useCallback((
    preset: AlphabetTablePreset = 'balanced',
    count = DEFAULT_ALPHABET_QUESTION_COUNT,
    generatedSet?: GeneratedAlphabetTable,
    seed?: number,
  ) => {
    const set = generatedSet ?? generateAlphabetTable(count, preset, seed);
    const startedAt = performance.now();
    activeRef.current = true;
    completionEmittedRef.current = false;
    startTimeRef.current = startedAt;
    lastActionTimeRef.current = startedAt;
    displayedTimeRef.current = 0;
    const sessionStartedAt = new Date().toISOString();
    sessionStartedAtRef.current = sessionStartedAt;
    completedAnalyticsJobRef.current = null;
    collectorRef.current = new CognitiveSessionEventCollector({
      sessionId: `alphabet-table-${Date.now()}-${set.preset}-${set.items.length}`,
      moduleId: 'alphabet-table',
      moduleVersion: '1',
      category: 'cognitive',
      startedAt: sessionStartedAt,
    });
    collectorRef.current.record({
      kind: 'trial_started',
      tMs: 0,
      trialType: 'alphabet-table:action-selection',
      difficulty: set.preset,
    });

    setState({
      ...DEFAULT_STATE,
      items: set.items,
      isActive: true,
      outcome: 'active',
      preset: set.preset,
      questionCount: set.items.length,
    });

    if (timerRef.current !== null) cancelAnimationFrame(timerRef.current);
    const updateTime = () => {
      if (!activeRef.current) return;
      const elapsed = Math.floor(performance.now() - startTimeRef.current);
      if (elapsed - displayedTimeRef.current >= 50) {
        displayedTimeRef.current = elapsed;
        setState((previous) => ({ ...previous, timeMs: elapsed }));
      }
      timerRef.current = requestAnimationFrame(updateTime);
    };
    timerRef.current = requestAnimationFrame(updateTime);
  }, []);

  const stopGame = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    if (timerRef.current !== null) cancelAnimationFrame(timerRef.current);
    setState((previous) => ({
      ...previous,
      isActive: false,
      isFinished: true,
      outcome: 'aborted',
      timeMs: Math.floor(performance.now() - startTimeRef.current),
    }));
  }, []);

  const resetGame = useCallback(() => {
    activeRef.current = false;
    completionEmittedRef.current = false;
    displayedTimeRef.current = 0;
    if (timerRef.current !== null) cancelAnimationFrame(timerRef.current);
    setState(DEFAULT_STATE);
  }, []);

  const submitAction = useCallback((action: AlphabetAction) => {
    if (!activeRef.current) return;
    const submittedAt = performance.now();

    setState((previous) => {
      const item = previous.items[previous.currentIndex];
      if (!item || !previous.isActive) return previous;

      const reactionTimeMs = Math.max(0, Math.floor(submittedAt - lastActionTimeRef.current));
      lastActionTimeRef.current = submittedAt;
      const isCorrect = action === item.action;
      const correctAnswers = previous.correctAnswers + (isCorrect ? 1 : 0);
      const errors = previous.errors + (isCorrect ? 0 : 1);
      const currentIndex = previous.currentIndex + 1;
      const reactionTimeTotalMs = previous.reactionTimeTotalMs + reactionTimeMs;
      const averageReactionTimeMs = Math.round(reactionTimeTotalMs / currentIndex);
      const timeMs = Math.max(0, Math.floor(submittedAt - startTimeRef.current));
      const isCompleted = currentIndex >= previous.items.length;
      collectorRef.current?.record({
        kind: 'trial_answered',
        tMs: timeMs,
        trialType: 'alphabet-table:action-selection',
        isCorrect,
        ...(reactionTimeMs > 0 ? { reactionTimeMs } : {}),
      });

      return {
        ...previous,
        currentIndex,
        correctAnswers,
        errors,
        timeMs,
        reactionTimeTotalMs,
        averageReactionTimeMs,
        isActive: !isCompleted,
        isFinished: isCompleted,
        outcome: isCompleted ? 'completed' : 'active',
      };
    });
  }, []);

  useEffect(() => {
    if (state.outcome !== 'completed' || completionEmittedRef.current) return;

    completionEmittedRef.current = true;
    activeRef.current = false;
    if (timerRef.current !== null) cancelAnimationFrame(timerRef.current);

    const accuracy = (state.correctAnswers / Math.max(1, state.items.length)) * 100;
    const collector = collectorRef.current;
    const startedAt = sessionStartedAtRef.current;
    if (collector && startedAt && !completedAnalyticsJobRef.current) {
      const completedAt = new Date(Date.parse(startedAt) + state.timeMs).toISOString();
      collector.complete(state.timeMs, completedAt);
      completedAnalyticsJobRef.current = collector.createCompletedJob(completedAt);
    }
    emitEvent('TRAINING_COMPLETE', {
      type: 'ALPHABET_TABLE',
      timeMs: state.timeMs,
      accuracy,
      errors: state.errors,
      score: Math.round(accuracy * 10),
      metadata: {
        mode: state.preset,
        correctAnswers: state.correctAnswers,
        totalQuestions: state.items.length,
        averageReactionTimeMs: state.averageReactionTimeMs,
      },
    });
  }, [
    state.averageReactionTimeMs,
    state.correctAnswers,
    state.errors,
    state.items.length,
    state.outcome,
    state.preset,
    state.timeMs,
  ]);

  const getCompletedAnalyticsJob = useCallback(() => completedAnalyticsJobRef.current, []);

  return { state, startGame, stopGame, resetGame, submitAction, getCompletedAnalyticsJob };
}
