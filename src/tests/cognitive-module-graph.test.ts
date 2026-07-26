import { describe, expect, it } from 'vitest';
import { modulePosition } from '../components/CognitiveModuleGraph';
import { NEXT_MODULE } from '../lib/practice-recommendations';

describe('Cognitive module graph layout', () => {
  it('keeps every module in a unique spaced position', () => {
    const moduleIds = [...new Set([...Object.keys(NEXT_MODULE), ...Object.values(NEXT_MODULE)])];
    const positions = moduleIds.map((moduleId, index) => modulePosition(moduleId, index));
    const compactPositions = moduleIds.map((moduleId, index) => modulePosition(moduleId, index, true));

    expect(new Set(positions.map(({ x, y }) => `${x}:${y}`)).size).toBe(positions.length);
    expect(new Set(compactPositions.map(({ x, y }) => `${x}:${y}`)).size).toBe(compactPositions.length);
    expect(positions[0]).toEqual({ x: 0, y: 0 });
    expect(modulePosition('logical')).toEqual({ x: 555, y: 82 });
    expect(modulePosition('numerical', 0, true)).toEqual({ x: 290, y: 84 });
  });

  it('places side modules below the main grid', () => {
    expect(modulePosition('situational').y).toBeGreaterThan(modulePosition('typing').y);
    expect(modulePosition('numerical').x).toBe(modulePosition('logical').x);
  });
});
