import { useState, useCallback, useEffect, useRef } from 'react';
import {
  CognitiveSessionEventCollector,
  type CompletedSessionAnalyticsJob,
} from '../core/cognitive-events';

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
  const startTimeRef = useRef(0);
  const sessionStartedAtRef = useRef<string | null>(null);
  const questionsRef = useRef<SituationalQuestion[]>([]);
  const currentIndexRef = useRef(0);
  const collectorRef = useRef<CognitiveSessionEventCollector | null>(null);
  const completedAnalyticsJobRef = useRef<CompletedSessionAnalyticsJob | null>(null);

  const startGame = useCallback(() => {
    // Shuffle options a bit, keep questions same order for now
    const shuffledQs = QUESTIONS.map(q => ({
      ...q,
      options: [...q.options].sort(() => Math.random() - 0.5)
    }));
    
    const startedAtMs = performance.now();
    startTimeRef.current = startedAtMs;
    questionsRef.current = shuffledQs;
    currentIndexRef.current = 0;
    const startedAt = new Date().toISOString();
    sessionStartedAtRef.current = startedAt;
    completedAnalyticsJobRef.current = null;
    collectorRef.current = new CognitiveSessionEventCollector({
      sessionId: `situational-${Date.now()}`,
      moduleId: 'situational',
      moduleVersion: '1',
      category: 'cognitive',
      startedAt,
    });
    collectorRef.current.record({
      kind: 'trial_started',
      tMs: 0,
      trialType: 'situational:judgment',
    });
    setQuestions(shuffledQs);
    setCurrentIndex(0);
    setScore(0);
    setIsActive(true);
    setIsFinished(false);
    setStartTime(startedAtMs);
  }, []);

  const answerQuestion = useCallback((optionScore: number) => {
    const currentQuestion = questionsRef.current[currentIndexRef.current];
    if (!currentQuestion) return;
    const isCorrect = optionScore === Math.max(...currentQuestion.options.map((option) => option.score));
    const elapsedMs = Math.max(0, Math.floor(performance.now() - startTimeRef.current));
    collectorRef.current?.record({
      kind: 'trial_answered',
      tMs: elapsedMs,
      trialType: 'situational:judgment',
      isCorrect,
    });
    setScore(s => s + optionScore);

    const nextIndex = currentIndexRef.current + 1;
    currentIndexRef.current = nextIndex;
    if (nextIndex < questionsRef.current.length) {
      setCurrentIndex(nextIndex);
    } else {
      const collector = collectorRef.current;
      const startedAt = sessionStartedAtRef.current;
      if (collector && startedAt && !completedAnalyticsJobRef.current) {
        const completedAt = new Date(Date.parse(startedAt) + elapsedMs).toISOString();
        collector.complete(elapsedMs, completedAt);
        completedAnalyticsJobRef.current = collector.createCompletedJob(completedAt);
      }
      setIsActive(false);
      setIsFinished(true);
      setTimeMs(elapsedMs);
    }
  }, []);

  // Expose total possible score
  const maxScore = questions.reduce((acc, q) => acc + Math.max(...q.options.map(o => o.score)), 0) || 30;

  const getCompletedAnalyticsJob = useCallback(() => completedAnalyticsJobRef.current, []);

  return { state: { questions, currentIndex, score, isActive, isFinished, timeMs, maxScore }, startGame, answerQuestion, getCompletedAnalyticsJob };
}
