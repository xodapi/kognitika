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
}

function selectTextIndex(textCount: number, previousIndex: number | null) {
  if (textCount <= 1) return 0;
  const randomIndex = Math.floor(Math.random() * textCount);
  return randomIndex === previousIndex ? (randomIndex + 1) % textCount : randomIndex;
}

export function useTypingEngine(texts: string[]) {
  const previousTextIndexRef = useRef<number | null>(null);
  const [state, setState] = useState<TypingState>({
    text: '',
    userInput: '',
    startTime: null,
    isFinished: false,
    isActive: false,
    cpm: 0,
    accuracy: 100,
    errors: 0
  });

  const startTest = useCallback(() => {
    const safeTexts = texts.length > 0 ? texts : [''];
    const selectedIndex = selectTextIndex(safeTexts.length, previousTextIndexRef.current);
    const selectedText = safeTexts[selectedIndex];
    previousTextIndexRef.current = selectedIndex;

    setState({
      text: selectedText,
      userInput: '',
      startTime: null,
      isFinished: false,
      isActive: true,
      cpm: 0,
      accuracy: 100,
      errors: 0
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
        isFinished: true,
        isActive: false
      }));
    }
  }, [state]);

  return { state, startTest, handleInput };
}
