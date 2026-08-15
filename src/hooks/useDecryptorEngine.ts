import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { eventBus } from '../client/analytics/event-bus';
import { RULE_SETS, CARDS_BY_RULESET, ContentCard } from '../lib/content-db';
import {
  CognitiveSessionEventCollector,
  type CompletedSessionAnalyticsJob,
} from '../core/cognitive-events';

interface DecryptorState {
  phase: 'memorize' | 'scan' | 'result';
  level: number;
  score: number;
  hits: number;
  misses: number;
  timeMs: number;
  activeCard: ContentCard | null;
  options: string[];
  rules: { id: number; text: string }[];
  memorizeTimeLeft: number;
}

export const useDecryptorEngine = (initialLevel: number = 1) => {
  const [sessionStarted, setSessionStarted] = useState(false);
  const [state, setState] = useState<DecryptorState>({
    phase: 'memorize',
    level: initialLevel,
    score: 0,
    hits: 0,
    misses: 0,
    timeMs: 60000,
    activeCard: null,
    options: [],
    rules: RULE_SETS.find(rs => rs.id === 'distortions')?.rules || [],
    memorizeTimeLeft: 10,
  });

  const startTimeRef = useRef(0);
  const collectorRef = useRef<CognitiveSessionEventCollector | null>(null);
  const completedAnalyticsJobRef = useRef<CompletedSessionAnalyticsJob | null>(null);

  const cards = useMemo(() => CARDS_BY_RULESET['distortions'] || [], []);

  const generateOptions = useCallback((correctFact: string) => {
    const allFacts = cards.map(c => c.metadata?.fact).filter(f => f && f !== correctFact);
    const shuffled = [...allFacts].sort(() => Math.random() - 0.5);
    const distractors = shuffled.slice(0, 2);
    return [...distractors, correctFact].sort(() => Math.random() - 0.5);
  }, [cards]);

  const nextCard = useCallback(() => {
    const randomCard = cards[Math.floor(Math.random() * cards.length)];
    const options = generateOptions(randomCard.metadata?.fact || 'Неизвестный факт');
    setState(s => ({ ...s, activeCard: randomCard, options }));
  }, [cards, generateOptions]);

  const startGame = useCallback((level: number) => {
    startTimeRef.current = Date.now();
    const startedAt = new Date(startTimeRef.current).toISOString();
    completedAnalyticsJobRef.current = null;
    collectorRef.current = new CognitiveSessionEventCollector({
      sessionId: `decryptor-${startTimeRef.current}-${level}`,
      moduleId: 'decryptor',
      moduleVersion: '1',
      category: 'cognitive',
      startedAt,
    });
    collectorRef.current.record({
      kind: 'trial_started',
      tMs: 0,
      trialType: 'decryptor:fact-selection',
      difficulty: `level-${level}`,
    });
    setSessionStarted(true);
    setState(s => ({
      ...s,
      phase: 'memorize',
      level,
      score: 0,
      hits: 0,
      misses: 0,
      timeMs: 60000,
      memorizeTimeLeft: 10,
    }));
  }, []);

  const handleAnswer = useCallback((selectedFact: string) => {
    if (!state.activeCard) return;

    const isCorrect = selectedFact === state.activeCard.metadata?.fact;
    collectorRef.current?.record({
      kind: 'trial_answered',
      tMs: Math.max(0, Date.now() - startTimeRef.current),
      trialType: 'decryptor:fact-selection',
      isCorrect,
    });
    
    if (isCorrect) {
      eventBus.emit('HIT', { module: 'decryptor', xp: 100 });
      setState(s => ({ ...s, score: s.score + 100, hits: s.hits + 1 }));
    } else {
      eventBus.emit('MISS', { module: 'decryptor' });
      setState(s => ({ ...s, score: Math.max(0, s.score - 50), misses: s.misses + 1 }));
    }

    nextCard();
  }, [state.activeCard, nextCard]);

  // Timers
  useEffect(() => {
    let interval: any;
    if (sessionStarted && state.phase === 'memorize' && state.memorizeTimeLeft > 0) {
      interval = setInterval(() => {
        setState(s => ({ ...s, memorizeTimeLeft: s.memorizeTimeLeft - 1 }));
      }, 1000);
    } else if (state.phase === 'memorize' && state.memorizeTimeLeft === 0) {
      setState(s => ({ ...s, phase: 'scan' }));
      nextCard();
    }
    return () => clearInterval(interval);
  }, [sessionStarted, state.phase, state.memorizeTimeLeft, nextCard]);

  useEffect(() => {
    let interval: any;
    if (state.phase === 'scan' && state.timeMs > 0) {
      interval = setInterval(() => {
        setState(s => {
          if (s.timeMs <= 100) {
            const collector = collectorRef.current;
            if (collector && !completedAnalyticsJobRef.current) {
              const completedAt = new Date(startTimeRef.current + 60_000).toISOString();
              collector.complete(60_000, completedAt);
              completedAnalyticsJobRef.current = collector.createCompletedJob(completedAt);
            }
            return { ...s, phase: 'result', timeMs: 0 };
          }
          return { ...s, timeMs: s.timeMs - 100 };
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [state.phase, state.timeMs]);

  const getCompletedAnalyticsJob = useCallback(() => completedAnalyticsJobRef.current, []);

  return { state, startGame, handleAnswer, getCompletedAnalyticsJob };
};
