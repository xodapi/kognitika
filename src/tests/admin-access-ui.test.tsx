import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { ThemeProvider } from '../components/ThemeProvider';

vi.mock('../components/AdminPanel', () => ({
  AdminPanel: ({ token }: { token: string | null }) => (
    <div>Админ-панель загружена {token ? 'с токеном' : 'без токена'}</div>
  ),
}));

function renderAdminRoute() {
  return render(
    <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem={false}>
      <MemoryRouter initialEntries={['/admin']}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

function storeUser(role: 'USER' | 'ADMIN') {
  const token = `synthetic-${role.toLowerCase()}-token`;
  localStorage.setItem('kognitika:auth:token', JSON.stringify(token));
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify({
    id: `user_synthetic_${role.toLowerCase()}`,
    name: role === 'ADMIN' ? 'Synthetic Admin' : 'Synthetic User',
    pseudonym: role === 'ADMIN' ? 'Brain Admin' : 'Brain User',
    brainId: role === 'ADMIN' ? 'BR-SYNTHETIC-ADMIN' : 'BR-SYNTHETIC-USER',
    role,
    level: 1,
    experience: 0,
    rating: 0,
    streakDays: 0,
  }));
}

describe('/admin access states', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('shows a clear Brain ID login prompt for unauthenticated users', async () => {
    renderAdminRoute();

    expect(await screen.findByRole('heading', { name: /сначала войдите через brain id/i })).toBeInTheDocument();
    expect(screen.getByText(/админ-панель открывается только после входа/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /войти через brain id/i })).toBeInTheDocument();
  });

  it('shows an explicit access-required state for non-admin Brain ID users', async () => {
    storeUser('USER');
    renderAdminRoute();

    expect(await screen.findByRole('heading', { name: /нужны права администратора/i })).toBeInTheDocument();
    expect(screen.getByText(/данные админ-панели скрыты/i)).toBeInTheDocument();
    expect(screen.getAllByText('Brain User').length).toBeGreaterThan(0);
  });

  it('renders the admin panel for admin users', async () => {
    storeUser('ADMIN');
    renderAdminRoute();

    await waitFor(() => {
      expect(screen.getByText(/админ-панель загружена с токеном/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/нужны права администратора/i)).not.toBeInTheDocument();
  });
});
