import { useState, useCallback, useRef, useEffect } from 'react';
import { generateMathSet, type MathLevel, type MathQuestion, type MathLegend, type GeneratedMathSet } from '../lib/mentmath-generator';
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
  level: 1,
  questionCount: 20,
};

export function useMentalMathEngine() {
  const [state, setState] = useState<MentalMathState>(DEFAULT_STATE);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  const startGame = useCallback((level: MathLevel = 1, count: number = 20, seed?: number) => {
    const set = generateMathSet(count, level, seed);
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
      level,
      questionCount: count,
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

      const speedBonus = Math.max(0, 1000 - Math.floor(currentTime / s.questions.length));
      const accuracyMultiplier = s.questions.length > 0 ? newCorrect / (newCorrect + newErrors) : 0;
      const newScore = Math.floor(speedBonus * accuracyMultiplier);

      if (isDone) {
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
