import { useState, useEffect, useCallback, useRef } from 'react';

const COLORS = [
  { text: 'КРАСНЫЙ', color: 'hsl(var(--destructive))', id: 'red' },
  { text: 'СИНИЙ', color: 'hsl(var(--primary))', id: 'blue' },
  { text: 'ЗЕЛЕНЫЙ', color: 'hsl(142, 71%, 45%)', id: 'green' }, // using standard green
  { text: 'ЖЕЛТЫЙ', color: 'hsl(47, 95%, 52%)', id: 'yellow' } // using standard yellow
];

export interface StroopQuestion {
  id: string;
  word: string;
  textColor: string;
  correctAnswerId: string;
}

function generateQuestion(): StroopQuestion {
  // 50% chance the word matches the color, 50% chance it doesn't
  const isMatch = Math.random() > 0.5;
  const wordObj = COLORS[Math.floor(Math.random() * COLORS.length)];
  let colorObj = wordObj;
  
  if (!isMatch) {
    const others = COLORS.filter(c => c.id !== wordObj.id);
    colorObj = others[Math.floor(Math.random() * others.length)];
  }

  return {
    id: Math.random().toString(36).substring(7),
    word: wordObj.text,
    textColor: colorObj.color,
    correctAnswerId: colorObj.id
  };
}

export function useStroopEngine() {
  const [question, setQuestion] = useState<StroopQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(60000); 
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  
  const timerRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const questionStartTimeRef = useRef<number>(0);

  const startGame = useCallback(() => {
    setQuestion(generateQuestion());
    setScore(0);
    setErrors(0);
    setReactionTimes([]);
    setIsActive(true);
    setIsFinished(false);
    setTimeLeftMs(60000);
    lastTickRef.current = performance.now();
    questionStartTimeRef.current = performance.now();

    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    
    const updateTime = () => {
      const now = performance.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      setTimeLeftMs(prev => {
        const next = Math.max(0, prev - delta);
        if (next === 0) {
           setIsActive(false);
           setIsFinished(true);
           if (timerRef.current) cancelAnimationFrame(timerRef.current);
        }
        return next;
      });
      
      if (isActive) {
        timerRef.current = requestAnimationFrame(updateTime);
      }
    };
    timerRef.current = requestAnimationFrame(updateTime);
  }, [isActive]);

  const answerQuestion = useCallback((answerId: string) => {
    if (!question || !isActive) return;

    const reactionTime = performance.now() - questionStartTimeRef.current;

    if (answerId === question.correctAnswerId) {
      setScore(s => s + 1);
      setReactionTimes(rt => [...rt, reactionTime]);
    } else {
      setErrors(e => e + 1);
    }
    
    // Generate next
    setQuestion(generateQuestion());
    questionStartTimeRef.current = performance.now();
  }, [question, isActive]);

  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  const averageReactionTime = reactionTimes.length 
    ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length 
    : 0;

  return { 
    state: { question, score, errors, isActive, isFinished, timeLeftMs, averageReactionTime }, 
    startGame, 
    answerQuestion,
    colors: COLORS 
  };
}
