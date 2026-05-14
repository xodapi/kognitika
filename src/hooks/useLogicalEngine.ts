import { useState, useEffect, useCallback, useRef } from 'react';
import { emitEvent } from './useEventBus';

export type ShapeType = 'circle' | 'square' | 'triangle';
export type PatternType = 'count' | 'rotation' | 'color';

export interface MatrixItem {
  id: string;
  shape: ShapeType;
  color: string;
  count: number;
  rotation: number;
}

export interface LogicalQuestion {
  id: string;
  grid: (MatrixItem | null)[]; // length 9, index 8 is null
  options: MatrixItem[]; // length 4
  correctOptionIndex: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--accent))'];
const SHAPES: ShapeType[] = ['circle', 'square', 'triangle'];

export function useLogicalEngine() {
  const [state, setState] = useState({
    questions: [] as LogicalQuestion[],
    currentIndex: 0,
    score: 0,
    errors: 0,
    isActive: false,
    isFinished: false,
    timeMs: 0
  });

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const seedRef = useRef<number | undefined>(undefined);

  const seededRandom = () => {
    if (seedRef.current !== undefined) {
      seedRef.current = (seedRef.current * 9301 + 49297) % 233280;
      return seedRef.current / 233280;
    }
    return Math.random();
  };

  const generateItem = (shape: ShapeType, color: string, count: number, rotation: number): MatrixItem => {
    return { id: seededRandom().toString(36).substring(7), shape, color, count, rotation };
  };

  const generateMatrixQuestion = useCallback((): LogicalQuestion => {
    const patternIdx = Math.floor(seededRandom() * 3);
    const pattern: PatternType = ['count', 'rotation', 'color'][patternIdx] as PatternType;
    
    const baseShape = SHAPES[Math.floor(seededRandom() * SHAPES.length)];
    const baseColor = COLORS[Math.floor(seededRandom() * COLORS.length)];
    
    const grid: (MatrixItem | null)[] = [];
    let correctItem: MatrixItem | null = null;
    
    if (pattern === 'count') {
      const startCount = Math.floor(seededRandom() * 2) + 1;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const count = startCount + r + c;
          const item = generateItem(baseShape, baseColor, count, 0);
          if (r === 2 && c === 2) {
            correctItem = item;
            grid.push(null);
          } else {
            grid.push(item);
          }
        }
      }
    } else if (pattern === 'rotation') {
      const rotBase = SHAPES.filter(s => s !== 'circle')[Math.floor(seededRandom() * 2)];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const rot = (r * 90 + c * 90) % 360;
          const item = generateItem(rotBase, baseColor, 1, rot);
          if (r === 2 && c === 2) {
            correctItem = item;
            grid.push(null);
          } else {
            grid.push(item);
          }
        }
      }
    } else if (pattern === 'color') {
      const shift = Math.floor(seededRandom() * 2) + 1;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const colIdx = (r * shift + c) % COLORS.length;
          const item = generateItem(baseShape, COLORS[colIdx], 1, 0);
          if (r === 2 && c === 2) {
            correctItem = item;
            grid.push(null);
          } else {
            grid.push(item);
          }
        }
      }
    }

    const options: MatrixItem[] = [correctItem!];
    while (options.length < 4) {
      const fakeShape = SHAPES[Math.floor(seededRandom() * SHAPES.length)];
      const fakeColor = COLORS[Math.floor(seededRandom() * COLORS.length)];
      const fakeCount = Math.floor(seededRandom() * 5) + 1;
      const fakeRot = [0, 90, 180, 270][Math.floor(seededRandom() * 4)];
      
      const isMatched = options.some(o => o.shape === fakeShape && o.color === fakeColor && o.count === fakeCount && o.rotation === fakeRot);
      if (!isMatched) {
         options.push(generateItem(fakeShape, fakeColor, fakeCount, fakeRot));
      }
    }
    
    options.sort(() => seededRandom() - 0.5);
    const correctOptionIndex = options.findIndex(o => o.id === correctItem!.id);

    return {
      id: seededRandom().toString(36).substring(7),
      grid,
      options,
      correctOptionIndex
    };
  }, []);

  const startGame = useCallback((seed?: number) => {
    seedRef.current = seed;
    const newQuestions = Array.from({ length: 3 }).map(() => generateMatrixQuestion());
    
    setState({
      questions: newQuestions,
      currentIndex: 0,
      score: 0,
      errors: 0,
      isActive: true,
      isFinished: false,
      timeMs: 0
    });

    startTimeRef.current = performance.now();

    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    
    const updateTime = () => {
      const now = performance.now();
      setState(prev => {
        if (!prev.isActive || prev.isFinished) return prev;
        return { ...prev, timeMs: now - startTimeRef.current };
      });
      timerRef.current = requestAnimationFrame(updateTime);
    };
    timerRef.current = requestAnimationFrame(updateTime);
  }, [generateMatrixQuestion]);

  const answerQuestion = useCallback((optIndex: number) => {
    setState(prev => {
      if (!prev.isActive || prev.isFinished) return prev;
      
      const cur = prev.questions[prev.currentIndex];
      const isCorrect = optIndex === cur.correctOptionIndex;
      const now = performance.now();
      const elapsed = now - startTimeRef.current;

      if (isCorrect) {
        emitEvent('CELL_CLICK', { num: prev.currentIndex, isCorrect: true, reactionTimeMs: 0 });
      } else {
        emitEvent('MISTAKE_MADE', { expected: cur.correctOptionIndex, actual: optIndex, level: prev.currentIndex });
      }

      const isLast = prev.currentIndex + 1 >= prev.questions.length;
      
      if (isLast) {
        emitEvent('TRAINING_COMPLETE', {
          type: 'LOGICAL_SEQUENCE',
          score: isCorrect ? prev.score + 1 : prev.score,
          errors: isCorrect ? prev.errors : prev.errors + 1,
          timeMs: elapsed,
          level: 1
        });
        return {
          ...prev,
          score: isCorrect ? prev.score + 1 : prev.score,
          errors: isCorrect ? prev.errors : prev.errors + 1,
          isActive: false,
          isFinished: true,
          timeMs: elapsed
        };
      }

      return {
        ...prev,
        currentIndex: prev.currentIndex + 1,
        score: isCorrect ? prev.score + 1 : prev.score,
        errors: isCorrect ? prev.errors : prev.errors + 1,
        timeMs: elapsed
      };
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  return { state, startGame, answerQuestion };
}
