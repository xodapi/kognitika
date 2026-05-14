/**
 * Module: Детектор коллизий (Смысловой фильтр)
 * Тренирует быстрое семантическое сканирование: запомни правила, отсей нарушителей.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { emitEvent } from './useEventBus';
import { getSessionForLevel, ContentCard as DBCard } from '../lib/content-db';

export interface Rule {
  id: number;
  text: string;
}

export interface Card {
  id: number;
  text: string;
  isViolation: boolean; // Does this violate the rules?
  ruleRef?: number; // Which rule it violates
}

type Phase = 'memorize' | 'filter' | 'result';

export interface CollisionState {
  phase: Phase;
  rules: Rule[];
  cards: Card[];
  activeCard: Card | null;
  cardQueue: Card[];
  hits: number;       // Correctly identified violations
  misses: number;     // Missed violations
  falsePositives: number; // Clicked non-violations
  score: number;
  maxScore: number;
  timeMs: number;
  level: number;
  memorizeTimeLeft: number;
  isFinished: boolean;
  cardSpeedMs: number;
}

// --- Scenario bank ---
interface Scenario {
  rules: Rule[];
  cards: Card[];
}

const SCENARIOS: Scenario[] = [
  {
    rules: [
      { id: 1, text: 'Объект А всегда больше объекта Б' },
      { id: 2, text: 'Процесс X запускается только после Y' },
    ],
    cards: [
      { id: 1, text: 'А = 10, Б = 5 → обработка выполнена', isViolation: false },
      { id: 2, text: 'Б = 100, А = 3 → итог принят', isViolation: true, ruleRef: 1 },
      { id: 3, text: 'Y завершён, запускаем X', isViolation: false },
      { id: 4, text: 'X активирован до запуска Y', isViolation: true, ruleRef: 2 },
      { id: 5, text: 'А = 7, Б = 2 → синхронизация ОК', isViolation: false },
      { id: 6, text: 'Б = А → условие принято', isViolation: true, ruleRef: 1 },
      { id: 7, text: 'Y в процессе, X ожидает', isViolation: false },
      { id: 8, text: 'X инициирован одновременно с Y', isViolation: true, ruleRef: 2 },
    ],
  },
  {
    rules: [
      { id: 1, text: 'Все транзакции должны быть подтверждены получателем' },
      { id: 2, text: 'Статус «завершено» устанавливается только после проверки' },
      { id: 3, text: 'Уведомление отправляется до закрытия задачи' },
    ],
    cards: [
      { id: 1, text: 'Транзакция подтверждена, статус обновлён', isViolation: false },
      { id: 2, text: 'Задача закрыта, уведомление в очереди', isViolation: true, ruleRef: 3 },
      { id: 3, text: 'Уведомление отправлено, задача закрыта', isViolation: false },
      { id: 4, text: 'Статус «завершено» без проверки', isViolation: true, ruleRef: 2 },
      { id: 5, text: 'Получатель подтвердил, транзакция прошла', isViolation: false },
      { id: 6, text: 'Транзакция прошла без подтверждения', isViolation: true, ruleRef: 1 },
      { id: 7, text: 'Проверка пройдена → статус завершено', isViolation: false },
      { id: 8, text: 'Задача в статусе «завершено», проверка идёт', isViolation: true, ruleRef: 2 },
      { id: 9, text: 'Уведомление до закрытия → норма', isViolation: false },
    ],
  },
  {
    rules: [
      { id: 1, text: 'Модуль B зависит от модуля A — A грузится первым' },
      { id: 2, text: 'Кэш очищается только при ошибке уровня CRITICAL' },
      { id: 3, text: 'Логи хранятся не менее 30 дней' },
    ],
    cards: [
      { id: 1, text: 'B загружен раньше A', isViolation: true, ruleRef: 1 },
      { id: 2, text: 'ERROR уровень → кэш очищен', isViolation: true, ruleRef: 2 },
      { id: 3, text: 'CRITICAL → кэш очищен → перезапуск', isViolation: false },
      { id: 4, text: 'A загружен, B инициализирован', isViolation: false },
      { id: 5, text: 'Логи за 15 дней удалены для экономии места', isViolation: true, ruleRef: 3 },
      { id: 6, text: 'Логи 45 дней → ротация выполнена', isViolation: false },
      { id: 7, text: 'B ждёт загрузки A → OK', isViolation: false },
      { id: 8, text: 'WARNING → кэш очищен', isViolation: true, ruleRef: 2 },
    ],
  },
];

const MEMORIZE_SECS = 4;

function getScenario(level: number, userId?: number) {
  const seed = userId ?? Math.floor(Math.random() * 999999);
  const session = getSessionForLevel(level, seed);
  return {
    rules: session.rules,
    cards: session.cards.map((c: DBCard) => ({
      id: Math.random(),
      text: c.text,
      isViolation: c.isViolation,
      ruleRef: c.ruleRef,
    } as Card)),
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function useCollisionEngine() {
  const [state, setState] = useState<CollisionState>({
    phase: 'memorize',
    rules: [],
    cards: [],
    activeCard: null,
    cardQueue: [],
    hits: 0,
    misses: 0,
    falsePositives: 0,
    score: 0,
    maxScore: 0,
    timeMs: 0,
    level: 1,
    memorizeTimeLeft: MEMORIZE_SECS,
    isFinished: false,
    cardSpeedMs: 3000,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const memorizeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const queueRef = useRef<Card[]>([]);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const fpRef = useRef(0);

  useEffect(() => () => {
    [timerRef, memorizeRef, cardTimerRef].forEach(r => r.current && clearInterval(r.current));
  }, []);

  const showNextCard = useCallback((speedMs: number) => {
    if (queueRef.current.length === 0) {
      // Done
      if (timerRef.current) clearInterval(timerRef.current);
      const timeMs = Date.now() - startTimeRef.current;
      const violations = queueRef.current.filter(c => c.isViolation).length;
      
      setState(prev => {
        const finalScore = Math.max(0, hitsRef.current - fpRef.current);
        emitEvent('TRAINING_COMPLETE', {
          type: 'SCHULTE',
          timeMs,
          score: finalScore,
          level: prev.level,
          metadata: { module: 'collision', hits: hitsRef.current, misses: missesRef.current, fp: fpRef.current },
        });
        return {
          ...prev,
          phase: 'result',
          activeCard: null,
          score: finalScore,
          hits: hitsRef.current,
          misses: missesRef.current,
          falsePositives: fpRef.current,
          timeMs,
          isFinished: true,
        };
      });
      return;
    }

    const card = queueRef.current.shift()!;
    setState(prev => ({ ...prev, activeCard: card, cardQueue: [...queueRef.current] }));

    cardTimerRef.current = setTimeout(() => {
      // Card expired — if it was a violation, count as miss
      setState(prev => {
        if (prev.activeCard?.isViolation) {
          missesRef.current += 1;
        }
        return prev;
      });
      showNextCard(speedMs);
    }, speedMs);
  }, []);

  const startGame = useCallback((level: number = 1) => {
    [timerRef, memorizeRef, cardTimerRef].forEach(r => r.current && clearInterval(r.current));
    hitsRef.current = 0;
    missesRef.current = 0;
    fpRef.current = 0;

    const scenario = getScenario(level);
    const violations = scenario.cards.filter(c => c.isViolation).length;
    const speedMs = Math.max(1200, 3000 - (level - 1) * 300);
    const shuffled = shuffle(scenario.cards);
    queueRef.current = [...shuffled];

    setState({
      phase: 'memorize',
      rules: scenario.rules,
      cards: scenario.cards,
      activeCard: null,
      cardQueue: shuffled,
      hits: 0,
      misses: 0,
      falsePositives: 0,
      score: 0,
      maxScore: violations,
      timeMs: 0,
      level,
      memorizeTimeLeft: MEMORIZE_SECS,
      isFinished: false,
      cardSpeedMs: speedMs,
    });

    let timeLeft = MEMORIZE_SECS;
    memorizeRef.current = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        clearInterval(memorizeRef.current!);
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          setState(prev => ({ ...prev, timeMs: Date.now() - startTimeRef.current }));
        }, 100);
        setState(prev => ({ ...prev, phase: 'filter', memorizeTimeLeft: 0 }));
        showNextCard(speedMs);
      } else {
        setState(prev => ({ ...prev, memorizeTimeLeft: timeLeft }));
      }
    }, 1000);
  }, [showNextCard]);

  const flagCard = useCallback((card: Card) => {
    if (cardTimerRef.current) clearTimeout(cardTimerRef.current);

    if (card.isViolation) {
      hitsRef.current += 1;
      setState(prev => ({ ...prev, hits: hitsRef.current }));
    } else {
      fpRef.current += 1;
      setState(prev => ({ ...prev, falsePositives: fpRef.current }));
    }

    setState(prev => ({
      ...prev,
      score: Math.max(0, hitsRef.current - fpRef.current),
    }));

    showNextCard(state.cardSpeedMs);
  }, [showNextCard, state.cardSpeedMs]);

  return { state, startGame, flagCard };
}
