import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STROOP_ALPHABET_COUNT,
  generateStroopAlphabetSet,
} from '../lib/stroop-alphabet-generator';
import { STROOP_COLORS } from '../lib/stroop-colors';

describe('stroop-alphabet generator', () => {
  it('creates deterministic conflicting color stimuli with both response channels', () => {
    const first = generateStroopAlphabetSet(DEFAULT_STROOP_ALPHABET_COUNT, 42);
    const second = generateStroopAlphabetSet(DEFAULT_STROOP_ALPHABET_COUNT, 42);

    expect(second).toEqual(first);
    expect(first.items).toHaveLength(DEFAULT_STROOP_ALPHABET_COUNT);
    expect(first.items.every((item) => {
      const wordColor = STROOP_COLORS.find((color) => color.id === item.wordColorId);
      return wordColor?.text === item.word
        && item.textColorId !== item.wordColorId
        && wordColor.textColor !== item.textColor;
    })).toBe(true);
    expect(new Set(first.items.map((item) => item.cue))).toEqual(new Set(['П', 'Л', 'О']));
  });

  it('clamps invalid stimulus counts', () => {
    expect(generateStroopAlphabetSet(0, 1).items).toHaveLength(1);
    expect(generateStroopAlphabetSet(Number.NaN, 1).items).toHaveLength(DEFAULT_STROOP_ALPHABET_COUNT);
    expect(generateStroopAlphabetSet(100, 1).items).toHaveLength(60);
  });
});
