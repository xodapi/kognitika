import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CognitiveTrendCurve } from '../components/CognitiveTrendCurve';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ token: 'synthetic-token' }),
}));

vi.mock('../components/SafeResponsiveContainer', () => ({
  SafeResponsiveContainer: ({
    children,
    width,
    height,
  }: {
    children: ReactNode;
    width?: string;
    height?: string | number;
  }) => (
    <div
      data-testid="responsive-chart"
      data-width={width}
      data-height={String(height)}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </div>
  ),
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('recharts', () => {
  const passthrough = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    CartesianGrid: passthrough,
    defs: passthrough,
    Legend: passthrough,
    Line: passthrough,
    linearGradient: passthrough,
    stop: passthrough,
    Tooltip: passthrough,
    XAxis: passthrough,
    YAxis: passthrough,
    LineChart: ({
      data,
      children,
    }: {
      data: Array<unknown>;
      children?: ReactNode;
    }) => (
      <div data-testid="line-chart" data-point-count={data.length}>
        {children}
      </div>
    ),
  };
});

const trendResponse = (points: Array<{
  date: string;
  accuracy: number;
  reactionMs: number;
  sessionCount: number;
}>) => ({
  moduleId: 'stroop',
  category: null,
  points: points.map((point) => ({
    ...point,
    fatigueIndex: 0.1,
    engagementIndex: 0.9,
  })),
  overallDirection: 'stable',
  timespanDays: 30,
  summary: {
    avgAccuracy: 0.8,
    avgReactionMs: 200,
    totalSessions: points.reduce((sum, point) => sum + point.sessionCount, 0),
  },
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CognitiveTrendCurve audit contract', () => {
  it.each([7, 30])('requests the selected %i-day view with auth scoping', async (days) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => trendResponse([
        { date: '2026-08-23', accuracy: 0.8, reactionMs: 200, sessionCount: 1 },
      ]),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<CognitiveTrendCurve moduleId="stroop" days={days} compact />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/analytics/cognitive-trend?moduleId=stroop&days=${days}`,
      { headers: { Authorization: 'Bearer synthetic-token' } },
    );
  });

  it('renders sparse server data without adding missing-day points', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => trendResponse([
        { date: '2026-07-26', accuracy: 0.7, reactionMs: 260, sessionCount: 1 },
        { date: '2026-08-22', accuracy: 0.9, reactionMs: 160, sessionCount: 1 },
      ]),
    }));

    render(<CognitiveTrendCurve compact />);

    await waitFor(() => expect(screen.getByTestId('line-chart')).toBeInTheDocument());
    expect(screen.getByTestId('line-chart')).toHaveAttribute('data-point-count', '2');
    expect(screen.queryByText(/недостаточно данных/i)).not.toBeInTheDocument();
  });

  it('keeps the chart fluid at the 320px mobile binding width', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 320,
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => trendResponse([
        { date: '2026-08-23', accuracy: 0.8, reactionMs: 200, sessionCount: 1 },
      ]),
    }));

    const { container } = render(<CognitiveTrendCurve compact />);

    await waitFor(() => expect(screen.getByTestId('responsive-chart')).toBeInTheDocument());
    expect(screen.getByTestId('responsive-chart')).toHaveAttribute('data-width', '100%');
    expect(screen.getByTestId('responsive-chart')).toHaveStyle({ width: '100%' });
    expect(container.querySelector('.h-\\[140px\\].w-full')).toBeInTheDocument();
  });
});
