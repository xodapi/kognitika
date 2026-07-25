import { describe, expect, it } from 'vitest';
import {
  ALPHABET_ACTION_CUES,
  ALPHABET_TABLE_PRESETS,
  MAX_ALPHABET_QUESTION_COUNT,
  MIN_ALPHABET_QUESTION_COUNT,
  RUSSIAN_ALPHABET,
  generateAlphabetTable,
} from '../lib/alphabet-table-generator';

describe('alphabet-table generator', () => {
  it('contains the complete 33-letter Russian alphabet', () => {
    expect(RUSSIAN_ALPHABET).toHaveLength(33);
    expect(RUSSIAN_ALPHABET).toContain('Ё');
    expect(new Set(RUSSIAN_ALPHABET).size).toBe(33);
  });

  it('generates every preset deterministically with unique letters and valid cues', () => {
    expect(ALPHABET_TABLE_PRESETS).toHaveLength(3);

    for (const preset of ALPHABET_TABLE_PRESETS) {
      const first = generateAlphabetTable(33, preset.id, 129);
      const second = generateAlphabetTable(33, preset.id, 129);

      expect(second).toEqual(first);
      expect(first.items).toHaveLength(33);
      expect(new Set(first.items.map((item) => item.letter)).size).toBe(33);
      expect(first.items.every((item) => item.cue === ALPHABET_ACTION_CUES[item.action])).toBe(true);
      expect(new Set(first.items.map((item) => item.cue))).toEqual(new Set(['П', 'Л', 'О']));
    }
  });

  it('keeps question counts inside the unique-letter range', () => {
    expect(generateAlphabetTable(1, 'balanced', 1).items).toHaveLength(MIN_ALPHABET_QUESTION_COUNT);
    expect(generateAlphabetTable(100, 'balanced', 1).items).toHaveLength(MAX_ALPHABET_QUESTION_COUNT);
    expect(generateAlphabetTable(Number.NaN, 'balanced', 1).items).toHaveLength(MAX_ALPHABET_QUESTION_COUNT);
  });
});
