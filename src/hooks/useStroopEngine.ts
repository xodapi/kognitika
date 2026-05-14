import { useState, useEffect, useCallback, useRef } from 'react';
import { emitEvent } from './useEventBus';

export const STROOP_COLORS = [
  { text: 'КРАСНЫЙ', color: 'hsl(var(--destructive))', id: 'red', textColor: '#ef4444' },
  { text: 'СИНИЙ', color: 'hsl(var(--primary))', id: 'blue', textColor: '#3b82f6' },
  { text: 'ЗЕЛЕНЫЙ', color: 'hsl(142, 71%, 45%)', id: 'green', textColor: '#22c55e' },
  { text: 'ЖЕЛТЫЙ', color: 'hsl(47, 95%, 52%)', id: 'yellow', textColor: '#eab308' }
];

export interface StroopQuestion {
  id: string;
  word: string;
  textColor: string;
  correctAnswerId: string;
  isCongruent: boolean;
}

export interface StroopState {
  question: StroopQuestion | null;
  score: number;
  errors: number;
  isActive: boolean;
  isFinished: boolean;
  timeLeftMs: number;
  averageReactionTime: number;
}

export function useStroopEngine() {
  const [state, setState] = useState<StroopState>({
    question: null,
    score: 0,
    errors: 0,
    isActive: false,
    isFinished: false,
    timeLeftMs: 60000,
    averageReactionTime: 0
  });

  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const timerRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(0);
  const seedRef = useRef<number | undefined>(undefined);

  const seededRandom = () => {
    if (seedRef.current !== undefined) {
      seedRef.current = (seedRef.current * 9301 + 49297) % 233280;
      return seedRef.current / 233280;
    }
    return Math.random();
  };

  const generateQuestion = useCallback((): StroopQuestion => {
    const isCongruent = seededRandom() > 0.5;
    const wordIdx = Math.floor(seededRandom() * STROOP_COLORS.length);
    const wordObj = STROOP_COLORS[wordIdx];
    let colorObj = wordObj;
    
    if (!isCongruent) {
      const others = STROOP_COLORS.filter((_, i) => i !== wordIdx);
      colorObj = others[Math.floor(seededRandom() * others.length)];
    }

    return {
      id: seededRandom().toString(36).substring(7),
      word: wordObj.text,
      textColor: colorObj.textColor,
      correctAnswerId: colorObj.id,
      isCongruent
    };
  }, []);

  const startGame = useCallback((seed?: number) => {
    seedRef.current = seed;
    const firstQ = generateQuestion();
    
    setState({
      question: firstQ,
      score: 0,
      errors: 0,
      isActive: true,
      isFinished: false,
      timeLeftMs: 60000,
      averageReactionTime: 0
    });
    setReactionTimes([]);

    lastTickRef.current = performance.now();
    questionStartTimeRef.current = performance.now();

    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    
    const updateTime = () => {
      const now = performance.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      setState(prev => {
        if (!prev.isActive || prev.isFinished) return prev;
        const next = Math.max(0, prev.timeLeftMs - delta);
        if (next === 0) {
           return { ...prev, timeLeftMs: 0, isActive: false, isFinished: true };
        }
        return { ...prev, timeLeftMs: next };
      });
      
      timerRef.current = requestAnimationFrame(updateTime);
    };
    timerRef.current = requestAnimationFrame(updateTime);
  }, [generateQuestion]);

  // Handle completion event via effect to ensure state is flushed
  useEffect(() => {
    if (state.isFinished && !state.isActive && state.timeLeftMs === 0) {
      emitEvent('TRAINING_COMPLETE', {
        type: 'STROOP',
        score: state.score,
        errors: state.errors,
        timeMs: 60000,
        level: 1,
        metadata: { avgReactionTime: state.averageReactionTime }
      });
    }
  }, [state.isFinished, state.isActive, state.timeLeftMs, state.score, state.errors, state.averageReactionTime]);

  const answerQuestion = useCallback((answerId: string) => {
    const now = performance.now();
    const reactionTime = now - questionStartTimeRef.current;
    
    setState(s => {
      if (!s.question || !s.isActive || s.isFinished) return s;

      const isCorrect = answerId === s.question.correctAnswerId;

      emitEvent('CELL_CLICK', {
        num: 0,
        isCorrect,
        reactionTimeMs: reactionTime
      });

      if (!isCorrect) {
        emitEvent('MISTAKE_MADE', {
          expected: s.question.correctAnswerId,
          actual: answerId,
          isCongruent: s.question.isCongruent
        });
      }

      const newReactionTimes = isCorrect ? [...reactionTimes, reactionTime] : reactionTimes;
      // We'll update reactionTimes in a separate call or handle in the same state if possible
      // To keep it simple and reactive:
      const newAvg = newReactionTimes.length 
        ? newReactionTimes.reduce((a, b) => a + b, 0) / newReactionTimes.length 
        : s.averageReactionTime;

      questionStartTimeRef.current = now;

      return {
        ...s,
        score: isCorrect ? s.score + 1 : s.score,
        errors: isCorrect ? s.errors : s.errors + 1,
        question: generateQuestion(),
        averageReactionTime: newAvg
      };
    });
    
    // Also sync the local reactionTimes state for the next update
    setReactionTimes(rt => {
       const isCorrect = state.question?.correctAnswerId === answerId;
       return isCorrect ? [...rt, reactionTime] : rt;
    });
  }, [generateQuestion, reactionTimes, state.question]);

  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  return { 
    state, 
    startGame, 
    answerQuestion,
    colors: STROOP_COLORS 
  };
}
