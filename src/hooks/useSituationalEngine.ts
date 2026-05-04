import { useState, useCallback, useEffect } from 'react';

export interface SituationalQuestion {
  id: string;
  scenario: string;
  options: {
    id: string;
    text: string;
    score: number; // 0 to 10
  }[];
}

const QUESTIONS: SituationalQuestion[] = [
  {
    id: 'q1',
    scenario: 'Ваш ключевой сотрудник неожиданно заявляет об увольнении за неделю до сдачи важного проекта. Ваши действия?',
    options: [
      { id: 'o1', text: 'Попытаться удержать сотрудника, предложив премию или повышение.', score: 5 },
      { id: 'o2', text: 'Немедленно перераспределить задачи между оставшимися членами команды и сообщить клиенту о возможных рисках.', score: 10 },
      { id: 'o3', text: 'Принудить сотрудника отработать положенные 2 недели по ТК РФ.', score: 2 },
      { id: 'o4', text: 'Взять все задачи сотрудника на себя, чтобы не тревожить остальную команду.', score: 0 }
    ]
  },
  {
    id: 'q2',
    scenario: 'Вы заметили, что конкурент выпустил продукт с функционалом, который вы только планируете разработать через полгода.',
    options: [
      { id: 'o1', text: 'Ускорить разработку в ущерб качеству, чтобы выпустить аналог как можно быстрее.', score: 2 },
      { id: 'o2', text: 'Проанализировать продукт конкурента, найти его слабые стороны и сделать акцент на них в своей версии.', score: 10 },
      { id: 'o3', text: 'Отказаться от функции, так как вы уже опоздали на рынок.', score: 0 },
      { id: 'o4', text: 'Подать на конкурента в суд за кражу идеи.', score: 0 }
    ]
  },
  {
    id: 'q3',
    scenario: 'Клиент недоволен результатами первого этапа работ и угрожает разорвать контракт. При этом команда выполнила всё строго по ТЗ.',
    options: [
      { id: 'o1', text: 'Доказывать клиенту, что всё сделано по ТЗ, ссылаться на подписанные документы.', score: 2 },
      { id: 'o2', text: 'Согласиться переделать всё бесплатно, лишь бы сохранить клиента.', score: 4 },
      { id: 'o3', text: 'Организовать встречу, чтобы понять реальные боли клиента, и предложить компромиссный план правок.', score: 10 },
      { id: 'o4', text: 'Разорвать контракт первыми, чтобы не тратить время на токсичного клиента.', score: 0 }
    ]
  }
];

export function useSituationalEngine() {
  const [questions, setQuestions] = useState<SituationalQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [timeMs, setTimeMs] = useState(0);

  const startGame = useCallback(() => {
    // Shuffle options a bit, keep questions same order for now
    const shuffledQs = QUESTIONS.map(q => ({
      ...q,
      options: [...q.options].sort(() => Math.random() - 0.5)
    }));
    
    setQuestions(shuffledQs);
    setCurrentIndex(0);
    setScore(0);
    setIsActive(true);
    setIsFinished(false);
    setStartTime(performance.now());
  }, []);

  const answerQuestion = useCallback((optionScore: number) => {
    setScore(s => s + optionScore);
    
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(i => i + 1);
    } else {
      setIsActive(false);
      setIsFinished(true);
      setTimeMs(performance.now() - startTime);
    }
  }, [currentIndex, questions, startTime]);

  // Expose total possible score
  const maxScore = questions.reduce((acc, q) => acc + Math.max(...q.options.map(o => o.score)), 0) || 30;

  return { state: { questions, currentIndex, score, isActive, isFinished, timeMs, maxScore }, startGame, answerQuestion };
}
