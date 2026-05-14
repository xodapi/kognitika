import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConcentrationCurve } from './ConcentrationCurve';

// Mock ResizeObserver which is needed for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('ConcentrationCurve', () => {
  const mockHistory = [
    { num: 1, color: 'black', timeMs: 1000, reactionTimeMs: 1000, cellId: 1, gridIndex: 0 },
    { num: 2, color: 'black', timeMs: 1500, reactionTimeMs: 500, cellId: 2, gridIndex: 1 },
  ];

  it('renders the chart container', () => {
    render(<ConcentrationCurve data={mockHistory} />);
    expect(screen.getByText(/Кривая концентрации/i)).toBeDefined();
  });

  it('calculates average correctly', () => {
    render(<ConcentrationCurve data={mockHistory} />);
    // Total reaction time: 1000 + 500 = 1500. Avg: 750ms -> 0.75s
    expect(screen.getByText(/0.75s/i)).toBeDefined();
  });
});
