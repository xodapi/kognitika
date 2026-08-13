/**
 * @vitest-environment node
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readComponent(name: string) {
  return readFileSync(new URL(`../components/${name}.tsx`, import.meta.url), 'utf8');
}

function readHook(name: string) {
  return readFileSync(new URL(`../hooks/${name}.ts`, import.meta.url), 'utf8');
}

describe('collector save delivery contract', () => {
  it('requires every collector-backed component to use durable game attempts', () => {
    const componentsDirectory = new URL('../components/', import.meta.url);
    const collectorComponents = readdirSync(componentsDirectory)
      .filter((name) => name.endsWith('.tsx'))
      .filter((name) => readFileSync(new URL(name, componentsDirectory), 'utf8').includes('getCompletedAnalyticsJob'));

    expect(collectorComponents).not.toHaveLength(0);
    for (const component of collectorComponents) {
      const source = readFileSync(new URL(component, componentsDirectory), 'utf8');
      expect(source, `${component} should use protected game attempts`).toContain('useGameAttempt');
      expect(source, `${component} should save collector jobs`).toContain('saveAttempt');
    }
  });

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
