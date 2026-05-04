import { useState, useEffect, useCallback, useRef } from 'react';

const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'К', 'Л'];
const N_BACK = 2; // Fixed to 2-back
const ROUNDS = 20;

export interface NBackState {
  currentStimulus: string | null;
  score: number;
  errors: number;
  round: number;
  isActive: boolean;
  isFinished: boolean;
  isMatch: boolean | null; // was the current one actually a match?
  showFeedback: 'correct' | 'wrong' | null;
}

export function useNBackEngine() {
  const [state, setState] = useState<NBackState>({
    currentStimulus: null,
    score: 0,
    errors: 0,
    round: 0,
    isActive: false,
    isFinished: false,
    isMatch: null,
    showFeedback: null
  });

  const sequenceRef = useRef<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userHasAnsweredRef = useRef<boolean>(false);

  const nextRound = useCallback(() => {
    setState(prev => {
      // If we missed a match in the previous round
      let newErrors = prev.errors;
      if (prev.isActive && prev.isMatch && !userHasAnsweredRef.current && prev.round > 0) {
        newErrors += 1;
      }

      if (prev.round >= ROUNDS) {
        return { ...prev, errors: newErrors, isActive: false, isFinished: true, currentStimulus: null };
      }

      // Generate next
      const seq = sequenceRef.current;
      const willMatch = seq.length >= N_BACK && Math.random() < 0.35; // 35% chance to force a match
      let nextLetter = '';

      if (willMatch) {
         nextLetter = seq[seq.length - N_BACK];
      } else {
         nextLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
         // Ensure it doesn't accidentally match if we don't want it to
         if (seq.length >= N_BACK && nextLetter === seq[seq.length - N_BACK]) {
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

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (state.round < ROUNDS) {
       // Proceed to next automatically after 2.5 seconds
       timeoutRef.current = setTimeout(nextRound, 2500);
    }
  }, [state.round]);

  const startGame = useCallback(() => {
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
      showFeedback: null
    });
    // Kick off first round
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(nextRound, 500);
  }, [nextRound]);

  const answerMatch = useCallback(() => {
    if (!state.isActive || !state.currentStimulus || userHasAnsweredRef.current) return;
    
    userHasAnsweredRef.current = true;
    
    setState(prev => {
      let isCorrect = prev.isMatch === true;
      return {
        ...prev,
        score: isCorrect ? prev.score + 1 : prev.score,
        errors: !isCorrect ? prev.errors + 1 : prev.errors,
        showFeedback: isCorrect ? 'correct' : 'wrong'
      };
    });

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setState(p => ({ ...p, showFeedback: null }));
    }, 500);

  }, [state.isActive, state.currentStimulus]);


  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  return { state, startGame, answerMatch };
}
