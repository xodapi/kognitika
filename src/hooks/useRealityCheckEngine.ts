import { useState, useEffect, useCallback, useRef } from 'react';
import { eventBus } from '../client/analytics/event-bus';
import { getUniqueSession, ContentCard } from '../lib/content-db';
import {
  CognitiveSessionEventCollector,
  type CompletedSessionAnalyticsJob,
} from '../core/cognitive-events';

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
  const startTimeRef = useRef(Date.now());
  const activeRef = useRef(false);
  const collectorRef = useRef<CognitiveSessionEventCollector | null>(null);
  const completedAnalyticsJobRef = useRef<CompletedSessionAnalyticsJob | null>(null);

  const startSession = useCallback(() => {
    const session = getUniqueSession('hallucinations', userId + level);
    const generatedPairs: RealityPair[] = session.cards.map((card, idx) => ({
      id: idx,
      fact: card.metadata?.fact || 'В контексте указано общее состояние системы.',
      statement: card.text,
      isHallucination: card.isViolation,
      ruleId: card.ruleRef
    }));

    const startedAtMs = Date.now();
    startTimeRef.current = startedAtMs;
    completedAnalyticsJobRef.current = null;
    collectorRef.current = new CognitiveSessionEventCollector({
      sessionId: `reality-check-${startedAtMs}-${level}`,
      moduleId: 'reality-check',
      moduleVersion: '1',
      category: 'cognitive',
      startedAt: new Date(startedAtMs).toISOString(),
    });
    collectorRef.current.record({
      kind: 'trial_started',
      tMs: 0,
      trialType: 'reality-check:classification',
      difficulty: `level-${level}`,
    });
    setPairs(generatedPairs);
    setCurrentIndex(0);
    setScore(0);
    setStartTime(startedAtMs);
    activeRef.current = true;
    setIsActive(true);
    setIsFinished(false);
    eventBus.emit('GAME_START', { type: 'REALITY_CHECK', level });
  }, [userId, level]);

  const submitAnswer = useCallback((isHallucination: boolean) => {
    if (!activeRef.current || currentIndex >= pairs.length) return;

    const currentPair = pairs[currentIndex];
    const isCorrect = currentPair.isHallucination === isHallucination;
    collectorRef.current?.record({
      kind: 'trial_answered',
      tMs: Math.max(0, Date.now() - startTimeRef.current),
      trialType: 'reality-check:classification',
      isCorrect,
    });

    if (isCorrect) {
      setScore(s => s + 100);
      eventBus.emit('SCORE_UPDATE', { points: 100 });
    } else {
      eventBus.emit('error', { message: 'Ошибка детекции семантического дрейфа' });
    }

    if (currentIndex === pairs.length - 1) {
      const duration = Math.max(0, Date.now() - startTimeRef.current);
      const finalScore = score + (isCorrect ? 100 : 0);
      const correctHits = Math.floor(finalScore / 100);
      const collector = collectorRef.current;
      if (collector && !completedAnalyticsJobRef.current) {
        const completedAt = new Date(startTimeRef.current + duration).toISOString();
        collector.complete(duration, completedAt);
        completedAnalyticsJobRef.current = collector.createCompletedJob(completedAt);
      }
      
      activeRef.current = false;
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
    pairsRemaining: pairs.length - currentIndex,
    getCompletedAnalyticsJob: () => completedAnalyticsJobRef.current,
  };
}
