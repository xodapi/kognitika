import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OnboardingModal } from '../components/OnboardingModal';
import { completeOnboarding, hasCompletedOnboarding } from '../lib/onboarding-state';
import { ONBOARDING_STATE_KEY } from '../lib/storage-keys';

describe('onboarding flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('explains the staged path, trainer analytics, LLM export, and privacy', () => {
    const onComplete = vi.fn();
    const onStartTraining = vi.fn();

    render(
      <OnboardingModal
        isOpen
        onComplete={onComplete}
        onStartTraining={onStartTraining}
        onOpenProfile={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Зачем нужна Когнитика' })).toBeInTheDocument();
    expect(screen.getByText(/не медицинская диагностика/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
    expect(screen.getByRole('heading', { name: 'Как начать поэтапно' })).toBeInTheDocument();
    expect(screen.getByText(/База/)).toBeInTheDocument();
    expect(screen.getByText(/Страж Разума/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
    expect(screen.getByRole('heading', { name: 'Что покажет каждый тренажёр' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Таблицы Шульте' })).toBeInTheDocument();
    expect(screen.getByText(/Главные показатели: общее время/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
    expect(screen.getByRole('heading', { name: 'Аналитика для LLM' })).toBeInTheDocument();
    expect(screen.getByText(/Средние и лучшие баллы/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
    expect(screen.getByRole('heading', { name: 'Приватность и первый шаг' })).toBeInTheDocument();
    expect(screen.getByText(/не содержит имени, псевдонима, Brain ID/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Начать с Шульте' }));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onStartTraining).toHaveBeenCalledOnce();
  });

  it('can be dismissed with Escape', () => {
    const onComplete = vi.fn();

    render(
      <OnboardingModal
        isOpen
        onComplete={onComplete}
        onStartTraining={vi.fn()}
        onOpenProfile={vi.fn()}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('keeps keyboard focus inside the dialog', () => {
    render(
      <OnboardingModal
        isOpen
        onComplete={vi.fn()}
        onStartTraining={vi.fn()}
        onOpenProfile={vi.fn()}
      />,
    );

    const close = screen.getByRole('button', { name: 'Закрыть онбординг' });
    const next = screen.getByRole('button', { name: 'Далее' });

    close.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(next).toHaveFocus();

    fireEvent.keyDown(window, { key: 'Tab' });
    expect(close).toHaveFocus();
  });

  it('stores only a versioned completion flag', () => {
    expect(hasCompletedOnboarding()).toBe(false);

    completeOnboarding();

    expect(hasCompletedOnboarding()).toBe(true);
    expect(window.localStorage.getItem(ONBOARDING_STATE_KEY)).toBe(
      JSON.stringify({ version: 1, completed: true }),
    );
    expect(window.localStorage.getItem(ONBOARDING_STATE_KEY)).not.toMatch(
      /brainId|userId|email|token|pseudonym/i,
    );
  });
});
