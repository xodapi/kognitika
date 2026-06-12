import { useState, useCallback } from 'react';

export interface ReframingScenario {
  id: string;
  negativeSituation: string;
  options: {
    id: string;
    text: string;
    isOptimal: boolean;
    feedback: string;
  }[];
}

const REFRAMING_DATABASE: ReframingScenario[] = [
  {
    id: 'r1',
    negativeSituation: 'Меня уволили с работы из-за сокращения штата.',
    options: [
      {
        id: 'o1',
        text: 'Это ужасно, я неудачник и теперь не найду работу.',
        isOptimal: false,
        feedback: 'Это катастрофизация. Попробуйте найти возможность в этой ситуации.'
      },
      {
        id: 'o2',
        text: 'Наконец-то у меня есть время и мотивация сменить профессию на ту, о которой я давно мечтал.',
        isOptimal: true,
        feedback: 'Отличный рефрейминг! Кризис как точка роста.'
      },
      {
        id: 'o3',
        text: 'Они все равно платили мало, так что невелика потеря.',
        isOptimal: false,
        feedback: 'Обесценивание. Это защитный механизм, а не конструктивный рефрейминг.'
      }
    ]
  },
  {
    id: 'r2',
    negativeSituation: 'Я провалил важную презентацию перед инвесторами.',
    options: [
      {
        id: 'o1',
        text: 'Я никогда не научусь выступать публично.',
        isOptimal: false,
        feedback: 'Обобщение и выученная беспомощность.'
      },
      {
        id: 'o2',
        text: 'Это не моя вина, инвесторы были в плохом настроении.',
        isOptimal: false,
        feedback: 'Перекладывание ответственности не помогает расти.'
      },
      {
        id: 'o3',
        text: 'Я получил четкий фидбек о том, какие вопросы задают инвесторы. В следующий раз я буду готов к ним.',
        isOptimal: true,
        feedback: 'Прекрасно! Ошибка — это ценная обратная связь.'
      }
    ]
  },
  {
    id: 'r3',
    negativeSituation: 'Мой стартап не взлетел, мы закрываемся.',
    options: [
      {
        id: 'o1',
        text: 'Я потратил год впустую.',
        isOptimal: false,
        feedback: 'Обесценивание полученного опыта.'
      },
      {
        id: 'o2',
        text: 'Я прошел интенсивный курс предпринимательства на практике, и теперь знаю, как не надо делать.',
        isOptimal: true,
        feedback: 'Отличный рефрейминг! Вы сфокусировались на приобретенном капитале знаний.'
      },
      {
        id: 'o3',
        text: 'Рынок просто еще не готов к нашему продукту.',
        isOptimal: false,
        feedback: 'Снятие с себя ответственности. Лишает возможности сделать выводы.'
      }
    ]
  }
];

export function useReframingEngine(seed: number, level: number) {
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [scenarios, setScenarios] = useState<ReframingScenario[]>([]);
  const [lastFeedback, setLastFeedback] = useState<{ isOptimal: boolean, text: string } | null>(null);

  const startSession = useCallback(() => {
    const shuffled = [...REFRAMING_DATABASE].sort(() => Math.random() - 0.5);
    setScenarios(shuffled.slice(0, 3)); // 3 scenarios per session
    setCurrentIndex(0);
    setScore(0);
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
      isOptimal: selectedOption.isOptimal,
      text: selectedOption.feedback
    });

    if (selectedOption.isOptimal) {
      setScore(prev => prev + 100);
    }

    setTimeout(() => {
      setLastFeedback(null);
      if (currentIndex + 1 >= scenarios.length) {
        setIsFinished(true);
        setIsActive(false);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }, 2500);
  }, [isActive, isFinished, currentIndex, scenarios]);

  return {
    currentScenario: scenarios[currentIndex],
    progress: (currentIndex / (scenarios.length || 1)) * 100,
    isActive,
    isFinished,
    score,
    startSession,
    submitAnswer,
    lastFeedback
  };
}
