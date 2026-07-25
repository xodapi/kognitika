import {
  ALPHABET_ACTION_CUES,
  type AlphabetAction,
  type AlphabetActionCue,
} from './alphabet-table-generator';
import { STROOP_COLORS, type StroopColorId } from './stroop-colors';

export interface StroopAlphabetStimulus {
  id: string;
  word: string;
  wordColorId: StroopColorId;
  textColorId: StroopColorId;
  textColor: string;
  action: AlphabetAction;
  cue: AlphabetActionCue;
}

export interface GeneratedStroopAlphabetSet {
  seed: number;
  items: StroopAlphabetStimulus[];
}

export const DEFAULT_STROOP_ALPHABET_COUNT = 18;

function normalizeSeed(seed?: number) {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return Math.trunc(seed) >>> 0;
  }
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

function createRandom(seed: number) {
  let value = seed || 0x9e3779b9;
  return () => {
    value = Math.imul(value ^ (value >>> 16), 2246822519);
    value = Math.imul(value ^ (value >>> 13), 3266489917);
    return ((value ^= value >>> 16) >>> 0) / 0x100000000;
  };
}

function pick<T>(values: readonly T[], random: () => number) {
  return values[Math.floor(random() * values.length)];
}

export function generateStroopAlphabetSet(
  count = DEFAULT_STROOP_ALPHABET_COUNT,
  seed?: number,
): GeneratedStroopAlphabetSet {
  const safeCount = Number.isFinite(count) ? count : DEFAULT_STROOP_ALPHABET_COUNT;
  const normalizedCount = Math.max(1, Math.min(60, Math.round(safeCount)));
  const normalizedSeed = normalizeSeed(seed);
  const random = createRandom(normalizedSeed);
  const actions: AlphabetAction[] = ['RIGHT', 'LEFT', 'BOTH'];

  return {
    seed: normalizedSeed,
    items: Array.from({ length: normalizedCount }, (_, index) => {
      const wordColor = pick(STROOP_COLORS, random);
      const textColor = pick(
        STROOP_COLORS.filter((color) => color.id !== wordColor.id),
        random,
      );
      const action = actions[index % actions.length];

      return {
        id: `${normalizedSeed}-${index}`,
        word: wordColor.text,
        wordColorId: wordColor.id,
        textColorId: textColor.id,
        textColor: textColor.textColor,
        action,
        cue: ALPHABET_ACTION_CUES[action],
      };
    }),
  };
}
