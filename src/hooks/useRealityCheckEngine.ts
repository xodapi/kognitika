import { useState, useEffect, useCallback } from 'react';
import { eventBus } from '../client/analytics/event-bus';
import { getUniqueSession, ContentCard } from '../lib/content-db';

export interface RealityPair {
  id: number;
  fact: string;
  statement: string;
  isHallucination: boolean;
  ruleId?: number;
}

export function useRealityCheckEngine(userId: number, level: number) {
  const [pairs, setPairs] = useState<RealityPair[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const startSession = useCallback(() => {
    const session = getUniqueSession('hallucinations', userId + level);
    const generatedPairs: RealityPair[] = session.cards.map((card, idx) => ({
      id: idx,
      fact: card.metadata?.fact || 'В контексте указано общее состояние системы.',
      statement: card.text,
      isHallucination: card.isViolation,
      ruleId: card.ruleRef
    }));

    setPairs(generatedPairs);
    setCurrentIndex(0);
    setScore(0);
    setStartTime(Date.now());
    setIsActive(true);
    setIsFinished(false);
    eventBus.emit('GAME_START', { type: 'REALITY_CHECK', level });
  }, [userId, level]);

  const submitAnswer = useCallback((isHallucination: boolean) => {
    if (!isActive || currentIndex >= pairs.length) return;

    const currentPair = pairs[currentIndex];
    const isCorrect = currentPair.isHallucination === isHallucination;

    if (isCorrect) {
      setScore(s => s + 100);
      eventBus.emit('SCORE_UPDATE', { points: 100 });
    } else {
      eventBus.emit('error', { message: 'Ошибка детекции семантического дрейфа' });
    }

    if (currentIndex === pairs.length - 1) {
      const duration = Date.now() - startTime;
      const finalScore = score + (isCorrect ? 100 : 0);
      const correctHits = Math.floor(finalScore / 100);
      
      import('../lib/cognitive-metrics').then(({ getSemanticConsistency }) => {
        getSemanticConsistency(correctHits, pairs.length, duration / pairs.length).then(metrics => {
          setIsActive(false);
          setIsFinished(true);
          eventBus.emit('GAME_END', {
            score: finalScore,
            timeMs: duration,
            accuracy: metrics.detectionAccuracy,
            vigilance: metrics.cognitiveVigilance,
            metrics
          } as any);
        });
      });
    } else {
      setCurrentIndex(i => i + 1);
    }
  }, [isActive, currentIndex, pairs, score, startTime]);

  return {
    currentPair: pairs[currentIndex],
    progress: (currentIndex / pairs.length) * 100,
    score,
    isActive,
    isFinished,
    startSession,
    submitAnswer,
    pairsRemaining: pairs.length - currentIndex
  };
}
