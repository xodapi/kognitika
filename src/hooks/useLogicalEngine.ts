import { useState, useEffect, useCallback, useRef } from 'react';

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

function generateItem(shape: ShapeType, color: string, count: number, rotation: number): MatrixItem {
  return { id: Math.random().toString(36).substring(7), shape, color, count, rotation };
}

function generateMatrixQuestion(): LogicalQuestion {
  const pattern: PatternType = ['count', 'rotation', 'color'][Math.floor(Math.random() * 3)] as PatternType;
  
  const baseShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  const baseColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  
  const grid: (MatrixItem | null)[] = [];
  let correctItem: MatrixItem | null = null;
  
  if (pattern === 'count') {
    const startCount = Math.floor(Math.random() * 2) + 1;
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
    const rotBase = SHAPES.filter(s => s !== 'circle')[Math.floor(Math.random() * 2)]; // no point rotating circle texturally if solid, but we use a distinct SVG for triangle so it works
    const step = 90;
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
    const shift = Math.floor(Math.random() * 2) + 1;
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

  // Generate options
  const options: MatrixItem[] = [correctItem!];
  while (options.length < 4) {
    const fakeShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const fakeColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const fakeCount = Math.floor(Math.random() * 5) + 1;
    const fakeRot = [0, 90, 180, 270][Math.floor(Math.random() * 4)];
    
    // ensure unique
    const isMatched = options.some(o => o.shape === fakeShape && o.color === fakeColor && o.count === fakeCount && o.rotation === fakeRot);
    if (!isMatched) {
       options.push(generateItem(fakeShape, fakeColor, fakeCount, fakeRot));
    }
  }
  
  // Shuffle options
  options.sort(() => Math.random() - 0.5);
  const correctOptionIndex = options.findIndex(o => o.id === correctItem!.id);

  return {
    id: Math.random().toString(36).substring(7),
    grid,
    options,
    correctOptionIndex
  }
}

export function useLogicalEngine() {
  const [questions, setQuestions] = useState<LogicalQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [timeMs, setTimeMs] = useState(0);
  
  const timerRef = useRef<number | null>(null);

  const startGame = useCallback(() => {
    setQuestions(Array.from({ length: 3 }).map(() => generateMatrixQuestion()));
    setCurrentIndex(0);
    setScore(0);
    setIsActive(true);
    setIsFinished(false);
    setStartTime(performance.now());
    setTimeMs(0);

    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    
    const updateTime = () => {
      setTimeMs(performance.now() - startTime);
      if (isActive) {
        timerRef.current = requestAnimationFrame(updateTime);
      }
    };
    timerRef.current = requestAnimationFrame(updateTime);
  }, [isActive, startTime]);

  const answerQuestion = useCallback((optIndex: number) => {
    const cur = questions[currentIndex];
    if (optIndex === cur.correctOptionIndex) {
      setScore(s => s + 1);
    }
    
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(i => i + 1);
    } else {
      setIsActive(false);
      setIsFinished(true);
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      setTimeMs(performance.now() - startTime);
    }
  }, [currentIndex, questions, startTime]);

  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    }
  }, []);

  return { state: { questions, currentIndex, score, isActive, isFinished, timeMs }, startGame, answerQuestion };
}
