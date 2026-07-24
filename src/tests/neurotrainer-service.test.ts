import { describe, expect, it, vi } from 'vitest';
import {
  AnalyzeTrainingRequestSchema,
  GenerateMentalMathRequestSchema,
} from '../server/schemas/neurotrainer';
import type { LlmJsonProvider, LlmJsonRequest } from '../server/services/llm-provider';
import {
  analyzeNeurotraining,
  generateMentalMathTraining,
  validateGeneratedMentalMathSet,
} from '../server/services/neurotrainer';

function validLevelOneSet(count = 10) {
  return {
    legend: {},
    questions: Array.from({ length: count }, (_, index) => {
      const left = index + 1;
      const equation = `${left} + 1`;
      return {
        equation,
        answer: left + 1,
        display: `${equation} = ?`,
      };
    }),
  };
}

describe('neurotrainer service', () => {
  it('accepts a valid provider-generated math set', async () => {
    const provider: LlmJsonProvider = {
      generateJson: vi.fn().mockResolvedValue(validLevelOneSet()),
    };

    const result = await generateMentalMathTraining({
      level: 1,
      count: 10,
      provider,
    });

    expect(result.source).toBe('llm');
    expect(result.set.questions).toHaveLength(10);
  });

  it('rejects invalid math and uses a unique local fallback', async () => {
    const provider: LlmJsonProvider = {
      generateJson: vi.fn().mockResolvedValue({
        legend: {},
        questions: Array.from({ length: 10 }, () => ({
          equation: '10 / 3',
          answer: 3,
          display: '10 / 3 = ?',
        })),
      }),
    };

    const result = await generateMentalMathTraining({
      level: 1,
      count: 10,
      provider,
    });

    expect(result.source).toBe('fallback');
    expect(result.set.questions).toHaveLength(10);
    expect(new Set(result.set.questions.map((question) => question.equation)).size).toBe(10);
  });

  it('validates exact division, ranges, display, and duplicates', () => {
    const valid = validLevelOneSet();
    expect(validateGeneratedMentalMathSet(valid, 1, 10)).not.toBeNull();
    expect(validateGeneratedMentalMathSet({
      ...valid,
      questions: valid.questions.map((question) => ({
        ...question,
        equation: '201 + 1',
        answer: 202,
        display: '201 + 1 = ?',
      })),
    }, 1, 10)).toBeNull();
  });

  it('sends only strict aggregate metrics to the analysis provider', async () => {
    let captured: LlmJsonRequest | null = null;
    const provider: LlmJsonProvider = {
      generateJson: vi.fn(async (request) => {
        captured = request;
        return {
          feedback: 'Темп стабилен, продолжайте спокойно.',
          recommendations: ['Сделайте короткий перерыв.'],
        };
      }),
    };

    const result = await analyzeNeurotraining({
      current: {
        gameType: 'SCHULTE_90',
        timeMs: 120000,
        errors: 1,
        correctAnswers: 90,
        totalQuestions: 90,
      },
      history: [
        {
          timeMs: 125000,
          score: 100,
          errors: 2,
          accuracy: 98,
          token: 'must-not-leak',
          clickHistory: [{ x: 0.1, y: 0.2 }],
        } as never,
      ],
      provider,
    });

    expect(result.source).toBe('llm');
    expect(captured).not.toBeNull();
    const serialized = JSON.stringify(captured);
    expect(serialized).not.toContain('must-not-leak');
    expect(serialized).not.toContain('clickHistory');
    expect(serialized).not.toMatch(/brainId|authorization|sessionId|userId/i);
  });

  it('uses deterministic analysis when the provider fails', async () => {
    const provider: LlmJsonProvider = {
      generateJson: vi.fn().mockRejectedValue(new Error('provider unavailable')),
    };

    const result = await analyzeNeurotraining({
      current: {
        gameType: 'MENTAL_MATH',
        timeMs: 45000,
        errors: 2,
        correctAnswers: 18,
        totalQuestions: 20,
        level: 2,
      },
      history: [],
      provider,
    });

    expect(result.source).toBe('fallback');
    expect(result.analysis.feedback).toContain('90%');
    expect(result.analysis.recommendations.length).toBeGreaterThan(0);
  });

  it('rejects identity-like extra API fields', () => {
    expect(GenerateMentalMathRequestSchema.safeParse({
      level: 1,
      count: 20,
      userId: 'private',
    }).success).toBe(false);
    expect(AnalyzeTrainingRequestSchema.safeParse({
      gameType: 'SCHULTE_90',
      timeMs: 120000,
      errors: 0,
      brainId: 'private',
    }).success).toBe(false);
  });
});
