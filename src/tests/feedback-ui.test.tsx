import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { HTMLAttributes, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackModal } from '../components/FeedbackModal';
import { IdeasWall } from '../components/IdeasWall';

const authState = vi.hoisted(() => ({
  user: {
    id: 'synthetic-user',
    pseudonym: 'Synthetic Brain',
  },
  token: 'synthetic-token',
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe('feedback and ideas network failure UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = {
      id: 'synthetic-user',
      pseudonym: 'Synthetic Brain',
    };
    authState.token = 'synthetic-token';
  });

  it('shows a friendly feedback error instead of raw Failed to fetch', async () => {
    global.fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;

    render(<FeedbackModal isOpen onClose={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/Опишите вашу идею или проблему/i), {
      target: { value: 'Synthetic feedback without personal data.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Отправить предложение/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Не удалось связаться с сервером');
    expect(alert.textContent).not.toContain('Failed to fetch');
  });

  it('shows a friendly idea submit error instead of failing silently', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockRejectedValueOnce(new TypeError('Failed to fetch')) as typeof fetch;

    render(<IdeasWall token="synthetic-token" />);

    await screen.findByText(/Идей пока нет/i);
    fireEvent.click(screen.getByRole('button', { name: /Предложить/i }));
    fireEvent.change(screen.getByPlaceholderText(/Например: Добавить звуки природы/i), {
      target: { value: 'Synthetic idea title' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Опишите, как это поможет пользователям/i), {
      target: { value: 'Synthetic idea description without any user data.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Опубликовать/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Не удалось связаться с сервером');
    expect(alert.textContent).not.toContain('Failed to fetch');
  });
});
