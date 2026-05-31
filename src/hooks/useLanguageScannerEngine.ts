/**
 * Module: Language Scanner (Детектор манипуляций)
 * Часть системы «Когнитивный щит». Тренирует распознавание техник психологического воздействия и логических ошибок.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { emitEvent } from './useEventBus';
import { getUniqueSession, getScannerSessionForLevel, ContentCard as DBCard } from '../lib/content-db';

export interface Rule {
  id: number;
  text: string;
}

export interface Card {
  id: number;
  text: string;
  isViolation: boolean;
  ruleRef?: number;
}

type Phase = 'memorize' | 'scan' | 'result';

export interface LanguageScannerState {
  phase: Phase;
  rules: Rule[];
  cards: Card[];
  activeCard: Card | null;
  cardQueue: Card[];
  hits: number;
  misses: number;
  falsePositives: number;
  score: number;
  maxScore: number;
  timeMs: number;
  level: number;
  memorizeTimeLeft: number;
  isFinished: boolean;
  cardDurationMs: number;
  lastFeedback: {
    ruleId: number | null;
    isCorrect: boolean | null;
    selectedRuleId: number | null;
    explanation: string;
    correctRuleName: string;
  } | null;
  domain: string;
}

const MEMORIZE_SECS = 8; 
const FEEDBACK_DELAY_MS = 3000;

export function useLanguageScannerEngine() {
  const [state, setState] = useState<LanguageScannerState>({
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
    cardDurationMs: 5000,
    lastFeedback: null,
    domain: 'Манипуляции'
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
    [timerRef, memorizeRef, cardTimerRef].forEach(r => {
      if (r.current) {
        clearInterval(r.current as any);
        clearTimeout(r.current as any);
      }
    });
  }, []);

  const showNextCard = useCallback((durationMs: number) => {
    if (queueRef.current.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      const timeMs = Date.now() - startTimeRef.current;
      
      setState(prev => {
        const finalScore = Math.max(0, hitsRef.current - fpRef.current);
        const totalPossible = prev.maxScore;
        const avgTimePerCard = timeMs / prev.cards.length;

        import('../lib/cognitive-metrics').then(({ getSemanticConsistency }) => {
          getSemanticConsistency(hitsRef.current, totalPossible || 1, avgTimePerCard).then(metrics => {
            emitEvent('TRAINING_COMPLETE', {
              type: 'GUARD',
              timeMs,
              score: finalScore,
              level: prev.level,
              metadata: { 
                module: 'language_scanner', 
                hits: hitsRef.current, 
                misses: missesRef.current, 
                fp: fpRef.current,
                vigilance: metrics.cognitiveVigilance,
                accuracy: metrics.detectionAccuracy
              },
            });
          });
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
      setState(prev => {
        if (prev.activeCard?.isViolation) {
          missesRef.current += 1;
        }
        return prev;
      });
      showNextCard(durationMs);
    }, durationMs);
  }, []);

  const startScan = useCallback(() => {
    setState(prev => {
      if (prev.phase !== 'memorize') return prev;
      
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setState(s => ({ ...s, timeMs: Date.now() - startTimeRef.current }));
      }, 100);
      
      setTimeout(() => showNextCard(prev.cardDurationMs), 0);
      
      return { ...prev, phase: 'scan', memorizeTimeLeft: 0 };
    });
  }, [showNextCard]);

  const startGame = useCallback((level: number = 1, userId: number = 123) => {
    [timerRef, memorizeRef, cardTimerRef].forEach(r => {
      if (r.current) {
        clearInterval(r.current as any);
        clearTimeout(r.current as any);
      }
    });
    hitsRef.current = 0;
    missesRef.current = 0;
    fpRef.current = 0;

    const seed = userId * 1337 + level * 42;
    const session = getScannerSessionForLevel(level, userId);
    const violations = session.cards.filter(c => c.isViolation).length;
    const durationMs = Math.max(3000, 8000 - (level - 1) * 700);
    const shuffled = [...session.cards].map(c => ({
      id: Math.random(),
      text: c.text,
      isViolation: c.isViolation,
      ruleRef: c.ruleRef,
    } as Card));
    
    queueRef.current = [...shuffled];

    setState({
      phase: 'memorize',
      rules: session.rules,
      cards: shuffled,
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
      cardDurationMs: durationMs,
      lastFeedback: null,
      domain: (session as any).domain?.split(': ').pop() || 'Манипуляции'
    });
  }, []);

  const flagCard = useCallback((ruleId: number) => {
    setState(prev => {
      // If feedback is active, ruleId 0 acts as "Next"
      if (prev.lastFeedback && (ruleId === 0 || ruleId === -1)) {
        showNextCard(prev.cardDurationMs);
        return { ...prev, lastFeedback: null };
      }

      if (!prev.activeCard || prev.lastFeedback) return prev;
      if (cardTimerRef.current) clearTimeout(cardTimerRef.current);

      const isCorrect = prev.activeCard.isViolation && prev.activeCard.ruleRef === ruleId;
      const correctRule = prev.rules.find(r => r.id === prev.activeCard?.ruleRef);
      
      if (isCorrect) {
        hitsRef.current += 1;
      } else {
        fpRef.current += 1;
      }

      const nextState = {
        ...prev,
        hits: hitsRef.current,
        falsePositives: fpRef.current,
        score: Math.max(0, hitsRef.current - fpRef.current),
        lastFeedback: {
          ruleId: prev.activeCard.ruleRef || null,
          isCorrect,
          selectedRuleId: ruleId,
          explanation: correctRule?.text || 'Это классическая логическая уловка.',
          correctRuleName: (correctRule?.text.includes(':') 
            ? correctRule.text.split(':')[0] 
            : correctRule?.text.split('—')[0]) || 'Техника воздействия'
        }
      };

      // No auto-timeout here. User must click "Next/Понятно"
      return nextState;
    });
  }, [showNextCard]);

  const skipCard = useCallback(() => {
    setState(prev => {
      if (!prev.activeCard) return prev;
      if (cardTimerRef.current) clearTimeout(cardTimerRef.current);

      if (prev.activeCard.isViolation) {
        missesRef.current += 1;
      }

      const nextState = {
        ...prev,
        misses: missesRef.current
      };

      setTimeout(() => showNextCard(prev.cardDurationMs), 0);
      
      return nextState;
    });
  }, [showNextCard]);

  return { state, startGame, flagCard, startScan, skipCard };
}
