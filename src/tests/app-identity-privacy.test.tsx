import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';

vi.setConfig({ testTimeout: 30000 });

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../hooks/useAuth', () => ({
  AuthProvider: ({ children }: any) => <>{children}</>,
  useAuth: () => ({
    user: {
      pseudonym: 'Solar-Spark-7873',
      name: null,
      level: 3,
      rating: 120,
      brainId: '00000000-0000-4000-8000-000000000488',
      role: 'USER',
    },
    logout: vi.fn(),
    token: 'synthetic-token',
  }),
}));

vi.mock('../components/AppErrorBoundary', () => ({
  AppErrorBoundary: ({ children }: any) => <>{children}</>,
}));

vi.mock('../components/AuthModal', () => ({
  AuthModal: () => null,
}));

vi.mock('../components/FeedbackModal', () => ({
  FeedbackModal: () => null,
}));

vi.mock('../components/DonateButton', () => ({
  DonateButton: () => null,
}));

vi.mock('../components/Dashboard', () => ({
  Dashboard: () => <div data-testid="dashboard">Dashboard</div>,
}));

describe('App identity privacy', () => {
  it('does not show raw Brain ID material in the mobile drawer by default', async () => {
    const { container } = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('dashboard')).toBeInTheDocument();
    expect(container).toHaveTextContent('Solar-Spark-7873');
    expect(container).not.toHaveTextContent('00000000-0000-4000-8000-000000000488');

    fireEvent.click(screen.getAllByRole('button')[0]);

    expect(screen.getByText('Приватный Brain ID')).toBeInTheDocument();
    expect(container).not.toHaveTextContent('00000000-0000-4000-8000-000000000488');
    expect(container).not.toHaveTextContent('Brain ID 00000000');
  });
});
