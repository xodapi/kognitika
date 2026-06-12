import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthModal } from '../components/AuthModal';

const loginMock = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    login: loginMock,
  }),
}));

describe('AuthModal Brain ID public contract', () => {
  beforeEach(() => {
    loginMock.mockReset();
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url) === '/api/auth/brain') {
        return {
          ok: true,
          json: async () => ({
            token: 'synthetic-token',
            brainId: 'BR-SYNTHETIC-001',
            pseudonym: 'Synthetic-Brain-0001',
            user: {
              id: 'user-1',
              name: 'Synthetic-Brain-0001',
              brainId: 'BR-SYNTHETIC-001',
              pseudonym: 'Synthetic-Brain-0001',
              email: null,
            },
          }),
        } as Response;
      }

      if (String(url) === '/api/auth/restore') {
        return {
          ok: true,
          json: async () => ({
            token: 'restored-token',
            brainId: 'BR-SYNTHETIC-001',
            pseudonym: 'Synthetic-Brain-0001',
            user: {
              id: 'user-1',
              name: 'Synthetic-Brain-0001',
              brainId: 'BR-SYNTHETIC-001',
              pseudonym: 'Synthetic-Brain-0001',
              email: null,
            },
          }),
        } as Response;
      }

      throw new Error(`Unexpected request: ${url}`);
    }) as typeof fetch;
  });

  it('does not render public email or password controls', () => {
    const { container } = render(<AuthModal isOpen onClose={() => {}} />);

    expect(container.querySelector('input[type="email"]')).toBeNull();
    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(screen.queryByRole('button', { name: /Войти в профиль/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Создать аккаунт/i })).toBeNull();
  });

  it('creates a Brain ID session through /api/auth/brain', async () => {
    render(<AuthModal isOpen onClose={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Начать новую сессию/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/brain', { method: 'POST' });
      expect(loginMock).toHaveBeenCalledWith(
        'synthetic-token',
        expect.objectContaining({ brainId: 'BR-SYNTHETIC-001', email: null }),
      );
    });
  });

  it('restores a Brain ID session through /api/auth/restore', async () => {
    const onClose = vi.fn();
    render(<AuthModal isOpen onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText(/Введите ваш Brain ID/i), {
      target: { value: 'BR-SYNTHETIC-001' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Возобновить прогресс/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/restore', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ brainId: 'BR-SYNTHETIC-001' }),
      }));
      expect(loginMock).toHaveBeenCalledWith(
        'restored-token',
        expect.objectContaining({ brainId: 'BR-SYNTHETIC-001', email: null }),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});
