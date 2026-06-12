import { useState, useCallback, useRef } from 'react';

export type HypeCategory = 'fact' | 'fallacy' | 'fear' | 'clickbait';

export interface HypeStatement {
  id: string;
  text: string;
  category: HypeCategory;
  explanation: string;
}

const HYPE_DATABASE: HypeStatement[] = [
  {
    id: 'h1',
    text: 'ИИ заменит 99% программистов уже через 2 года, готовьтесь к массовой безработице!',
    category: 'fear',
    explanation: 'Классическая манипуляция страхом (катастрофизация) без опоры на реальные прогнозы.'
  },
  {
    id: 'h2',
    text: 'В 2023 году инвестиции в генеративный ИИ выросли на 400% по сравнению с предыдущим годом.',
    category: 'fact',
    explanation: 'Объективный факт, подтвержденный статистикой.'
  },
  {
    id: 'h3',
    text: 'Если вы не начнете использовать эту нейросеть сегодня, ваша карьера закончена.',
    category: 'fallacy',
    explanation: 'Логическая ошибка "Ложная дилемма" (черно-белое мышление).'
  },
  {
    id: 'h4',
    text: 'ШОК! Этот скрытый промпт заставляет ChatGPT выдавать миллионные бизнес-идеи...',
    category: 'clickbait',
    explanation: 'Типичный кликбейт, играющий на жажде легкой наживы.'
  },
  {
    id: 'h5',
    text: 'Основатель крупной тех-компании заявил, что искусственный интеллект может привести к вымиранию человечества.',
    category: 'fear',
    explanation: 'Манипуляция страхом с использованием авторитета, но без доказательной базы.'
  },
  {
    id: 'h6',
    text: 'Новая модель ИИ успешнее сдает медицинские экзамены, чем 80% студентов-первокурсников.',
    category: 'fact',
    explanation: 'Проверяемый факт на основе тестирования языковых моделей.'
  },
  {
    id: 'h7',
    text: 'Как заработать $10,000 за вечер, ничего не делая (СЕКРЕТНЫЙ АЛГОРИТМ).',
    category: 'clickbait',
    explanation: 'Кликбейт, апеллирующий к нереалистичным ожиданиям.'
  },
  {
    id: 'h8',
    text: 'Все успешные стартапы используют ИИ. Ваш стартап не использует ИИ, значит он провалится.',
    category: 'fallacy',
    explanation: 'Логическая ошибка (non sequitur / поспешное обобщение).'
  }
];

export function useHypeFilterEngine(seed: number, level: number) {
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Randomize statements based on seed
  const [statements, setStatements] = useState<HypeStatement[]>([]);
  const [lastFeedback, setLastFeedback] = useState<{ correct: boolean, explanation: string } | null>(null);

  const startSession = useCallback(() => {
    // Basic shuffle
    const shuffled = [...HYPE_DATABASE].sort(() => Math.random() - 0.5);
    setStatements(shuffled.slice(0, 5)); // 5 items per session
    setCurrentIndex(0);
    setScore(0);
    setErrors(0);
    setIsActive(true);
    setIsFinished(false);
    setLastFeedback(null);
  }, []);

  const submitAnswer = useCallback((selectedCategory: HypeCategory) => {
    if (!isActive || isFinished) return;

    const currentStatement = statements[currentIndex];
    const isCorrect = selectedCategory === currentStatement.category;

    setLastFeedback({
      correct: isCorrect,
      explanation: currentStatement.explanation
    });

    if (isCorrect) {
      setScore(prev => prev + 20);
    } else {
      setErrors(prev => prev + 1);
    }

    setTimeout(() => {
      setLastFeedback(null);
      if (currentIndex + 1 >= statements.length) {
        setIsFinished(true);
        setIsActive(false);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }, 2500); // Wait 2.5s to read feedback
  }, [isActive, isFinished, currentIndex, statements]);

  return {
    currentStatement: statements[currentIndex],
    progress: (currentIndex / (statements.length || 1)) * 100,
    isActive,
    isFinished,
    score,
    errors,
    startSession,
    submitAnswer,
    itemsRemaining: statements.length - currentIndex,
    lastFeedback
  };
}
