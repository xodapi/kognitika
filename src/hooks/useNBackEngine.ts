import { useState, useEffect, useCallback, useRef } from 'react';
import { emitEvent } from './useEventBus';

const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'К', 'Л'];
const ROUNDS = 20;

export interface NBackState {
  currentStimulus: string | null;
  score: number;
  errors: number;
  round: number;
  isActive: boolean;
  isFinished: boolean;
  isMatch: boolean | null;
  showFeedback: 'correct' | 'wrong' | null;
  nBack: number;
}

export function useNBackEngine(nBack: number = 2) {
  const [state, setState] = useState<NBackState>({
    currentStimulus: null,
    score: 0,
    errors: 0,
    round: 0,
    isActive: false,
    isFinished: false,
    isMatch: null,
    showFeedback: null,
    nBack
  });

  const sequenceRef = useRef<string[]>([]);
  const userHasAnsweredRef = useRef<boolean>(false);
  const seedRef = useRef<number | undefined>(undefined);

  const seededRandom = () => {
    if (seedRef.current !== undefined) {
      seedRef.current = (seedRef.current * 9301 + 49297) % 233280;
      return seedRef.current / 233280;
    }
    return Math.random();
  };

  const nextRound = useCallback(() => {
    setState(prev => {
      if (prev.round >= ROUNDS) {
        emitEvent('TRAINING_COMPLETE', {
           type: 'NBACK',
           score: prev.score,
           errors: prev.errors,
           level: prev.nBack,
           timeMs: ROUNDS * 2500
        });
        return { ...prev, isActive: false, isFinished: true, currentStimulus: null };
      }

      let newErrors = prev.errors;
      // Missed match detection
      if (prev.isActive && prev.isMatch && !userHasAnsweredRef.current && prev.round > 0) {
        newErrors += 1;
        emitEvent('MISTAKE_MADE', {
           expected: 'match_click',
           actual: 'missed_click',
           round: prev.round
        });
      }

      const seq = sequenceRef.current;
      const willMatch = seq.length >= prev.nBack && seededRandom() < 0.35;
      let nextLetter = '';

      if (willMatch) {
         nextLetter = seq[seq.length - prev.nBack];
      } else {
         nextLetter = LETTERS[Math.floor(seededRandom() * LETTERS.length)];
         if (seq.length >= prev.nBack && nextLetter === seq[seq.length - prev.nBack]) {
           nextLetter = LETTERS.find(l => l !== nextLetter) || LETTERS[0];
         }
      }

      seq.push(nextLetter);
      userHasAnsweredRef.current = false;

      return {
        ...prev,
        errors: newErrors,
        currentStimulus: nextLetter,
        round: prev.round + 1,
        isMatch: willMatch,
        showFeedback: null
      };
    });
  }, []);

  const startGame = useCallback((seed?: number) => {
    seedRef.current = seed;
    sequenceRef.current = [];
    userHasAnsweredRef.current = false;
    setState({
      currentStimulus: null,
      score: 0,
      errors: 0,
      round: 0,
      isActive: true,
      isFinished: false,
      isMatch: null,
      showFeedback: null,
      nBack
    });
  }, [nBack]);


  // Timer logic
  useEffect(() => {
    if (state.isActive && !state.isFinished) {
      const interval = state.round === 0 ? 500 : 2500;
      const timer = setTimeout(nextRound, interval);
      return () => clearTimeout(timer);
    }
  }, [state.isActive, state.isFinished, state.round, nextRound]);

  const answerMatch = useCallback(() => {
    setState(prev => {
      if (!prev.isActive || !prev.currentStimulus || userHasAnsweredRef.current) return prev;
      
      userHasAnsweredRef.current = true;
      const isCorrect = prev.isMatch === true;
      
      emitEvent('CELL_CLICK', { num: 0, isCorrect, reactionTimeMs: 0 });

      if (!isCorrect) {
        emitEvent('MISTAKE_MADE', {
           expected: 'no_match',
           actual: 'match_click',
           round: prev.round
        });
      }

      return {
        ...prev,
        score: isCorrect ? prev.score + 1 : prev.score,
        errors: !isCorrect ? prev.errors + 1 : prev.errors,
        showFeedback: isCorrect ? 'correct' : 'wrong'
      };
    });
  }, []);

  return { state, startGame, answerMatch };
}
