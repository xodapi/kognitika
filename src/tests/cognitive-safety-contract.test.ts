import { describe, expect, it } from 'vitest';
import {
  CognitiveImmunityResultSchema,
  SafetyScenarioSchema,
  SYNTHETIC_SAFETY_SCENARIOS,
  scoreSafetyResponse,
} from '../core/cognitive-safety/index.ts';

const scenario = SYNTHETIC_SAFETY_SCENARIOS[0];

describe('cognitive safety educational contract', () => {
  it('accepts only versioned, bounded synthetic scenarios', () => {
    expect(SafetyScenarioSchema.safeParse(scenario).success).toBe(true);
    expect(JSON.stringify(scenario)).not.toMatch(/brain.?id|email|token|jwt|telemetry|metadata|diagnos/i);
  });

  it('rewards recognizing the pattern and choosing a healthy boundary', () => {
    const result = scoreSafetyResponse(scenario, 'response-false-dichotomy-pause');

    expect(result).toEqual(expect.objectContaining({
      cognitiveImmunityScore: 100,
      outcome: 'strong_response',
      reasonCode: 'recognized_and_bounded',
    }));
    expect(CognitiveImmunityResultSchema.safeParse(result).success).toBe(true);
  });

  it('does not equate speed or a pattern label with a high result', () => {
    const result = scoreSafetyResponse(scenario, 'response-false-dichotomy-delay');
    expect(result).toEqual(expect.objectContaining({
      recognitionScore: 1,
      healthyResponseScore: 0,
      cognitiveImmunityScore: 25,
      outcome: 'review_suggested',
    }));
  });

  it('requires full recognition and a healthy response for a strong result', () => {
    const partialRecognitionScenario = {
      ...scenario,
      options: scenario.options.map((option) => option.id === 'response-false-dichotomy-delay'
        ? { ...option, responseScore: 2 }
        : option),
    };

    expect(scoreSafetyResponse(partialRecognitionScenario, 'response-false-dichotomy-delay')).toMatchObject({
      cognitiveImmunityScore: 75,
      outcome: 'developing_response',
      reasonCode: 'recognized_needs_boundary',
    });
  });

  it('rejects malformed scenarios and unknown answers', () => {
    expect(SafetyScenarioSchema.safeParse({ ...scenario, options: [scenario.options[0]] }).success).toBe(false);
    expect(SafetyScenarioSchema.safeParse({ ...scenario, userId: 'synthetic-user' }).success).toBe(false);
    expect(() => scoreSafetyResponse(scenario, 'response-unknown')).toThrow('Unknown safety scenario response');
  });
});
