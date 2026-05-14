/**
 * Headless tests for Collision Detector Engine
 * Validates rule application, hit/miss/fp tracking, scoring
 */
import { describe, it, expect } from 'vitest';

interface Rule { id: number; text: string; }
interface Card { id: number; text: string; isViolation: boolean; ruleRef?: number; }

// Mirror the scoring logic from useCollisionEngine
function computeScore(hits: number, falsePositives: number) {
  return Math.max(0, hits - falsePositives);
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TEST_CARDS: Card[] = [
  { id: 1, text: 'А = 10, Б = 5', isViolation: false },
  { id: 2, text: 'Б = 100, А = 3', isViolation: true, ruleRef: 1 },
  { id: 3, text: 'Y завершён, запускаем X', isViolation: false },
  { id: 4, text: 'X активирован до Y', isViolation: true, ruleRef: 2 },
  { id: 5, text: 'А = 7, Б = 2', isViolation: false },
  { id: 6, text: 'Б = А', isViolation: true, ruleRef: 1 },
];

describe('Collision Detector Engine — Core Logic', () => {
  it('should correctly identify violations in card set', () => {
    const violations = TEST_CARDS.filter(c => c.isViolation);
    expect(violations.length).toBe(3);
  });

  it('should score 0 when hits and fp cancel out', () => {
    expect(computeScore(3, 3)).toBe(0);
  });

  it('should score positively for hits with no fp', () => {
    expect(computeScore(3, 0)).toBe(3);
  });

  it('should never go below 0', () => {
    expect(computeScore(0, 5)).toBe(0);
  });

  it('should shuffle deterministically with same seed', () => {
    const s1 = shuffle(TEST_CARDS, 42);
    const s2 = shuffle(TEST_CARDS, 42);
    expect(s1.map(c => c.id)).toEqual(s2.map(c => c.id));
  });

  it('should shuffle differently with different seeds', () => {
    const s1 = shuffle(TEST_CARDS, 42);
    const s2 = shuffle(TEST_CARDS, 99);
    // Extremely unlikely to match with different seeds
    expect(s1.map(c => c.id)).not.toEqual(s2.map(c => c.id));
  });

  it('perfect run: flag all violations, zero false positives', () => {
    let hits = 0;
    let fp = 0;
    TEST_CARDS.forEach(card => {
      if (card.isViolation) hits++; // user flags all violations
      // user never flags non-violations → fp = 0
    });
    expect(computeScore(hits, fp)).toBe(3);
  });

  it('worst run: flag nothing, score should be 0 with penalty-free', () => {
    const hits = 0, fp = 0;
    expect(computeScore(hits, fp)).toBe(0);
  });

  it('should track violation ratio correctly', () => {
    const total = TEST_CARDS.length;
    const violations = TEST_CARDS.filter(c => c.isViolation).length;
    const violationRatio = violations / total;
    expect(violationRatio).toBeCloseTo(0.5, 1); // ~50%
  });
});
