import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from '../components/AppErrorBoundary';

vi.mock('../lib/client-error', () => ({
  reportClientError: vi.fn(),
}));

function CrashingChild(): ReactElement {
  throw new Error('synthetic render crash');
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders recovery UI that separates app-state reset from Brain ID identity', () => {
    render(
      <AppErrorBoundary>
        <CrashingChild />
      </AppErrorBoundary>,
    );

    expect(screen.getByText(/Интерфейс не загрузился/i)).toBeInTheDocument();
    expect(screen.getByText(/Brain ID и токен входа не удаляются/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Сбросить состояние/i })).toBeInTheDocument();
  });
});
