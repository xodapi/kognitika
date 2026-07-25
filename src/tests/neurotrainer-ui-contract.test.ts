import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MentalMathTrainer } from '../components/MentalMathTrainer';
import { PostGameInsight } from '../components/PostGameInsight';
import { SchulteTable90 } from '../components/SchulteTable90';
import { AlphabetTableTrainer } from '../components/AlphabetTableTrainer';
import { StroopAlphabetTrainer } from '../components/StroopAlphabetTrainer';
import { deriveTrainingMetrics } from '../lib/training-metrics';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ token: null, refreshUser: vi.fn() }),
}));

vi.mock('../hooks/useSessionRecording', () => ({
  useSessionRecording: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('../hooks/useSchulte90Engine', () => ({
  useSchulte90Engine: () => ({
    state: {
      grid: [
        { id: 1, num: 1, color: 'black' },
        { id: 2, num: 2, color: 'black' },
      ],
      expectedSequence: [
        { id: 0, num: 1, color: 'black' },
        { id: 1, num: 2, color: 'black' },
      ],
      expectedIndex: 1,
      errors: 0,
      timeMs: 1000,
      isActive: true,
      isFinished: false,
      outcome: 'active',
      clickHistory: [],
    },
    startGame: vi.fn(),
    stopGame: vi.fn(),
    resetGame: vi.fn(),
    clickCell: vi.fn(),
  }),
}));

describe('new trainer UI contract', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('uses actual answer totals for result metrics', () => {
    expect(deriveTrainingMetrics({
      timeMs: 45000,
      score: 600,
      errors: 2,
      correctAnswers: 18,
      totalQuestions: 20,
    })).toEqual({
      accuracy: 90,
      reactionMs: 2250,
    });
  });

  it('keeps the mental-math briefing and active state accessible', () => {
    render(React.createElement(MentalMathTrainer));

    const count = screen.getByRole('slider', { name: 'Количество вопросов' });
    expect(count).toHaveAttribute('min', '20');
    expect(count).toHaveAttribute('max', '30');
    fireEvent.change(screen.getByRole('combobox', { name: 'Уровень сложности' }), {
      target: { value: '2' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Начать тест' }));
    expect(screen.getByText(/лучше дать ответ и двигаться дальше/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Инициализировать тест' }));

    expect(screen.getByRole('progressbar', { name: 'Прогресс вычислений' })).toHaveAttribute('aria-valuemax', '20');
    expect(screen.getByRole('spinbutton', { name: 'Ответ на текущий пример' })).toBeEnabled();
    expect(screen.getByText('Legend').parentElement).toHaveClass('sticky');
  });

  it('keeps Schulte cells usable and does not impose a short timeout', () => {
    render(React.createElement(SchulteTable90));

    expect(screen.getByRole('progressbar', { name: 'Прогресс поиска чисел' })).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('button', { name: 'Число 1, найдено' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Число 1, найдено' })).toHaveClass('min-h-11', 'min-w-11');
    expect(screen.getByRole('button', { name: 'Число 2' })).toBeEnabled();
  });

  it('keeps alphabet actions accessible by touch and keyboard', () => {
    render(React.createElement(AlphabetTableTrainer));

    const count = screen.getByRole('slider', { name: 'Количество букв' });
    expect(count).toHaveAttribute('min', '9');
    expect(count).toHaveAttribute('max', '33');
    expect(screen.getByRole('combobox', { name: 'Режим' })).toBeEnabled();
    expect(screen.getByText(/не использует камеру или микрофон/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Начать тренировку' }));

    expect(screen.getByRole('progressbar', { name: 'Прогресс таблицы алфавита' }))
      .toHaveAttribute('aria-valuemax', '33');
    expect(screen.getByRole('button', { name: 'П — Правая рука' })).toHaveClass('min-h-24');
    expect(screen.getByRole('button', { name: 'Л — Левая рука' })).toHaveClass('min-h-24');
    expect(screen.getByRole('button', { name: 'О — Обе руки' })).toHaveClass('min-h-24');

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByRole('progressbar', { name: 'Прогресс таблицы алфавита' }))
      .toHaveAttribute('aria-valuenow', '1');
  });

  it('keeps combined Stroop responses accessible in a stable order', () => {
    render(React.createElement(StroopAlphabetTrainer));

    expect(screen.getByText(/сначала выберите фактический цвет текста/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Начать тренировку' }));

    expect(screen.getByRole('progressbar', { name: 'Прогресс комбинированного Струпа' }))
      .toHaveAttribute('aria-valuemax', '18');
    expect(screen.getByRole('button', { name: /КРАСНЫЙ/i })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /КРАСНЫЙ/i }));
    expect(screen.getByRole('button', { name: /П — Правая рука/ })).toBeEnabled();
    expect(screen.getByText(/выполните команду/i)).toBeInTheDocument();
  });

  it('keeps navigation available while result analytics load', () => {
    render(React.createElement(PostGameInsight, {
      gameType: 'MENTAL_MATH',
      score: 600,
      timeMs: 45000,
      errors: 2,
      correctAnswers: 18,
      totalQuestions: 20,
      onPlayAgain: vi.fn(),
      onBackToMenu: vi.fn(),
    }));

    expect(screen.getByRole('status')).toHaveTextContent('Генерация когнитивных выводов');
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'В меню' })).toBeEnabled();
  });
});
