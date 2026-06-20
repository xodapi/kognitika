import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NumericalAnalysis } from '../components/NumericalAnalysis';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ token: null }),
}));

vi.mock('../hooks/useNumericalEngine', () => ({
  useNumericalEngine: () => ({
    state: {
      questions: [
        {
          title: 'Какова доля (%) подразделения "Отдел С" в общем бюджете предприятия?',
          type: 'share',
          data: {
            parts: [
              { name: 'Отдел А', value: 32 },
              { name: 'Отдел B', value: 47 },
              { name: 'Отдел С', value: 21 },
            ],
            target: 'Отдел С',
          },
          options: [17, 22, 20, 21],
          correctAnswer: 21,
        },
      ],
      currentIndex: 0,
      score: 0,
      errors: 0,
      isActive: true,
      isFinished: false,
      timeLeftMs: 29600,
    },
    startGame: vi.fn(),
    stopGame: vi.fn(),
    answerQuestion: vi.fn(),
  }),
}));

describe('NumericalAnalysis question label', () => {
  it('shows a stable question marker for copied manual QA text', () => {
    render(
      <MemoryRouter initialEntries={['/numerical']}>
        <NumericalAnalysis />
      </MemoryRouter>,
    );

    expect(screen.getByText('Вопрос 1 из 1:')).toBeInTheDocument();
    expect(screen.getByText(/Какова доля \(%\) подразделения "Отдел С"/i)).toBeInTheDocument();
    expect(screen.getByText(/Данные: Отдел А - 32; Отдел B - 47; Отдел С - 21\. Цель: Отдел С\./i)).toBeInTheDocument();
  });
});
