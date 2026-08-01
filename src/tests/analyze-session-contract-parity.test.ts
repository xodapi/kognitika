import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseAnalyzeSessionInput } from '../core/analyze-session';

type ContractCase = {
  name: string;
  valid: boolean;
  input: unknown;
};

const fixturePath = fileURLToPath(new URL('../../fixtures/analyze-session/contract-cases.json', import.meta.url));
const contractCases = JSON.parse(readFileSync(fixturePath, 'utf8')) as ContractCase[];

describe('AnalyzeSession shared contract corpus', () => {
  it('accepts and rejects every shared fixture exactly as declared', () => {
    expect(contractCases).not.toHaveLength(0);

    for (const contractCase of contractCases) {
      const parsed = parseAnalyzeSessionInput(contractCase.input);
      expect(parsed.success, contractCase.name).toBe(contractCase.valid);
    }
  });
});
