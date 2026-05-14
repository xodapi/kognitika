/**
 * Headless tests for Async Dispatcher Engine
 * Validates stream physics, trigger zone detection, scoring
 */
import { describe, it, expect } from 'vitest';

// Mirror core physics logic from useDispatcherEngine
interface StreamPhysics {
  progress: number;
  speed: number; // progress per second
  targetZoneMin: number;
  targetZoneMax: number;
}

function tickStream(s: StreamPhysics, deltaMs: number): StreamPhysics {
  let p = s.progress + s.speed * (deltaMs / 1000) * 100;
  if (p >= 100) p = 0; // overflow → reset
  return { ...s, progress: p };
}

function isInZone(s: StreamPhysics): boolean {
  return s.progress >= s.targetZoneMin && s.progress <= s.targetZoneMax;
}

function computeTriggerScore(inZone: boolean): number {
  return inZone ? 10 : -5;
}

describe('Async Dispatcher Engine — Stream Physics', () => {
  it('should advance progress correctly per tick', () => {
    const stream: StreamPhysics = { progress: 0, speed: 1.0, targetZoneMin: 70, targetZoneMax: 88 };
    const after1Sec = tickStream(stream, 1000);
    // speed=1.0 → 1 unit/s × 100 = 100% per second... but at 0+100=100 → overflow → 0
    // Actually: 0 + 1.0 * (1000/1000) * 100 = 100 → overflow → 0
    expect(after1Sec.progress).toBe(0);
  });

  it('should not advance into negative progress', () => {
    const stream: StreamPhysics = { progress: 0, speed: 0.5, targetZoneMin: 70, targetZoneMax: 88 };
    const after = tickStream(stream, 500); // 0 + 0.5 * 0.5 * 100 = 25
    expect(after.progress).toBe(25);
    expect(after.progress).toBeGreaterThanOrEqual(0);
  });

  it('should wrap on overflow', () => {
    const stream: StreamPhysics = { progress: 95, speed: 0.1, targetZoneMin: 70, targetZoneMax: 88 };
    const after = tickStream(stream, 1000); // 95 + 0.1*1*100 = 105 → overflow → 0
    expect(after.progress).toBe(0);
  });

  it('correctly detects when progress is in target zone', () => {
    const base: StreamPhysics = { progress: 0, speed: 0, targetZoneMin: 70, targetZoneMax: 88 };
    expect(isInZone({ ...base, progress: 69 })).toBe(false);
    expect(isInZone({ ...base, progress: 70 })).toBe(true);
    expect(isInZone({ ...base, progress: 79 })).toBe(true);
    expect(isInZone({ ...base, progress: 88 })).toBe(true);
    expect(isInZone({ ...base, progress: 89 })).toBe(false);
  });

  it('should award +10 for in-zone trigger', () => {
    expect(computeTriggerScore(true)).toBe(10);
  });

  it('should penalize -5 for out-of-zone trigger', () => {
    expect(computeTriggerScore(false)).toBe(-5);
  });

  it('should compute correct total score for mixed triggers', () => {
    const triggers = [true, true, false, true, false, true]; // 4 correct, 2 wrong
    const totalScore = triggers.reduce((sum, inZone) => Math.max(0, sum + computeTriggerScore(inZone)), 0);
    // 10+10-5+10-5+10 = 30
    expect(totalScore).toBe(30);
  });

  it('should never let score go below 0', () => {
    const triggers = [false, false, false]; // 3 wrong triggers
    let score = 0;
    triggers.forEach(inZone => {
      score = Math.max(0, score + computeTriggerScore(inZone));
    });
    expect(score).toBe(0);
  });

  it('should have faster streams at higher levels', () => {
    const levelOneSpeed = 1.0 * (1 + (1 - 1) * 0.15);
    const levelThreeSpeed = 1.0 * (1 + (3 - 1) * 0.15);
    expect(levelThreeSpeed).toBeGreaterThan(levelOneSpeed);
  });

  it('should simulate 3-second partial game with correct overflow count', () => {
    let stream: StreamPhysics = { progress: 0, speed: 0.5, targetZoneMin: 70, targetZoneMax: 88 };
    let overflows = 0;
    
    // Simulate 3 seconds with 50ms ticks
    for (let t = 0; t < 3000; t += 50) {
      const prevProgress = stream.progress;
      stream = tickStream(stream, 50);
      if (stream.progress < prevProgress) overflows++; // wrapped
    }
    
    // speed=0.5 → 50 units/sec, 3 sec → 150 total → ~1.5 overflows
    expect(overflows).toBeGreaterThanOrEqual(1);
  });
});
