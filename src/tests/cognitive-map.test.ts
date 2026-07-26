import { describe, expect, it } from 'vitest';
import { allModuleIds, cognitiveMapModulePosition } from '../components/CognitiveMap';

describe('Cognitive map layout', () => {
  it('keeps every mapped module in a unique grid position', () => {
    const positions = allModuleIds.map((_, index) => cognitiveMapModulePosition(index));
    const keys = positions.map(({ x, y }) => `${x}:${y}`);

    expect(new Set(keys).size).toBe(allModuleIds.length);
    expect(allModuleIds).toEqual(expect.arrayContaining([
      'mental-math',
      'schulte-90',
      'alphabet-table',
      'stroop-alphabet',
    ]));
  });

  it('wraps modules into columns instead of a single clipped row', () => {
    expect(cognitiveMapModulePosition(0)).toEqual({ x: 0, y: 0 });
    expect(cognitiveMapModulePosition(3)).toEqual({ x: 0, y: 58 });
  });
});
