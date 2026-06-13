import { useState, useEffect } from 'react';
import { analyzeSession, getDifficultySuggestion } from '../lib/cognitive-metrics';
import { createSafeLogger, safeError } from '../lib/safe-logger';

const logger = createSafeLogger('cognitive-analytics');

export function useCognitiveAnalytics() {
  const [isReady, setIsReady] = useState(true);

  const analyzeSchulte = async (events: any[]) => {
    try {
      const clickEvents = events.map(e => ({
        cellId: Number(e.cellId),
        reactionTimeMs: Number(e.reactionTimeMs)
      }));

      const result = await analyzeSession(clickEvents);
      const suggestion = await getDifficultySuggestion(result.averageTime, result.stabilityIndex);
      
      return { result, suggestion };
    } catch (e) {
      logger.error('Analytics failed', { error: safeError(e) });
      return null;
    }
  };

  return { analyzeSchulte, isReady };
}
