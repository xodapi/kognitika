export const RUSSIAN_ALPHABET = [
  'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'Й',
  'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У', 'Ф',
  'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я',
] as const;

export type AlphabetAction = 'RIGHT' | 'LEFT' | 'BOTH';
export type AlphabetActionCue = 'П' | 'Л' | 'О';
export type AlphabetTablePreset = 'balanced' | 'alternating' | 'switching';

export interface AlphabetTableItem {
  id: string;
  letter: (typeof RUSSIAN_ALPHABET)[number];
  action: AlphabetAction;
  cue: AlphabetActionCue;
}

export interface GeneratedAlphabetTable {
  items: AlphabetTableItem[];
  preset: AlphabetTablePreset;
  seed: number;
}

export const ALPHABET_ACTION_CUES: Record<AlphabetAction, AlphabetActionCue> = {
  RIGHT: 'П',
  LEFT: 'Л',
  BOTH: 'О',
};

export function alphabetActionFromKey(key: string): AlphabetAction | null {
  const normalizedKey = key.toLowerCase();
  if (key === 'ArrowRight' || normalizedKey === 'd') return 'RIGHT';
  if (key === 'ArrowLeft' || normalizedKey === 'a') return 'LEFT';
  if (key === ' ' || normalizedKey === 'o') return 'BOTH';
  return null;
}

export const ALPHABET_TABLE_PRESETS: ReadonlyArray<{
  id: AlphabetTablePreset;
  title: string;
  description: string;
}> = [
  {
    id: 'balanced',
    title: 'Баланс',
    description: 'Равномерное распределение правой, левой и совместной реакции.',
  },
  {
    id: 'alternating',
    title: 'Чередование',
    description: 'Последовательная смена П, Л и О для устойчивого темпа.',
  },
  {
    id: 'switching',
    title: 'Переключение',
    description: 'Перемешанные команды с более частой сменой стороны.',
  },
] as const;

export const MIN_ALPHABET_QUESTION_COUNT = 9;
export const MAX_ALPHABET_QUESTION_COUNT = RUSSIAN_ALPHABET.length;
export const DEFAULT_ALPHABET_QUESTION_COUNT = 33;

function normalizeSeed(seed?: number) {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return Math.trunc(seed) >>> 0;
  }
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

function createSeededRandom(seed: number) {
  let value = seed || 0x6d2b79f5;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 0x100000000;
  };
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function buildActions(
  count: number,
  preset: AlphabetTablePreset,
  random: () => number,
): AlphabetAction[] {
  const cycle: AlphabetAction[] = ['RIGHT', 'LEFT', 'BOTH'];

  if (preset === 'alternating') {
    return Array.from({ length: count }, (_, index) => cycle[index % cycle.length]);
  }

  const balanced = Array.from({ length: count }, (_, index) => cycle[index % cycle.length]);
  if (preset === 'balanced') {
    return shuffle(balanced, random);
  }

  const switchingCycle: AlphabetAction[] = ['RIGHT', 'LEFT', 'BOTH', 'LEFT', 'RIGHT', 'BOTH'];
  const offset = Math.floor(random() * switchingCycle.length);
  return Array.from(
    { length: count },
    (_, index) => switchingCycle[(index + offset) % switchingCycle.length],
  );
}

export function generateAlphabetTable(
  count = DEFAULT_ALPHABET_QUESTION_COUNT,
  preset: AlphabetTablePreset = 'balanced',
  seed?: number,
): GeneratedAlphabetTable {
  const safeCount = Number.isFinite(count) ? count : DEFAULT_ALPHABET_QUESTION_COUNT;
  const normalizedCount = Math.min(
    MAX_ALPHABET_QUESTION_COUNT,
    Math.max(MIN_ALPHABET_QUESTION_COUNT, Math.round(safeCount)),
  );
  const normalizedSeed = normalizeSeed(seed);
  const random = createSeededRandom(normalizedSeed);
  const letters = shuffle(RUSSIAN_ALPHABET, random).slice(0, normalizedCount);
  const actions = buildActions(normalizedCount, preset, random);

  return {
    preset,
    seed: normalizedSeed,
    items: letters.map((letter, index) => {
      const action = actions[index];
      return {
        id: `${normalizedSeed}-${index}`,
        letter,
        action,
        cue: ALPHABET_ACTION_CUES[action],
      };
    }),
  };
}
