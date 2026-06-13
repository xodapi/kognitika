import { useState, useEffect, useCallback, useMemo } from 'react';
import { eventBus } from '../client/analytics/event-bus';
import { RULE_SETS, CARDS_BY_RULESET, ContentCard } from '../lib/content-db';

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
    
    if (isCorrect) {
      eventBus.emit('HIT', { module: 'decryptor', xp: 100 } as any);
      setState(s => ({ ...s, score: s.score + 100, hits: s.hits + 1 }));
    } else {
      eventBus.emit('MISS', { module: 'decryptor' } as any);
      setState(s => ({ ...s, score: Math.max(0, s.score - 50), misses: s.misses + 1 }));
    }

    nextCard();
  }, [state.activeCard, nextCard]);

  // Timers
  useEffect(() => {
    let interval: any;
    if (state.phase === 'memorize' && state.memorizeTimeLeft > 0) {
      interval = setInterval(() => {
        setState(s => ({ ...s, memorizeTimeLeft: s.memorizeTimeLeft - 1 }));
      }, 1000);
    } else if (state.phase === 'memorize' && state.memorizeTimeLeft === 0) {
      setState(s => ({ ...s, phase: 'scan' }));
      nextCard();
    }
    return () => clearInterval(interval);
  }, [state.phase, state.memorizeTimeLeft, nextCard]);

  useEffect(() => {
    let interval: any;
    if (state.phase === 'scan' && state.timeMs > 0) {
      interval = setInterval(() => {
        setState(s => {
          if (s.timeMs <= 100) {
            return { ...s, phase: 'result', timeMs: 0 };
          }
          return { ...s, timeMs: s.timeMs - 100 };
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [state.phase, state.timeMs]);

  return { state, startGame, handleAnswer };
};
