import { useState, useEffect, useCallback, useRef } from 'react';
import { emitEvent } from './useEventBus';

type QuestionType = 'percentage_change' | 'share' | 'weighted_average';

export interface NumericalQuestion {
  id: string;
  type: QuestionType;
  title: string;
  data: any; 
  correctAnswer: number;
  options: number[];
}

export function useNumericalEngine() {
  const [state, setState] = useState({
    questions: [] as NumericalQuestion[],
    currentIndex: 0,
    score: 0,
    errors: 0,
    isActive: false,
    isFinished: false,
    timeLeftMs: 60000
  });

  const timerRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const seedRef = useRef<number | undefined>(undefined);

  const seededRandom = () => {
    if (seedRef.current !== undefined) {
      seedRef.current = (seedRef.current * 9301 + 49297) % 233280;
      return seedRef.current / 233280;
    }
    return Math.random();
  };

  const generateQuestion = useCallback((): NumericalQuestion => {
    const types: QuestionType[] = ['percentage_change', 'share', 'weighted_average'];
    const type = types[Math.floor(seededRandom() * types.length)];
    const id = seededRandom().toString(36).substring(7);

    let title = '';
    let data: any = {};
    let correctAnswer = 0;

    if (type === 'percentage_change') {
      const oldVal = Math.floor(seededRandom() * 500) + 100;
      const newVal = Math.floor(seededRandom() * 500) + 100;
      title = `Выручка компании в 2022 году составила ${oldVal} млн, а в 2023 - ${newVal} млн. Укажите процентное изменение.`;
      data = { oldVal, newVal, labels: ['2022', '2023'] };
      correctAnswer = Math.round(((newVal - oldVal) / oldVal) * 100);
    } else if (type === 'share') {
      const total = 1000;
      const partA = Math.floor(seededRandom() * 400) + 100;
      const partB = Math.floor(seededRandom() * 300) + 100;
      const partC = total - partA - partB;
      const target = ['Отдел А', 'Отдел В', 'Отдел С'][Math.floor(seededRandom() * 3)];
      title = `Какова доля (%) подразделения "${target}" в общем бюджете предприятия?`;
      data = {
        total,
        parts: [
          { name: 'Отдел А', value: partA },
          { name: 'Отдел В', value: partB },
          { name: 'Отдел С', value: partC }
        ],
        target
      };
      const targetValue = data.parts.find((p: any) => p.name === target)?.value || 0;
      correctAnswer = Math.round((targetValue / total) * 100);
    } else if (type === 'weighted_average') {
      const items = Array.from({ length: 3 }).map((_, i) => ({
        name: `Проект ${i + 1}`,
        value: Math.floor(seededRandom() * 50) + 10,
        weight: Math.floor(seededRandom() * 5) + 1
      }));
      title = `Рассчитайте средневзвешенную рентабельность портфеля проектов.`;
      data = { items };
      let sumProd = 0;
      let sumWeight = 0;
      items.forEach(item => {
        sumProd += item.value * item.weight;
        sumWeight += item.weight;
      });
      correctAnswer = Math.round(sumProd / sumWeight);
    }

    const options = new Set<number>();
    options.add(correctAnswer);
    while(options.size < 4) {
      const shift = Math.floor(seededRandom() * 20) - 10;
      if (shift !== 0) options.add(correctAnswer + shift);
    }

    return {
      id,
      type,
      title,
      data,
      correctAnswer,
      options: Array.from(options).sort(() => seededRandom() - 0.5)
    };
  }, []);

  const startGame = useCallback((seed?: number) => {
    seedRef.current = seed;
    const newQuestions = Array.from({ length: 5 }).map(() => generateQuestion());
    
    setState({
      questions: newQuestions,
      currentIndex: 0,
      score: 0,
      errors: 0,
      isActive: true,
      isFinished: false,
      timeLeftMs: 60000
    });
    lastTickRef.current = performance.now();

    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    
    const updateTime = () => {
      const now = performance.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      setState(prev => {
        if (!prev.isActive || prev.isFinished) return prev;
        const next = Math.max(0, prev.timeLeftMs - delta);
        if (next === 0) {
           return { ...prev, timeLeftMs: 0, isActive: false, isFinished: true };
        }
        return { ...prev, timeLeftMs: next };
      });
      timerRef.current = requestAnimationFrame(updateTime);
    };
    timerRef.current = requestAnimationFrame(updateTime);
  }, [generateQuestion]);


  const answerQuestion = useCallback((answer: number) => {
    setState(prev => {
      if (!prev.isActive || prev.isFinished) return prev;
      
      const curQ = prev.questions[prev.currentIndex];
      const isCorrect = curQ.correctAnswer === answer;

      emitEvent('CELL_CLICK', { num: prev.currentIndex, isCorrect, reactionTimeMs: 0 });

      if (!isCorrect) {
        emitEvent('MISTAKE_MADE', { expected: curQ.correctAnswer, actual: answer });
      }

      const isLast = prev.currentIndex + 1 >= prev.questions.length;
      if (isLast) {
        emitEvent('TRAINING_COMPLETE', {
          type: 'NUMERICAL_ANALYSIS',
          score: isCorrect ? prev.score + 1 : prev.score,
          errors: isCorrect ? prev.errors : prev.errors + 1,
          timeMs: 60000 - prev.timeLeftMs,
          level: 1
        });
        return {
          ...prev,
          score: isCorrect ? prev.score + 1 : prev.score,
          errors: isCorrect ? prev.errors : prev.errors + 1,
          isActive: false,
          isFinished: true
        };
      }

      return {
        ...prev,
        currentIndex: prev.currentIndex + 1,
        score: isCorrect ? prev.score + 1 : prev.score,
        errors: isCorrect ? prev.errors : prev.errors + 1
      };
    });
  }, []);

  const stopGame = useCallback(() => {
    setState(s => ({ ...s, isActive: false, isFinished: true }));
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  return { state, startGame, stopGame, answerQuestion };
}
