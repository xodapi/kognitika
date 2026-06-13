import { useState, useEffect } from 'react';
import { analyzeSession, getDifficultySuggestion, AnalysisResult, DifficultySuggestion } from '../lib/cognitive-metrics';
import { createSafeLogger, safeError } from '../lib/safe-logger';

const logger = createSafeLogger('cognitive-analytics');

export function useCognitiveAnalytics() {
  const [isReady, setIsReady] = useState(true);

  const analyzeSchulte = async (events: any[]) => {
    try {
      // Map frontend events to ClickEvent format expected by the bridge
      const clickEvents = events.map(e => ({
        cell: e.cellId || e.cell,
        reactionTime: e.reactionTimeMs || e.reaction_time
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
