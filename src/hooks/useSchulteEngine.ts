import { useState, useEffect, useCallback, useRef } from 'react';

export type GameMode = 'classic' | 'reverse' | 'gorbov';
export type DistractionLevel = 'none' | 'audio' | 'visual' | 'chaos';

export type CellValue = {
  id: number;
  num: number;
  color: 'black' | 'red';
};

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
}

const generateExpectedSequence = (size: number, mode: GameMode): CellValue[] => {
  const total = size * size;
  const seq: CellValue[] = [];
  
  if (mode === 'classic') {
    for (let i = 1; i <= total; i++) seq.push({ id: 0, num: i, color: 'black' });
  } else if (mode === 'reverse') {
    for (let i = total; i >= 1; i--) seq.push({ id: 0, num: i, color: 'black' });
  } else if (mode === 'gorbov') {
    const blackCount = Math.ceil(total / 2);
    const redCount = Math.floor(total / 2);
    let b = 1, r = redCount;
    while (b <= blackCount || r >= 1) {
      if (b <= blackCount) { seq.push({ id: 0, num: b, color: 'black' }); b++; }
      if (r >= 1) { seq.push({ id: 0, num: r, color: 'red' }); r--; }
    }
  }
  
  seq.forEach((c, idx) => c.id = idx);
  return seq;
};

const generateGrid = (size: number, mode: GameMode): CellValue[] => {
  const total = size * size;
  const cells: CellValue[] = [];
  
  if (mode === 'gorbov') {
    const blackCount = Math.ceil(total / 2);
    const redCount = Math.floor(total / 2);
    for (let i = 1; i <= blackCount; i++) cells.push({ id: i, num: i, color: 'black' });
    for (let i = 1; i <= redCount; i++) cells.push({ id: i + blackCount, num: i, color: 'red' });
  } else {
    for (let i = 1; i <= total; i++) cells.push({ id: i, num: i, color: 'black' });
  }

  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells;
};

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
  });

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const startGame = useCallback(() => {
    setState((s) => {
      const currentMode = s.mode;
      const currentSize = s.size;
      const seq = generateExpectedSequence(currentSize, currentMode);
      return {
        ...s,
        grid: generateGrid(currentSize, currentMode),
        expectedSequence: seq,
        expectedIndex: 0,
        isActive: true,
        isFinished: false,
        timeMs: 0,
        errors: 0,
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

  const setSettings = useCallback((newSize: number, newMode: GameMode) => {
    setState(s => ({ ...s, size: newSize, mode: newMode }));
  }, []);

  const clickCell = useCallback(
    (cell: CellValue, onSuccess?: () => void, onError?: () => void) => {
      setState((s) => {
        if (!s.isActive) return s;

        const expected = s.expectedSequence[s.expectedIndex];
        const isMatch = s.mode === 'gorbov' 
          ? (cell.num === expected.num && cell.color === expected.color)
          : (cell.num === expected.num);

        if (isMatch) {
          onSuccess?.();
          const nextIndex = s.expectedIndex + 1;
          const isDone = nextIndex >= s.expectedSequence.length;
          
          if (isDone) {
             if (timerRef.current) cancelAnimationFrame(timerRef.current);
             return { ...s, expectedIndex: nextIndex, isActive: false, isFinished: true, timeMs: Math.floor(performance.now() - startTimeRef.current) };
          }
          return { ...s, expectedIndex: nextIndex };
        } else {
          onError?.();
          return { ...s, errors: s.errors + 1 };
        }
      });
    },
    []
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  return { state, startGame, stopGame, resetGame, clickCell, setSettings };
}
