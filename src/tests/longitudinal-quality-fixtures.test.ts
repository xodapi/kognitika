import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  resolveLongitudinalQuality,
  type LongitudinalQualityInput,
  type LongitudinalQualityResolution,
} from '../lib/longitudinal-quality-policy.ts';

type LongitudinalQualityFixture = Readonly<{
  fixtureVersion: 1;
  cases: ReadonlyArray<Readonly<{
    name: string;
    maxSuspiciousPatternScore: number;
    input: LongitudinalQualityInput;
    expected: LongitudinalQualityResolution;
  }>>;
}>;

const fixturePath = resolve(
  process.cwd(),
  'fixtures/longitudinal-quality/quality-cases.v1.json',
);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as LongitudinalQualityFixture;

describe('Longitudinal quality shared fixture corpus', () => {
  it('resolves every synthetic fixture exactly as declared', () => {
    expect(fixture.fixtureVersion).toBe(1);
    expect(fixture.cases).not.toHaveLength(0);

    for (const fixtureCase of fixture.cases) {
      expect(
        resolveLongitudinalQuality(
          fixtureCase.input,
          fixtureCase.maxSuspiciousPatternScore,
        ),
        fixtureCase.name,
      ).toEqual(fixtureCase.expected);
    }
  });
});
