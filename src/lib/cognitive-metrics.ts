// It provides a high-level API for the frontend and handles WASM loading via Worker

let analyticsWorker: Worker | null = null;

function getWorker(): Worker {
  if (!analyticsWorker && typeof window !== 'undefined') {
    analyticsWorker = new Worker(new URL('../workers/analytics.worker.ts', import.meta.url), { type: 'module' });
  }
  return analyticsWorker!;
}

export interface ClickEvent {
  cell: number;
  reactionTime: number;
}

export interface AnalysisResult {
  averageTime: number;
  stabilityIndex: number;
  fatigability: number;
  reactionConsistency: number;
}

export interface DifficultySuggestion {
  nextGridSize: number;
  noiseLevel: number;
  rotationEnabled: boolean;
  message: string;
}

export interface TypingStats {
  cpm: number;
  wpm: number;
  accuracy: number;
  errors: number;
}

export interface StroopMetrics {
  interferenceMs: number;
  accuracy: number;
  cognitiveControlScore: number;
}

export interface SemanticMetrics {
  consistencyScore: number;
  detectionAccuracy: number;
  cognitiveVigilance: number;
}

/**
 * Get data-driven difficulty suggestion based on past performance.
 */
export async function getDifficultySuggestion(avgTime: number, stability: number): Promise<DifficultySuggestion> {
  return new Promise((resolve) => {
    const worker = getWorker();
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'DIFFICULTY_SUGGESTION') {
        const suggestion = e.data.payload;
        worker.removeEventListener('message', handleMessage);
        resolve({
          nextGridSize: suggestion.next_grid_size,
          noiseLevel: suggestion.noise_level,
          rotationEnabled: suggestion.rotation_enabled,
          message: suggestion.message
        });
      }
    };
    worker.addEventListener('message', handleMessage);
    worker.postMessage({ type: 'SUGGEST_DIFFICULTY', data: { avgTime, stability } });
    
    setTimeout(() => {
      worker.removeEventListener('message', handleMessage);
      resolve({ nextGridSize: 3, noiseLevel: 0, rotationEnabled: false, message: "Стабильный режим" });
    }, 1000);
  });
}

/**
 * High-performance typing analytics.
 */
export async function getTypingStats(chars: number, ms: number, errors: number): Promise<TypingStats> {
  try {
    const wasm = await import('../../../packages/analytics-kernel/pkg/analytics_kernel');
    return wasm.calculate_typing_stats(chars, ms, errors);
  } catch (error) {
    const minutes = ms / 60000;
    const cpm = minutes > 0 ? chars / minutes : 0;
    return {
      cpm,
      wpm: cpm / 5,
      accuracy: Math.max(0, chars > 0 ? ((chars - errors) / chars) * 100 : 100),
      errors
    };
  }
}

/**
 * Stroop effect analytics.
 */
export async function getStroopMetrics(congruentAvgMs: number, incongruentAvgMs: number, errors: number, total: number): Promise<StroopMetrics> {
  try {
    const wasm = await import('../../../packages/analytics-kernel/pkg/analytics_kernel');
    const result = wasm.calculate_stroop_metrics(congruentAvgMs, incongruentAvgMs, errors, total);
    return {
      interferenceMs: result.interference_ms,
      accuracy: result.accuracy,
      cognitiveControlScore: result.cognitive_control_score
    };
  } catch (error) {
    const interference = incongruentAvgMs - congruentAvgMs;
    const accuracy = total > 0 ? ((total - errors) / total) * 100 : 100;
    return {
      interferenceMs: interference,
      accuracy,
      cognitiveControlScore: Math.max(0, 100 - (interference / 10) - (100 - accuracy))
    };
  }
}

/**
 * Semantic consistency analytics (Mind-Guard modules).
 */
export async function getSemanticConsistency(correctHits: number, totalItems: number, avgTimeMs: number): Promise<SemanticMetrics> {
  try {
    const wasm = await import('../../../packages/analytics-kernel/pkg/analytics_kernel');
    // @ts-ignore - The function might not be in the .d.ts but it is in the Rust source and .wasm
    const result = wasm.calculate_semantic_consistency(correctHits, totalItems, avgTimeMs);
    return {
      consistencyScore: result.consistency_score,
      detectionAccuracy: result.detection_accuracy,
      cognitiveVigilance: result.cognitive_vigilance
    };
  } catch (error) {
    const accuracy = totalItems > 0 ? (correctHits / totalItems) * 100 : 0;
    const speedFactor = Math.min(1.0, 5000 / Math.max(1000, avgTimeMs));
    return {
      consistencyScore: accuracy,
      detectionAccuracy: accuracy,
      cognitiveVigilance: accuracy * speedFactor
    };
  }
}

/**
 * High-performance session analysis.
 * Uses the Rust kernel (WASM) for heavy computations.
 */
export async function analyzeSession(events: ClickEvent[]): Promise<AnalysisResult> {
  return new Promise((resolve) => {
    const worker = getWorker();
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'SESSION_ANALYSIS') {
        const result = e.data.payload;
        worker.removeEventListener('message', handleMessage);
        resolve({
          averageTime: result.average_time,
          stabilityIndex: result.stability_index,
          fatigability: result.fatigability,
          reactionConsistency: result.reaction_consistency
        });
      }
    };
    worker.addEventListener('message', handleMessage);
    worker.postMessage({ type: 'ANALYZE_SESSION', data: { events } });

    setTimeout(() => {
      worker.removeEventListener('message', handleMessage);
      resolve(fallbackAnalysis(events));
    }, 2000);
  });
}

/**
 * JS Fallback for cognitive metrics calculation.
 * Ensures reliability even if WASM fails to load.
 */
function fallbackAnalysis(events: ClickEvent[]): AnalysisResult {
  if (events.length === 0) return { averageTime: 0, stabilityIndex: 0, fatigability: 0, reactionConsistency: 100 };

  const times = events.map(e => e.reactionTime);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  
  const variance = times.reduce((acc, t) => acc + Math.pow(t - avg, 2), 0) / times.length;
  const stability = Math.sqrt(variance);

  // Simple linear regression for fatigability
  const n = times.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += times[i];
    sumXY += i * times[i];
    sumX2 += i * i;
  }
  
  const denom = (n * sumX2 - sumX * sumX);
  const fatigability = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;

  // Reaction Consistency score (0-100)
  const cv = avg > 0 ? stability / avg : 1;
  const reactionConsistency = Math.max(0, 100 - (cv * 100));

  return {
    averageTime: avg,
    stabilityIndex: stability,
    fatigability,
    reactionConsistency
  };
}
