import { useState, useCallback, useRef, useEffect } from 'react';
import { emitEvent } from './useEventBus';
import { getTypingStats } from '../lib/cognitive-metrics';

export interface TypingState {
  text: string;
  userInput: string;
  startTime: number | null;
  isFinished: boolean;
  isActive: boolean;
  cpm: number;
  accuracy: number;
  errors: number;
  timeMs: number;
}

export function useTypingEngine(texts: string[]) {
  const [state, setState] = useState<TypingState>({
    text: '',
    userInput: '',
    startTime: null,
    isFinished: false,
    isActive: false,
    cpm: 0,
    accuracy: 100,
    errors: 0,
    timeMs: 0
  });

  const startTest = useCallback(() => {
    const randomText = texts[Math.floor(Math.random() * texts.length)];
    setState({
      text: randomText,
      userInput: '',
      startTime: null,
      isFinished: false,
      isActive: true,
      cpm: 0,
      accuracy: 100,
      errors: 0,
      timeMs: 0
    });
  }, [texts]);

  const handleInput = useCallback(async (value: string) => {
    if (!state.isActive || state.isFinished) return;

    let { startTime, errors, text } = state;
    if (!startTime && value.length > 0) {
      startTime = Date.now();
    }

    // Error detection
    if (value.length > state.userInput.length) {
      const lastChar = value[value.length - 1];
      const expectedChar = text[value.length - 1];
      if (lastChar !== expectedChar) {
        errors++;
      }
    }

    const isDone = value === text;
    
    setState(s => ({
      ...s,
      userInput: value,
      startTime,
      errors,
      isFinished: isDone
    }));

    if (isDone && startTime) {
      const finalTime = Date.now() - startTime;
      const stats = await getTypingStats(text.length, finalTime, errors);

      emitEvent('TRAINING_COMPLETE', {
        type: 'TYPING',
        ...stats,
        timeMs: finalTime,
      });

      setState(s => ({
        ...s,
        ...stats,
        timeMs: finalTime,
        isFinished: true,
        isActive: false
      }));
    }
  }, [state]);

  return { state, startTest, handleInput };
}
