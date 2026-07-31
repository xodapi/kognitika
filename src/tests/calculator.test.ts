import { describe, expect, it } from 'vitest';
import { evaluateArithmetic } from '../lib/calculator';

describe('calculator expression parser', () => {
  it('evaluates supported arithmetic with precedence and rounding', () => {
    expect(evaluateArithmetic('2+3*4')).toBe(14);
    expect(evaluateArithmetic('10/4+0.005')).toBe(2.51);
    expect(evaluateArithmetic('-3*2+10')).toBe(4);
  });

  it('rejects malformed or non-finite expressions', () => {
    for (const expression of ['', '1+', '1..2+3', '1/0', '2**3', '2(3)', '1;globalThis.x=1', 'alert(1)']) {
      expect(() => evaluateArithmetic(expression)).toThrow();
    }
  });
});
