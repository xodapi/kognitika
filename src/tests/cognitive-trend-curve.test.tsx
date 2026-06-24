import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CognitiveTrendCurve } from '../components/CognitiveTrendCurve';

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('CognitiveTrendCurve', () => {
  it('shows empty state when no token', () => {
    mockUseAuth.mockReturnValue({ token: null });
    render(<CognitiveTrendCurve />);
    expect(screen.getByText(/недостаточно данных/i)).toBeDefined();
  });

  it('shows loading state when token is present', () => {
    mockUseAuth.mockReturnValue({ token: 'synthetic-token' });
    render(<CognitiveTrendCurve compact />);
    expect(screen.getByText(/загрузка тренда/i)).toBeDefined();
  });

  it('shows loading state in full mode', () => {
    mockUseAuth.mockReturnValue({ token: 'synthetic-token' });
    render(<CognitiveTrendCurve />);
    expect(screen.getByText(/загрузка тренда/i)).toBeDefined();
  });
});
