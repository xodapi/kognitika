import { EventMap } from './event-schema';

export interface AnomalyResult {
  isAnomalous: boolean;
  reason?: string;
  confidence: number; // 0-1
}

/**
 * Local Anti-Fraud System (v1.0)
 * Deterministic rules to detect impossible performance without cloud AI.
 */
export class AntiFraudDetector {
  private clickIntervals: number[] = [];
  
  /**
   * Validates a training session based on the training type and recorded data.
   */
  validateSession<K extends keyof EventMap>(event: K, data: EventMap[K]): AnomalyResult {
    if (event === 'TRAINING_COMPLETE') {
      const payload = data as EventMap['TRAINING_COMPLETE'];
      
      // 1. Impossible Speed Check (e.g., Schulte 5x5 under 3 seconds)
      if (payload.type === 'SCHULTE' && payload.timeMs < 3000) {
        return { isAnomalous: true, reason: 'Impossible speed detected (Schulte < 3s)', confidence: 1.0 };
      }

      // 2. Typing speed check (> 1200 CPM is likely a macro/bot)
      if (payload.type === 'TYPING' && (payload.cpm || 0) > 1200) {
        return { isAnomalous: true, reason: 'Typing speed exceeds human limit (>1200 CPM)', confidence: 0.95 };
      }
    }

    if (event === 'CELL_CLICK') {
      const payload = data as EventMap['CELL_CLICK'];
      
      // 3. Reaction Time Check (Inhumanly fast: < 150ms consistently)
      if (payload.reactionTimeMs < 100) {
        return { isAnomalous: true, reason: 'Inhuman reaction time (<100ms)', confidence: 0.9 };
      }

      // 4. Rhythm Analysis (Bot detection)
      this.clickIntervals.push(payload.reactionTimeMs);
      if (this.clickIntervals.length > 10) {
        const last10 = this.clickIntervals.slice(-10);
        const stdDev = this.calculateStdDev(last10);
        // If clicks are TOO rhythmic (stdDev < 5ms over 10 clicks), it's likely a script
        if (stdDev < 5) {
          return { isAnomalous: true, reason: 'Perfect rhythmic precision detected (Bot pattern)', confidence: 0.85 };
        }
      }
    }

    return { isAnomalous: false, confidence: 0 };
  }

  private calculateStdDev(values: number[]): number {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  reset() {
    this.clickIntervals = [];
  }
}

export const antiFraud = new AntiFraudDetector();
