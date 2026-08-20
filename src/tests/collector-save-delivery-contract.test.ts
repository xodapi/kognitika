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

function expectCompletedAnalyticsJobDelivery(source: string, component: string) {
  const savePayloads = [...source.matchAll(/saveAttempt\(\{([\s\S]*?)\}\)/g)].map((match) => match[1]);

  expect(savePayloads, `${component} should pass an analytics job to saveAttempt`).not.toHaveLength(0);
  for (const payload of savePayloads) {
    const usesCanonicalExpression = /analyticsJob\s*:\s*getCompletedAnalyticsJob\(\)\s*\?\?\s*undefined/.test(payload);
    const usesCompletedJobVariable =
      /const\s+analyticsJob\s*=\s*getCompletedAnalyticsJob\(\)/.test(source) &&
      /analyticsJob\s*,/.test(payload);

    expect(
      usesCanonicalExpression || usesCompletedJobVariable,
      `${component} should deliver getCompletedAnalyticsJob() to saveAttempt without dropping an absent job safely`,
    ).toBe(true);
  }
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
      expectCompletedAnalyticsJobDelivery(source, component);
    }
  });

  it.each([
    ['NoiseReduction', 'NOISE_REDUCTION'],
    ['Decryptor', 'DECRYPTOR'],
    ['RealityCheck', 'REALITY_CHECK'],
    ['LanguageScanner', 'LANGUAGE_SCANNER'],
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
