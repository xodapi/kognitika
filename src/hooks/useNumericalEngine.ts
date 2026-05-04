import { useState, useEffect, useCallback, useRef } from 'react';

type QuestionType = 'percentage_change' | 'share' | 'weighted_average';

export interface NumericalQuestion {
  id: string;
  type: QuestionType;
  title: string;
  data: any; 
  correctAnswer: number;
  options: number[];
}

const generateQuestion = (): NumericalQuestion => {
  const types: QuestionType[] = ['percentage_change', 'share', 'weighted_average'];
  const type = types[Math.floor(Math.random() * types.length)];
  const id = Math.random().toString(36).substring(7);

  let title = '';
  let data: any = {};
  let correctAnswer = 0;

  if (type === 'percentage_change') {
    const oldVal = Math.floor(Math.random() * 500) + 100;
    const newVal = Math.floor(Math.random() * 500) + 100;
    title = `Выручка компании в 2022 году составила ${oldVal} млн, а в 2023 - ${newVal} млн. Укажите процентное изменение.`;
    data = { oldVal, newVal, labels: ['2022', '2023'] };
    correctAnswer = Math.round(((newVal - oldVal) / oldVal) * 100);
  } else if (type === 'share') {
    const total = 1000;
    const partA = Math.floor(Math.random() * 400) + 100;
    const partB = Math.floor(Math.random() * 300) + 100;
    const partC = total - partA - partB;
    const target = ['Отдел А', 'Отдел В', 'Отдел С'][Math.floor(Math.random() * 3)];
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
      value: Math.floor(Math.random() * 50) + 10,
      weight: Math.floor(Math.random() * 5) + 1
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

  // Generate distinct options
  const options = new Set<number>();
  options.add(correctAnswer);
  while(options.size < 4) {
    const shift = Math.floor(Math.random() * 20) - 10;
    if (shift !== 0) options.add(correctAnswer + shift);
  }

  return {
    id,
    type,
    title,
    data,
    correctAnswer,
    options: Array.from(options).sort(() => Math.random() - 0.5)
  };
}

export function useNumericalEngine() {
  const [questions, setQuestions] = useState<NumericalQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(60000); // 60s per test round
  
  const timerRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const startGame = useCallback(() => {
    const newQuestions = Array.from({ length: 5 }).map(() => generateQuestion());
    setQuestions(newQuestions);
    setCurrentIndex(0);
    setScore(0);
    setIsActive(true);
    setIsFinished(false);
    setTimeLeftMs(60000);
    lastTickRef.current = performance.now();

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

  const stopGame = useCallback(() => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    setIsActive(false);
    setIsFinished(true);
  }, []);

  const answerQuestion = useCallback((answer: number) => {
    const curQ = questions[currentIndex];
    if (curQ.correctAnswer === answer) {
      setScore(s => s + 1);
    }
    
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(i => i + 1);
    } else {
      setIsActive(false);
      setIsFinished(true);
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    }
  }, [currentIndex, questions]);

  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  return { 
    state: { questions, currentIndex, score, isActive, isFinished, timeLeftMs }, 
    startGame, 
    stopGame, 
    answerQuestion 
  };
}
