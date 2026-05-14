import { useState, useEffect, useCallback, useRef } from 'react';
import { emitEvent } from './useEventBus';
import { eventBus } from '../lib/event-bus';
import { generateGrid, generateExpectedSequence } from '../lib/schulte-generator';

export type GameMode = 'classic' | 'reverse' | 'gorbov' | 'colorNoise' | 'scattered' | 'peripheral' | 'hardcore';
export type DistractionLevel = 'none' | 'audio' | 'visual' | 'chaos';

export type CellValue = {
  id: number;
  num: number;
  color: 'black' | 'red';
  chaosStyle?: { opacity: number; rotate: number; scale: number };
};

export interface ModificationSettings {
  colorNoise: 'none' | 'pastel' | 'high_contrast';
  distortion: boolean;
  inversion: boolean;
  bgTheme: 'default' | 'dark-green';
  chaosIntervalMs: number;
  digitRotation: boolean;
}

export interface SchulteState {
  grid: CellValue[];
  expectedSequence: CellValue[];
  expectedIndex: number;
  timeMs: number;
  isActive: boolean;
  isFinished: boolean;
  errors: number;
  mode: GameMode;
  size: number;
  modifications: ModificationSettings;
  clickHistory: { num: number; color: string; timeMs: number; reactionTimeMs: number; cellId: number; gridIndex: number; x?: number; y?: number }[];
  lastSuggestion: any | null;
}

// Logic moved to schulte-generator.ts

export function useSchulteEngine(initialSize: number = 5, mode: GameMode = 'classic', distraction: DistractionLevel = 'none') {
  const [state, setState] = useState<SchulteState>({
    grid: [],
    expectedSequence: [],
    expectedIndex: 0,
    timeMs: 0,
    isActive: false,
    isFinished: false,
    errors: 0,
    mode,
    size: initialSize,
    modifications: {
      colorNoise: 'none',
      distortion: false,
      inversion: false,
      bgTheme: 'default',
      chaosIntervalMs: 500,
      digitRotation: false
    },
    clickHistory: [],
    lastSuggestion: null
  });


  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  const startGame = useCallback((seed?: number) => {
    setState((s) => {
      const currentMode = s.mode;
      const currentSize = s.size;
      const seq = generateExpectedSequence(currentSize, currentMode);
      return {
        ...s,
        grid: generateGrid(currentSize, currentMode, seed),
        expectedSequence: seq,
        expectedIndex: 0,
        isActive: true,
        isFinished: false,
        timeMs: 0,
        errors: 0,
        clickHistory: []
      };
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
    setState((s) => ({
      ...s,
      grid: [],
      expectedSequence: [],
      expectedIndex: 0,
      isActive: false,
      isFinished: false,
      timeMs: 0,
      errors: 0,
    }));
  }, []);

  const setSettings = useCallback((newSize: number, newMode: GameMode, modifications?: Partial<ModificationSettings>) => {
    setState(s => ({ 
      ...s, 
      size: newSize, 
      mode: newMode,
      modifications: modifications ? { ...s.modifications, ...modifications } : s.modifications
    }));
  }, []);

  const clickCell = useCallback(
    (cell: CellValue, gridIndex: number, coords?: { x: number; y: number }, onSuccess?: () => void, onError?: () => void) => {
      if (!state.isActive) return;

      const expected = state.expectedSequence[state.expectedIndex];
      const isMatch = state.mode === 'gorbov' 
        ? (cell.num === expected.num && cell.color === expected.color)
        : (cell.num === expected.num);

      const currentTime = Math.floor(performance.now() - startTimeRef.current);
      const lastClickTime = state.clickHistory.length > 0 ? state.clickHistory[state.clickHistory.length - 1].timeMs : 0;
      const reactionTimeMs = currentTime - lastClickTime;

      emitEvent('CELL_CLICK', {
        num: cell.num,
        color: cell.color,
        cellId: cell.id,
        gridIndex,
        reactionTimeMs,
        isCorrect: isMatch,
        x: coords?.x,
        y: coords?.y
      });

      if (isMatch) {
        onSuccess?.();
        setState((s) => {
          const nextIndex = s.expectedIndex + 1;
          const isDone = nextIndex >= s.expectedSequence.length;
          const currentTime = Math.floor(performance.now() - startTimeRef.current);
          const lastClickTime = s.clickHistory.length > 0 ? s.clickHistory[s.clickHistory.length - 1].timeMs : 0;
          
          const newHistory = [...s.clickHistory, { 
            num: cell.num, 
            color: cell.color, 
            timeMs: currentTime, 
            reactionTimeMs: currentTime - lastClickTime,
            cellId: cell.id,
            gridIndex,
            x: coords?.x,
            y: coords?.y
          }];

          if (isDone) {
             if (timerRef.current) cancelAnimationFrame(timerRef.current);
             
             emitEvent('TRAINING_COMPLETE', {
                type: 'SCHULTE',
                size: s.size,
                timeMs: currentTime,
                accuracy: (s.expectedSequence.length / (s.expectedSequence.length + s.errors)) * 100,
                score: Math.max(0, 1000 - Math.floor(currentTime / 10)),
                errors: s.errors
             });

             return { ...s, expectedIndex: nextIndex, isActive: false, isFinished: true, timeMs: currentTime, clickHistory: newHistory };
          }
          return { ...s, expectedIndex: nextIndex, clickHistory: newHistory };
        });
      } else {
        onError?.();
        emitEvent('MISTAKE_MADE', {
          expected: expected.num,
          actual: cell.num,
          cellId: cell.id
        });
        setState((s) => ({ ...s, errors: s.errors + 1 }));
      }
    },
    [state.isActive, state.expectedIndex, state.expectedSequence, state.mode, state.clickHistory]
  );

  const applyDifficultySuggestion = useCallback((suggestion: any) => {
    setState(s => ({
      ...s,
      size: suggestion.nextGridSize,
      modifications: {
        ...s.modifications,
        colorNoise: suggestion.noiseLevel > 0.2 ? 'pastel' : 'none',
        digitRotation: suggestion.rotationEnabled
      },
      lastSuggestion: suggestion
    }));
  }, []);

  useEffect(() => {
    const unsub = eventBus.on('DIFFICULTY_SUGGESTION', (suggestion) => {
      if (state.isActive) {
        applyDifficultySuggestion(suggestion);
      }
    });
    return unsub;
  }, [state.isActive, applyDifficultySuggestion]);

  return { state, startGame, stopGame, resetGame, clickCell, setSettings, applyDifficultySuggestion };
}
