import { z } from 'zod';

export const ManipulationPatternSchema = z.enum([
  'false_dichotomy',
  'emotional_pressure',
  'authority_pressure',
  'propaganda_framing',
  'misinformation',
  'cognitive_shortcut',
]);
export type ManipulationPattern = z.infer<typeof ManipulationPatternSchema>;

export const SafetyResponseOptionSchema = z.object({
  id: z.string().regex(/^response-[a-z0-9-]{1,40}$/),
  text: z.string().min(1).max(280),
  recognitionScore: z.number().int().min(0).max(2),
  responseScore: z.number().int().min(0).max(2),
}).strict();
export type SafetyResponseOption = z.infer<typeof SafetyResponseOptionSchema>;

export const SafetyScenarioSchema = z.object({
  version: z.literal(1),
  id: z.string().regex(/^safety-[a-z0-9-]{1,40}$/),
  pattern: ManipulationPatternSchema,
  prompt: z.string().min(1).max(500),
  neutralExplanation: z.string().min(1).max(500),
  options: z.array(SafetyResponseOptionSchema).min(2).max(4),
}).strict().superRefine((scenario, context) => {
  const ids = scenario.options.map(option => option.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: 'custom', path: ['options'], message: 'Scenario response ids must be unique' });
  }
  if (!scenario.options.some(option => option.recognitionScore === 2 && option.responseScore === 2)) {
    context.addIssue({ code: 'custom', path: ['options'], message: 'Scenario requires a strong recognition and response option' });
  }
});
export type SafetyScenario = z.infer<typeof SafetyScenarioSchema>;

export const CognitiveImmunityResultSchema = z.object({
  scenarioId: z.string(),
  pattern: ManipulationPatternSchema,
  recognitionScore: z.number().int().min(0).max(2),
  healthyResponseScore: z.number().int().min(0).max(2),
  cognitiveImmunityScore: z.number().int().min(0).max(100),
  outcome: z.enum(['strong_response', 'developing_response', 'review_suggested']),
  reasonCode: z.enum(['recognized_and_bounded', 'recognized_needs_boundary', 'review_neutral_pattern']),
}).strict();
export type CognitiveImmunityResult = z.infer<typeof CognitiveImmunityResultSchema>;

/** Educational scoring only. It does not assess a person, diagnose a situation,
 * determine safety, or replace professional, emergency, or legal support. */
export function scoreSafetyResponse(scenario: SafetyScenario, responseId: string): CognitiveImmunityResult {
  const parsedScenario = SafetyScenarioSchema.parse(scenario);
  const response = parsedScenario.options.find(option => option.id === responseId);
  if (!response) throw new Error('Unknown safety scenario response');

  const cognitiveImmunityScore = Math.round(((response.recognitionScore + response.responseScore) / 4) * 100);
  const outcome = response.recognitionScore === 2 && response.responseScore === 2
    ? 'strong_response'
    : cognitiveImmunityScore >= 50
      ? 'developing_response'
      : 'review_suggested';
  const reasonCode = response.recognitionScore === 2 && response.responseScore === 2
    ? 'recognized_and_bounded'
    : response.recognitionScore >= 1
      ? 'recognized_needs_boundary'
      : 'review_neutral_pattern';

  return CognitiveImmunityResultSchema.parse({
    scenarioId: parsedScenario.id,
    pattern: parsedScenario.pattern,
    recognitionScore: response.recognitionScore,
    healthyResponseScore: response.responseScore,
    cognitiveImmunityScore,
    outcome,
    reasonCode,
  });
}

export const SYNTHETIC_SAFETY_SCENARIOS: SafetyScenario[] = [
  {
    version: 1,
    id: 'safety-false-dichotomy-001',
    pattern: 'false_dichotomy',
    prompt: 'В обсуждении предлагают выбрать только между срочным согласием и полным отказом, не рассматривая другие варианты.',
    neutralExplanation: 'Некоторые формулировки искусственно сужают выбор. Полезно уточнить варианты, критерии и время на решение.',
    options: [
      { id: 'response-false-dichotomy-accept', text: 'Согласиться сразу, потому что других вариантов нет.', recognitionScore: 0, responseScore: 0 },
      { id: 'response-false-dichotomy-pause', text: 'Спокойно уточнить альтернативы, критерии и попросить время на проверку.', recognitionScore: 2, responseScore: 2 },
      { id: 'response-false-dichotomy-delay', text: 'Отложить разговор без объяснения причин.', recognitionScore: 1, responseScore: 0 },
    ],
  },
];
