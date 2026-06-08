import { useState, useCallback, useEffect, useRef } from 'react';

export interface DistractionLog {
  id: string;
  time: number; // seconds from start
  type: 'internal' | 'external' | 'emotion' | 'idea';
}

export function useDeepFocusEngine(initialTimeMinutes: number = 25) {
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(initialTimeMinutes * 60);
  const [distractions, setDistractions] = useState<DistractionLog[]>([]);
  const [score, setScore] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startSession = useCallback(() => {
    setTimeLeft(initialTimeMinutes * 60);
    setDistractions([]);
    setScore(0);
    setIsActive(true);
    setIsFinished(false);
  }, [initialTimeMinutes]);

  const stopSession = useCallback(() => {
    setIsActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const finishSession = useCallback(() => {
    stopSession();
    setIsFinished(true);
    // Base score is 100 for finishing. Minus 10 per distraction.
    const calculatedScore = Math.max(10, 100 - distractions.length * 10);
    setScore(calculatedScore);
  }, [stopSession, distractions]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            finishSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, finishSession]);

  const logDistraction = useCallback((type: 'internal' | 'external' | 'emotion' | 'idea') => {
    if (!isActive) return;
    
    setDistractions(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        time: initialTimeMinutes * 60 - timeLeft,
        type
      }
    ]);
  }, [isActive, timeLeft, initialTimeMinutes]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return {
    isActive,
    isFinished,
    timeLeft,
    formattedTime: formatTime(timeLeft),
    progress: 100 - (timeLeft / (initialTimeMinutes * 60)) * 100,
    distractions,
    score,
    startSession,
    stopSession,
    finishSession,
    logDistraction
  };
}
