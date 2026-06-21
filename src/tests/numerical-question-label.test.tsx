import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NumericalAnalysis } from '../components/NumericalAnalysis';

const mockNumericalEngine = vi.hoisted(() => ({
  state: {
    questions: [] as any[],
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
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ token: null }),
}));

vi.mock('../hooks/useNumericalEngine', () => ({
  useNumericalEngine: () => mockNumericalEngine,
}));

function renderNumerical() {
  render(
    <MemoryRouter initialEntries={['/numerical']}>
      <NumericalAnalysis />
    </MemoryRouter>,
  );
}

describe('NumericalAnalysis question data', () => {
  beforeEach(() => {
    mockNumericalEngine.state = {
      questions: [],
      currentIndex: 0,
      score: 0,
      errors: 0,
      isActive: true,
      isFinished: false,
      timeLeftMs: 29600,
    };
  });

  it('shows a stable question marker and visible share data fallback', () => {
    mockNumericalEngine.state.questions = [
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
    ];

    renderNumerical();

    expect(screen.getByText('Вопрос 1 из 1:')).toBeInTheDocument();
    expect(screen.getByText(/Какова доля \(%\) подразделения "Отдел С"/i)).toBeInTheDocument();

    const fallback = screen.getByTestId('numerical-data-fallback');
    expect(fallback).toHaveTextContent('Данные вопроса');
    expect(fallback).toHaveTextContent('Отдел А');
    expect(fallback).toHaveTextContent('32');
    expect(fallback).toHaveTextContent('Отдел B');
    expect(fallback).toHaveTextContent('47');
    expect(fallback).toHaveTextContent('Отдел С');
    expect(fallback).toHaveTextContent('21');
    expect(fallback).toHaveTextContent('Цель: Отдел С');
  });

  it('shows visible percentage-change data fallback when chart rendering is unavailable', () => {
    mockNumericalEngine.state.questions = [
      {
        title: 'Выручка компании в 2022 году составила 100 млн, а в 2023 - 125 млн. Укажите процентное изменение.',
        type: 'percentage_change',
        data: { oldVal: 100, newVal: 125, labels: ['2022', '2023'] },
        options: [15, 20, 25, 30],
        correctAnswer: 25,
      },
    ];

    renderNumerical();

    const fallback = screen.getByTestId('numerical-data-fallback');
    expect(within(fallback).getByText('2022')).toBeInTheDocument();
    expect(within(fallback).getByText('100 млн')).toBeInTheDocument();
    expect(within(fallback).getByText('2023')).toBeInTheDocument();
    expect(within(fallback).getByText('125 млн')).toBeInTheDocument();
  });
});