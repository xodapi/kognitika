/**
 * Статический контент-движок Когнитики (v2.0)
 *
 * Gemini API удалён — весь контент генерируется детерминированно
 * из локальной базы knowledge (content-db.ts) с seed-перемешкой.
 *
 * Применяется в: CollisionDetector, LanguageScanner, RealityCheck
 * Используемые данные: CARDS_BY_RULESET, RULE_SETS из content-db.ts
 */

import {
  RULE_SETS,
  CARDS_BY_RULESET,
  ContentCard,
} from './content-db';

// ──────────────────────────────────────────────────────────
// Публичные типы (интерфейсы не изменились — нет breaking change)
// ──────────────────────────────────────────────────────────

export interface GeneratedCard {
  text: string;
  isViolation: boolean;
  ruleViolated?: number;
  subtlety: 'obvious' | 'moderate' | 'expert';
}

export interface ManipPhrase {
  text: string;
  pattern: ManipPattern;
  context: 'workplace' | 'personal' | 'ai_interaction' | 'social_media';
  subtlety: 'obvious' | 'moderate' | 'expert';
}

export type ManipPattern =
  | 'appeal_to_ego'
  | 'false_generalization'
  | 'frame_shift'
  | 'guilt_induction'
  | 'false_alternative'
  | 'past_shift'
  | 'future_threat'
  | 'ai_hallucination'
  | 'valid';

export interface HallucinationStatement {
  text: string;
  isHallucination: boolean;
  falseElement?: string;
  subtlety: 'obvious' | 'moderate' | 'expert';
}

// ──────────────────────────────────────────────────────────
// Утилита: детерминированная перемешка по seed (Mulberry32)
// ──────────────────────────────────────────────────────────

function seededShuffle<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    // Mulberry32 PRNG — быстрый и детерминированный
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    const j = Math.floor(r * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ──────────────────────────────────────────────────────────
// Генераторы (синхронные, async-обёртка для обратной совместимости)
// ──────────────────────────────────────────────────────────

/**
 * Генерация карточек для Детектора Коллизий
 * Выбирает карточки из content-db.ts, детерминированно перемешанные по seed.
 */
export async function generateCollisionCards(
  rules: { id: number; text: string }[],
  level: number,
  count: number = 12
): Promise<GeneratedCard[]> {
  // Найти подходящий набор правил или взять первый
  const matchingRuleSet = RULE_SETS.find(rs =>
    rs.rules.length === rules.length &&
    rs.rules.every((r, i) => r.text === rules[i]?.text)
  );
  const ruleSetId = matchingRuleSet?.id ?? RULE_SETS[level % RULE_SETS.length].id;
  const allCards: ContentCard[] = CARDS_BY_RULESET[ruleSetId] ?? CARDS_BY_RULESET['sys_deps'];

  const seed = level * 1000 + rules.length;
  const shuffled = seededShuffle(allCards, seed).slice(0, count);

  return shuffled.map(c => ({
    text: c.text,
    isViolation: c.isViolation,
    ruleViolated: c.ruleRef,
    subtlety: c.subtlety,
  }));
}

/**
 * Генерация фраз для Смыслового Сканера
 * Использует наборы 'manipulations' и 'distortions' из content-db.ts.
 */
export async function generateManipPhrases(
  patterns: ManipPattern[],
  level: number,
  count: number = 15
): Promise<ManipPhrase[]> {
  const seed = level * 777 + patterns.length;

  const manipCards = CARDS_BY_RULESET['manipulations'] ?? [];
  const distortionCards = CARDS_BY_RULESET['distortions'] ?? [];
  const allSource = [...manipCards, ...distortionCards];

  const shuffled = seededShuffle(allSource, seed).slice(0, count);

  // Контекстный маппинг по содержимому текста
  const inferContext = (text: string): ManipPhrase['context'] => {
    if (/команд|коллег|работ|проект|менеджер|задач/i.test(text)) return 'workplace';
    if (/ИИ|AI|алгоритм|модел|данны/i.test(text)) return 'ai_interaction';
    if (/соцсет|пост|подписч|лайк/i.test(text)) return 'social_media';
    return 'personal';
  };

  // Паттерн маппинг по ruleRef
  const MANIP_PATTERN_MAP: ManipPattern[] = [
    'appeal_to_ego',
    'false_generalization',
    'guilt_induction',
    'false_alternative',
  ];
  const DISTORTION_PATTERN_MAP: ManipPattern[] = [
    'frame_shift',
    'past_shift',
    'future_threat',
    'ai_hallucination',
  ];

  return shuffled.map(c => {
    const isManip = manipCards.includes(c);
    const patternArr = isManip ? MANIP_PATTERN_MAP : DISTORTION_PATTERN_MAP;
    const pattern: ManipPattern = c.isViolation
      ? (patternArr[(c.ruleRef ?? 1) - 1] ?? 'frame_shift')
      : 'valid';

    return {
      text: c.text,
      pattern,
      context: inferContext(c.text),
      subtlety: c.subtlety,
    };
  });
}

/**
 * Генерация утверждений для Верификации Реальности
 * Использует набор 'hallucinations' из content-db.ts.
 */
export async function generateHallucinationStatements(
  sourceData: Record<string, string | number>[],
  level: number,
  count: number = 8
): Promise<HallucinationStatement[]> {
  const seed = level * 333 + sourceData.length;
  const cards = CARDS_BY_RULESET['hallucinations'] ?? [];
  const shuffled = seededShuffle(cards, seed).slice(0, count);

  return shuffled.map(c => ({
    text: c.text,
    isHallucination: c.isViolation,
    falseElement: c.metadata?.error ?? undefined,
    subtlety: c.subtlety,
  }));
}
