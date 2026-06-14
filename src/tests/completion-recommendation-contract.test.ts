import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const publicCompletionScreens = [
  'src/components/AnomalyDetector.tsx',
  'src/components/AsyncDispatcher.tsx',
  'src/components/CognitiveTrashFilter.tsx',
  'src/components/CollisionDetector.tsx',
  'src/components/Decryptor.tsx',
  'src/components/DeepFocus.tsx',
  'src/components/HypeFilter.tsx',
  'src/components/LanguageScanner.tsx',
  'src/components/LogicalMatrix.tsx',
  'src/components/NBackTest.tsx',
  'src/components/NeuroSilence.tsx',
  'src/components/NoiseReduction.tsx',
  'src/components/NumericalAnalysis.tsx',
  'src/components/ObjectiveFilter.tsx',
  'src/components/ProfilingRICE.tsx',
  'src/components/RealityCheck.tsx',
  'src/components/Reframing.tsx',
  'src/components/RejectionImmunity.tsx',
  'src/components/SchulteGrid.tsx',
  'src/components/SituationalJudgmentTest.tsx',
  'src/components/SocialEQ.tsx',
  'src/components/SpatialConcealment.tsx',
  'src/components/SpeedTyping.tsx',
  'src/components/Storytelling.tsx',
  'src/components/StroopTest.tsx',
  'src/components/TopologyMemory.tsx',
];

describe('completion recommendation contract', () => {
  it.each(publicCompletionScreens)('%s renders the unified post-game recommendation screen', (relativePath) => {
    const content = readFileSync(resolve(repoRoot, relativePath), 'utf8');
    expect(content).toContain('PostGameInsight');
  });
});
