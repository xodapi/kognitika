import { readFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseAnalyzeSessionInput } from '../core/analyze-session';

type ContractCase = {
  name: string;
  valid: boolean;
  input: unknown;
};

const fixturePath = resolve(process.cwd(), 'fixtures/analyze-session/contract-cases.json');
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
