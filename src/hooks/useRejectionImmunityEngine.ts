import { useState, useCallback } from 'react';

export interface RejectionChallenge {
  id: string;
  context: string;
  options: {
    id: string;
    text: string;
    type: 'safe' | 'bold' | 'avoid';
    result: 'yes' | 'no' | 'none';
    feedback: string;
  }[];
}

const REJECTION_DATABASE: RejectionChallenge[] = [
  {
    id: 'rj1',
    context: 'Вы зашли в кофейню. У вас есть возможность попросить о чем-то.',
    options: [
      {
        id: 'o1',
        text: 'Попросить обычный капучино.',
        type: 'safe',
        result: 'yes',
        feedback: 'Комфортно, но скучно. Вы не расширили свои границы.'
      },
      {
        id: 'o2',
        text: 'Попросить сделать капучино бесплатно или со скидкой 50% просто так.',
        type: 'bold',
        result: 'no',
        feedback: 'Отказ получен! Вы молодец. Вы пережили «Нет» и мир не рухнул.'
      },
      {
        id: 'o3',
        text: 'Вообще ничего не покупать и уйти.',
        type: 'avoid',
        result: 'none',
        feedback: 'Избегание ситуации. Страх отказа победил.'
      }
    ]
  },
  {
    id: 'rj2',
    context: 'У вас есть крутая, но недоработанная идея для проекта. Ваш начальник занят.',
    options: [
      {
        id: 'o1',
        text: 'Подойти и попросить 10 минут его времени прямо сейчас, чтобы запитчить идею.',
        type: 'bold',
        result: 'no',
        feedback: 'Отличная попытка! Начальник отказал, но вы сделали смелый шаг и прокачали иммунитет.'
      },
      {
        id: 'o2',
        text: 'Отправить идею на почту и ждать.',
        type: 'safe',
        result: 'none',
        feedback: 'Безопасный путь. Вы избежали прямого отказа, но и шанс на успех снизился.'
      },
      {
        id: 'o3',
        text: 'Решить, что идея недостаточно хороша, и забыть о ней.',
        type: 'avoid',
        result: 'none',
        feedback: 'Самоотказ. Вы сдались еще до того, как вам кто-то отказал.'
      }
    ]
  },
  {
    id: 'rj3',
    context: 'На конференции вы видите известного эксперта в вашей сфере.',
    options: [
      {
        id: 'o1',
        text: 'Просто слушать его выступление из зала.',
        type: 'avoid',
        result: 'none',
        feedback: 'Вы упустили возможность.'
      },
      {
        id: 'o2',
        text: 'Подойти после лекции и сказать «Спасибо за доклад».',
        type: 'safe',
        result: 'yes',
        feedback: 'Приятно, но стандартно. Эксперт кивнул и ушел.'
      },
      {
        id: 'o3',
        text: 'Подойти и предложить ему стать вашим ментором.',
        type: 'bold',
        result: 'no',
        feedback: 'Уверенное «Нет»! Зато теперь вы знаете, что можете задавать смелые вопросы кому угодно.'
      }
    ]
  }
];

export function useRejectionImmunityEngine(seed: number, level: number) {
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0); // Regular points
  const [immunityPoints, setImmunityPoints] = useState(0); // Special Rejection Points
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [scenarios, setScenarios] = useState<RejectionChallenge[]>([]);
  const [lastFeedback, setLastFeedback] = useState<{ type: string, text: string, result: string } | null>(null);

  const startSession = useCallback(() => {
    const shuffled = [...REJECTION_DATABASE].sort(() => Math.random() - 0.5);
    setScenarios(shuffled.slice(0, 3));
    setCurrentIndex(0);
    setScore(0);
    setImmunityPoints(0);
    setIsActive(true);
    setIsFinished(false);
    setLastFeedback(null);
  }, []);

  const submitAnswer = useCallback((optionId: string) => {
    if (!isActive || isFinished) return;

    const currentScenario = scenarios[currentIndex];
    const selectedOption = currentScenario.options.find(o => o.id === optionId);
    
    if (!selectedOption) return;

    setLastFeedback({
      type: selectedOption.type,
      text: selectedOption.feedback,
      result: selectedOption.result
    });

    if (selectedOption.type === 'bold') {
      setImmunityPoints(prev => prev + 100);
    } else if (selectedOption.type === 'safe') {
      setScore(prev => prev + 20);
    }

    setTimeout(() => {
      setLastFeedback(null);
      if (currentIndex + 1 >= scenarios.length) {
        setIsFinished(true);
        setIsActive(false);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }, 3000);
  }, [isActive, isFinished, currentIndex, scenarios]);

  return {
    currentScenario: scenarios[currentIndex],
    progress: (currentIndex / (scenarios.length || 1)) * 100,
    isActive,
    isFinished,
    score,
    immunityPoints,
    startSession,
    submitAnswer,
    lastFeedback
  };
}
