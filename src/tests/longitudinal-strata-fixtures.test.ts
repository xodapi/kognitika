import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LONGITUDINAL_STRATA_POLICY,
  resolveLongitudinalStratum,
  type LongitudinalStrataResolution,
} from '../lib/longitudinal-strata.ts';

type LongitudinalStrataFixture = Readonly<{
  fixtureVersion: 1;
  cases: ReadonlyArray<Readonly<{
    name: string;
    input: unknown;
    expected: LongitudinalStrataResolution;
  }>>;
}>;

const fixturePath = resolve(
  process.cwd(),
  'fixtures/longitudinal-strata/exclusion-cases.v1.json',
);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as LongitudinalStrataFixture;

describe('Longitudinal strata exclusion fixture corpus', () => {
  it('keeps unapproved aliases and versions excluded without normalization', () => {
    expect(fixture.fixtureVersion).toBe(1);
    expect(fixture.cases).not.toHaveLength(0);

    for (const fixtureCase of fixture.cases) {
      expect(
        resolveLongitudinalStratum(fixtureCase.input, LONGITUDINAL_STRATA_POLICY),
        fixtureCase.name,
      ).toEqual(fixtureCase.expected);
    }
  });
});
