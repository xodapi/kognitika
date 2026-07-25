import { useState, useCallback, useRef, useEffect } from 'react';
import {
  computeMentalMathScore,
  generateMathSet,
  type MathLevel,
  type MathQuestion,
  type MathLegend,
  type GeneratedMathSet,
} from '../lib/mentmath-generator';
import { emitEvent } from './useEventBus';

export interface MentalMathState {
  questions: MathQuestion[];
  legend: MathLegend;
  currentIndex: number;
  score: number;
  correctAnswers: number;
  errors: number;
  timeMs: number;
  isActive: boolean;
  isFinished: boolean;
  outcome: 'idle' | 'active' | 'completed' | 'aborted';
  level: MathLevel;
  questionCount: number;
}

const DEFAULT_STATE: MentalMathState = {
  questions: [],
  legend: {},
  currentIndex: 0,
  score: 0,
  correctAnswers: 0,
  errors: 0,
  timeMs: 0,
  isActive: false,
  isFinished: false,
  outcome: 'idle',
  level: 1,
  questionCount: 48,
};

export function useMentalMathEngine() {
  const [state, setState] = useState<MentalMathState>(DEFAULT_STATE);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const displayedTimeRef = useRef(0);
  const activeRef = useRef(false);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  const startGame = useCallback((
    level: MathLevel = 1,
    count: number = 48,
    generatedSet?: GeneratedMathSet,
    seed?: number,
  ) => {
    const set = generatedSet ?? generateMathSet(count, level, seed);
    activeRef.current = true;
    displayedTimeRef.current = 0;
    setState({
      questions: set.questions,
      legend: set.legend,
      currentIndex: 0,
      score: 0,
      correctAnswers: 0,
      errors: 0,
      timeMs: 0,
      isActive: true,
      isFinished: false,
      outcome: 'active',
      level,
      questionCount: set.questions.length,
    });

    startTimeRef.current = performance.now();
    if (timerRef.current) cancelAnimationFrame(timerRef.current);

    const updateTime = () => {
      if (!activeRef.current) return;
      const elapsed = Math.floor(performance.now() - startTimeRef.current);
      if (elapsed - displayedTimeRef.current >= 50) {
        displayedTimeRef.current = elapsed;
        setState((prev) => ({ ...prev, timeMs: elapsed }));
      }
      timerRef.current = requestAnimationFrame(updateTime);
    };
    timerRef.current = requestAnimationFrame(updateTime);
  }, []);

  const stopGame = useCallback(() => {
    activeRef.current = false;
    displayedTimeRef.current = 0;
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
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    setState(DEFAULT_STATE);
  }, []);

  const submitAnswer = useCallback((answer: number) => {
    setState((s) => {
      if (!s.isActive) return s;
      const question = s.questions[s.currentIndex];
      if (!question) return s;

      const isCorrect = answer === question.answer;
      const newCorrect = s.correctAnswers + (isCorrect ? 1 : 0);
      const newErrors = s.errors + (isCorrect ? 0 : 1);
      const nextIndex = s.currentIndex + 1;
      const isDone = nextIndex >= s.questions.length;
      const currentTime = Math.floor(performance.now() - startTimeRef.current);

      const accuracy = (newCorrect / s.questions.length) * 100;
      const newScore = computeMentalMathScore(currentTime, accuracy, newErrors);

      if (isDone) {
        activeRef.current = false;
        if (timerRef.current) cancelAnimationFrame(timerRef.current);
        emitEvent('TRAINING_COMPLETE', {
          type: 'MENTAL_MATH',
          level: s.level,
          timeMs: currentTime,
          accuracy: (newCorrect / s.questions.length) * 100,
          errors: newErrors,
          score: newScore,
          metadata: { correctAnswers: newCorrect, totalQuestions: s.questions.length },
        });
        return {
          ...s,
          correctAnswers: newCorrect,
          errors: newErrors,
          score: newScore,
          currentIndex: nextIndex,
          isActive: false,
          isFinished: true,
          outcome: 'completed',
          timeMs: currentTime,
        };
      }

      return {
        ...s,
        currentIndex: nextIndex,
        correctAnswers: newCorrect,
        errors: newErrors,
        score: newScore,
      };
    });
  }, []);

  return { state, startGame, stopGame, resetGame, submitAnswer };
}
