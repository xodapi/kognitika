import type { GeneratedMathSet, MathLevel } from './mentmath-generator';

export interface NeurotrainerAnalysis {
  feedback: string;
  recommendations: string[];
}

async function postJson<T>(
  path: string,
  token: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });
  if (signal?.aborted) controller.abort();
  try {
    const response = await fetch(path, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Neurotrainer request failed with HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

export function requestMentalMathSet(
  token: string,
  input: { level: MathLevel; count: number },
) {
  return postJson<{ set: GeneratedMathSet; source: 'llm' | 'fallback' }>(
    '/api/neurotrainer/mental-math/generate',
    token,
    input,
  );
}

export function requestNeurotrainerAnalysis(
  token: string,
  input: {
    gameType: 'MENTAL_MATH' | 'SCHULTE_90';
    timeMs: number;
    errors: number;
    correctAnswers?: number;
    totalQuestions?: number;
    level?: number;
  },
  signal?: AbortSignal,
) {
  return postJson<{ analysis: NeurotrainerAnalysis; source: 'llm' | 'fallback' }>(
    '/api/neurotrainer/analyze',
    token,
    input,
    signal,
  );
}
