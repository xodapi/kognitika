import { describe, it, expect } from 'vitest';
import { buildPraise, type PraiseInput } from '../lib/praise-engine';

describe('praise engine', () => {
  const baseInput: PraiseInput = {
    currentAccuracy: 0.85,
    currentReactionMs: 250,
    currentFatigueIndex: 0.05,
    currentEngagementIndex: 0.9,
  };

  it('generates positive headline when accuracy improves', () => {
    const result = buildPraise({
      ...baseInput,
      currentAccuracy: 0.92,
      historicalAvgAccuracy: 0.8,
    });

    expect(result.headline).toContain('Точность');
    expect(result.metricHighlights.length).toBeGreaterThanOrEqual(3);
    const accuracyHighlight = result.metricHighlights.find((h) => h.metric === 'accuracy');
    expect(accuracyHighlight?.isPositive).toBe(true);
  });

  it('generates positive headline when reaction improves', () => {
    const result = buildPraise({
      ...baseInput,
      currentReactionMs: 180,
      historicalAvgReactionMs: 280,
    });

    expect(result.headline).toContain('скорость');
    const reactionHighlight = result.metricHighlights.find((h) => h.metric === 'reaction');
    expect(reactionHighlight?.isPositive).toBe(true);
  });

  it('generates stable headline for flat performance', () => {
    const result = buildPraise({
      ...baseInput,
      currentAccuracy: 0.8,
      currentReactionMs: 250,
      historicalAvgAccuracy: 0.8,
      historicalAvgReactionMs: 250,
    });

    expect(result.headline).toBeDefined();
    expect(result.details.length).toBeGreaterThan(0);
  });

  it('generates fatigue warning when fatigue is high', () => {
    const result = buildPraise({
      ...baseInput,
      currentFatigueIndex: 0.4,
    });

    const fatigueHighlight = result.metricHighlights.find((h) => h.metric === 'fatigue');
    expect(fatigueHighlight?.isPositive).toBe(false);
    expect(result.details.some((d) => d.includes('усталости'))).toBe(true);
  });

  it('generates engagement praise when engagement is high', () => {
    const result = buildPraise({
      ...baseInput,
      currentEngagementIndex: 0.95,
    });

    const engagementHighlight = result.metricHighlights.find((h) => h.metric === 'engagement');
    expect(engagementHighlight?.isPositive).toBe(true);
    expect(result.details.some((d) => d.includes('вовлечены'))).toBe(true);
  });

  it('handles missing historical data gracefully', () => {
    const result = buildPraise({
      currentAccuracy: 0.85,
      currentReactionMs: 250,
      currentFatigueIndex: 0.1,
      currentEngagementIndex: 0.75,
    });

    expect(result.headline).toBeDefined();
    expect(result.metricHighlights.length).toBe(4);
    expect(result.metricHighlights.every((h) => h.direction === 'stable')).toBe(true);
  });

  it('generates combined headline for excellent session', () => {
    const result = buildPraise({
      ...baseInput,
      currentAccuracy: 0.95,
      currentReactionMs: 150,
      historicalAvgAccuracy: 0.8,
      historicalAvgReactionMs: 300,
    });

    expect(result.headline).toContain('Превосходная');
  });

  it('generates recovery suggestion for poor session', () => {
    const result = buildPraise({
      ...baseInput,
      currentAccuracy: 0.5,
      currentReactionMs: 400,
      currentFatigueIndex: 0.5,
      historicalAvgAccuracy: 0.85,
      historicalAvgReactionMs: 250,
    });

    expect(result.headline).toBeDefined();
    expect(result.details.some((d) => d.includes('усталости'))).toBe(true);
  });

  it('returns all four metric highlights', () => {
    const result = buildPraise(baseInput);
    const metrics = result.metricHighlights.map((h) => h.metric);
    expect(metrics).toContain('accuracy');
    expect(metrics).toContain('reaction');
    expect(metrics).toContain('fatigue');
    expect(metrics).toContain('engagement');
  });

  it('formats percentage values correctly', () => {
    const result = buildPraise({ ...baseInput, currentAccuracy: 0.87 });
    const accHighlight = result.metricHighlights.find((h) => h.metric === 'accuracy');
    expect(accHighlight?.value).toBe(87);
  });
});
