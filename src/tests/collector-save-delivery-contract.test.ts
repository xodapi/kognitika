/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readComponent(name: string) {
  return readFileSync(new URL(`../components/${name}.tsx`, import.meta.url), 'utf8');
}

function readHook(name: string) {
  return readFileSync(new URL(`../hooks/${name}.ts`, import.meta.url), 'utf8');
}

describe('collector save delivery contract', () => {
  it.each([
    ['NoiseReduction', 'NOISE_REDUCTION'],
    ['Decryptor', 'DECRYPTOR'],
    ['RealityCheck', 'REALITY_CHECK'],
  ])('%s saves completed canonical analytics jobs through game attempts', (component, gameType) => {
    const source = readComponent(component);

    expect(source).toContain(`beginAttempt('${gameType}')`);
    expect(source).toContain('getCompletedAnalyticsJob');
    expect(source).toContain('analyticsJob,');
    expect(source).toContain('saveAttempt({');
  });

  it.each([
    ['useNoiseReductionEngine'],
    ['useDecryptorEngine'],
  ])('%s keeps canonical jobs out of legacy EventBus payloads', (hook) => {
    expect(readHook(hook)).not.toContain('analyticsJob:');
  });
});
