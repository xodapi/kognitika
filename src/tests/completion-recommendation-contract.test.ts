/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildPracticeRecommendation,
  normalizePracticeModuleId,
} from '../lib/practice-recommendations';
import { routeForRecommendedGame } from '../lib/routes';

const completionContracts = [
  ['schulte', 'src/components/SchulteGrid.tsx', 'PostGameInsight'],
  ['numerical', 'src/components/NumericalAnalysis.tsx', 'PostGameInsight'],
  ['logical', 'src/components/LogicalMatrix.tsx', 'PostGameInsight'],
  ['stroop', 'src/components/StroopTest.tsx', 'PostGameInsight'],
  ['nback', 'src/components/NBackTest.tsx', 'PostGameInsight'],
  ['objective', 'src/components/ObjectiveFilter.tsx', 'PostGameInsight'],
  ['filter', 'src/components/CognitiveTrashFilter.tsx', 'PostGameInsight'],
  ['hype', 'src/components/HypeFilter.tsx', 'PostGameInsight'],
  ['typing', 'src/components/SpeedTyping.tsx', 'CompletionRecommendation'],
  ['spatial', 'src/components/SpatialConcealment.tsx', 'CompletionRecommendation'],
  ['situational', 'src/components/SituationalJudgmentTest.tsx', 'CompletionRecommendation'],
  ['profiling', 'src/components/ProfilingRICE.tsx', 'CompletionRecommendation'],
  ['topology', 'src/components/TopologyMemory.tsx', 'CompletionRecommendation'],
  ['collision', 'src/components/CollisionDetector.tsx', 'CompletionRecommendation'],
  ['dispatcher', 'src/components/AsyncDispatcher.tsx', 'CompletionRecommendation'],
  ['noise', 'src/components/NoiseReduction.tsx', 'CompletionRecommendation'],
  ['scanner', 'src/components/LanguageScanner.tsx', 'CompletionRecommendation'],
  ['decryptor', 'src/components/Decryptor.tsx', 'CompletionRecommendation'],
  ['reality', 'src/components/RealityCheck.tsx', 'CompletionRecommendation'],
  ['silence', 'src/components/NeuroSilence.tsx', 'CompletionRecommendation'],
  ['dialogue', 'src/components/SocialEQ.tsx', 'CompletionRecommendation'],
  ['reframing', 'src/components/Reframing.tsx', 'CompletionRecommendation'],
  ['rejection', 'src/components/RejectionImmunity.tsx', 'CompletionRecommendation'],
  ['storytelling', 'src/components/Storytelling.tsx', 'CompletionRecommendation'],
  ['focus', 'src/components/DeepFocus.tsx', 'CompletionRecommendation'],
] as const;

function readRepoFile(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

describe('completion recommendation contract', () => {
  it('keeps every public trainer wired to a next-step completion block', () => {
    for (const [moduleId, filePath, marker] of completionContracts) {
      const source = readRepoFile(filePath);
      expect(source, `${moduleId} should render ${marker}`).toContain(marker);
    }
  });

  it('normalizes legacy game types to stable module ids', () => {
    expect(normalizePracticeModuleId('NUMERICAL_ANALYSIS')).toBe('numerical');
    expect(normalizePracticeModuleId('N_BACK')).toBe('nback');
    expect(normalizePracticeModuleId('SPEED_TYPING')).toBe('typing');
  });

  it('keeps every recommendation target routable', () => {
    for (const [moduleId] of completionContracts) {
      const recommendation = buildPracticeRecommendation({ sourceModuleId: moduleId, score: 100, accuracy: 95 });
      expect(routeForRecommendedGame(recommendation.moduleId), `${moduleId} recommendation should route`).toMatch(/^\//);
    }
  });

  it('emits future-ready category semantics for safety and somatic modules', () => {
    expect(buildPracticeRecommendation({ sourceModuleId: 'noise', accuracy: 95 }).category).toBe('safety');
    expect(buildPracticeRecommendation({ sourceModuleId: 'silence', score: 100 }).reason).toBe('recovery');
  });
});
