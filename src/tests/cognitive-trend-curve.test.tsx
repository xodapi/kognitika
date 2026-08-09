import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
  afterEach(() => {
    cleanup();
    mockUseAuth.mockReset();
    vi.unstubAllGlobals();
  });

  it('shows empty state when no token', () => {
    mockUseAuth.mockReturnValue({ token: null });
    render(<CognitiveTrendCurve />);
    expect(screen.getByText(/недостаточно данных/i)).toBeDefined();
  });

  it('shows loading state when token is present', async () => {
    mockUseAuth.mockReturnValue({ token: 'synthetic-token' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('synthetic network failure')));
    render(<CognitiveTrendCurve compact />);
    expect(screen.getByText(/загрузка тренда/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/недостаточно данных/i)).toBeDefined();
    });
  });

  it('shows loading state in full mode', async () => {
    mockUseAuth.mockReturnValue({ token: 'synthetic-token' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('synthetic network failure')));
    render(<CognitiveTrendCurve />);
    expect(screen.getByText(/загрузка тренда/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/недостаточно данных/i)).toBeDefined();
    });
  });

  it('treats a malformed successful response as unavailable data', async () => {
    mockUseAuth.mockReturnValue({ token: 'synthetic-token' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }));

    render(<CognitiveTrendCurve compact />);

    await waitFor(() => {
      expect(screen.getByText(/недостаточно данных/i)).toBeDefined();
    });
  });
});
