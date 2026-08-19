import { describe, expect, it } from 'vitest';
import {
  LONGITUDINAL_CHANGE_VERSION,
  summarizeLongitudinalChange,
} from '../lib/longitudinal-change.ts';

describe('longitudinal personal change', () => {
  it('requires robust minimum samples and ignores malformed values', () => {
    expect(summarizeLongitudinalChange([1, 2, Number.NaN], [3, 4, 5], 1)).toMatchObject({
      version: LONGITUDINAL_CHANGE_VERSION,
      status: 'insufficient_data',
      baselineSampleCount: 2,
      currentSampleCount: 3,
      normalizedChange: null,
    });
  });

  it('uses medians and robust scale to limit a single extreme baseline observation', () => {
    const result = summarizeLongitudinalChange([10, 10, 11, 10_000], [12, 12, 13], 1);

    expect(result).toMatchObject({
      status: 'ready',
      baselineMedian: 10.5,
      currentMedian: 12,
      absoluteChange: 1.5,
      normalizedChange: 1.5,
    });
    expect(result.uncertainty).toBeGreaterThan(0);
  });

  it('keeps speed and accuracy callers separate and exposes no diagnostic interpretation', () => {
    const accuracy = summarizeLongitudinalChange([0.6, 0.7, 0.8], [0.7, 0.8, 0.9], 0.05);
    const speed = summarizeLongitudinalChange([300, 310, 320], [280, 290, 300], 10);

    expect(accuracy.normalizedChange).toBeGreaterThan(0);
    expect(speed.normalizedChange).toBeLessThan(0);
    expect(JSON.stringify({ accuracy, speed })).not.toMatch(/diagnos|cognitive|clinical|ability|iq/i);
  });

  it('rejects an invalid caller-selected scale floor', () => {
    expect(() => summarizeLongitudinalChange([1, 2, 3], [2, 3, 4], 0)).toThrow(/scaleFloor/);
  });
});
