import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SafeResponsiveContainer } from '../components/SafeResponsiveContainer';

class MockResizeObserver {
  static instance: MockResizeObserver | null = null;
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(private readonly callback: ResizeObserverCallback) {
    MockResizeObserver.instance = this;
  }

  trigger(width: number, height: number) {
    this.callback(
      [{ contentRect: { width, height } as DOMRectReadOnly } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
}

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

describe('SafeResponsiveContainer', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    MockResizeObserver.instance = null;
  });

  it('renders the chart only after the container has positive dimensions', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 320,
      height: 200,
    } as DOMRect);

    render(
      <SafeResponsiveContainer width="100%" height="100%">
        <div>chart</div>
      </SafeResponsiveContainer>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByText('chart')).toBeInTheDocument();
    });
  });

  it('does not initialize a chart with zero dimensions', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 0,
      height: 0,
    } as DOMRect);

    render(
      <SafeResponsiveContainer width="100%" height="100%">
        <div>chart</div>
      </SafeResponsiveContainer>,
    );

    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('initializes after a hidden container becomes visible', async () => {
    const measure = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValueOnce({ width: 0, height: 0 } as DOMRect)
      .mockReturnValue({ width: 320, height: 200 } as DOMRect);

    render(
      <SafeResponsiveContainer width="100%" height="100%">
        <div>chart</div>
      </SafeResponsiveContainer>,
    );

    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
    await act(async () => {
      MockResizeObserver.instance?.trigger(320, 200);
    });

    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
    expect(measure).toHaveBeenCalled();
  });

  it('disconnects its observer when unmounted', () => {
    const { unmount } = render(
      <SafeResponsiveContainer width="100%" height="100%">
        <div>chart</div>
      </SafeResponsiveContainer>,
    );
    const observer = MockResizeObserver.instance;

    unmount();

    expect(observer?.disconnect).toHaveBeenCalledOnce();
  });
});
