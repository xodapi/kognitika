import { describe, expect, it } from 'vitest';
import {
  MENTAL_MATH_PRESETS,
  computeMentalMathScore,
  generateMathSet,
  type MathLegend,
  type MathQuestion,
} from '../lib/mentmath-generator';
import { computeServerScore } from '../server/services/game-score';

function evaluate(question: MathQuestion, legend: MathLegend) {
  const tokens = question.equation.split(/\s+/);
  let result = Number(tokens[0]);
  for (let index = 1; index < tokens.length; index += 2) {
    const operator = legend[tokens[index]] || tokens[index];
    const operand = Number(tokens[index + 1]);
    if (operator === '+') result += operand;
    if (operator === '-') result -= operand;
    if (operator === '*') result *= operand;
    if (operator === '/') result /= operand;
  }
  return result;
}

describe('mental-math generator modes', () => {
  it('generates 48 deterministic and unique questions for every mode', () => {
    expect(MENTAL_MATH_PRESETS).toHaveLength(4);

    for (const preset of MENTAL_MATH_PRESETS) {
      const first = generateMathSet(48, preset.level, 131);
      const second = generateMathSet(48, preset.level, 131);

      expect(second).toEqual(first);
      expect(first.questions).toHaveLength(48);
      expect(new Set(first.questions.map((question) => question.equation)).size).toBe(48);
      expect(first.questions.every((question) => evaluate(question, first.legend) === question.answer)).toBe(true);
      expect(Object.keys(first.legend).length).toBe(preset.level === 3 ? 2 : preset.level === 4 ? 4 : 0);
    }
  });

  it('keeps direct and symbol modes semantically distinct', () => {
    const direct = generateMathSet(20, 2, 7);
    const symbolic = generateMathSet(20, 3, 7);

    expect(direct.questions.every((question) => / [*/] /.test(question.equation))).toBe(true);
    expect(symbolic.questions.every((question) => !/[+\-*/]/.test(question.equation))).toBe(true);
  });

  it('uses the authoritative server score formula', () => {
    expect(computeMentalMathScore(45000, 90, 2)).toBe(computeServerScore({
      gameType: 'MENTAL_MATH',
      timeMs: 45000,
      metadata: { accuracy: 90, errors: 2 },
    }));
  });
});
