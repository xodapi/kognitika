import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { NumericalAnalysis } from '../components/NumericalAnalysis';

const engineMocks = vi.hoisted(() => ({
  startGame: vi.fn(),
  stopGame: vi.fn(),
  answerQuestion: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    token: null,
  }),
}));

vi.mock('../hooks/useNumericalEngine', () => ({
  useNumericalEngine: () => ({
    state: {
      questions: [],
      currentIndex: 0,
      score: 4,
      errors: 1,
      isActive: false,
      isFinished: true,
      timeLeftMs: 12000,
    },
    startGame: engineMocks.startGame,
    stopGame: engineMocks.stopGame,
    answerQuestion: engineMocks.answerQuestion,
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe('post-game recommendation navigation', () => {
  beforeEach(() => {
    engineMocks.startGame.mockReset();
    engineMocks.stopGame.mockReset();
    engineMocks.answerQuestion.mockReset();
    global.fetch = vi.fn(async () => new Response(JSON.stringify({
        deltaPercentage: 0,
        trend: 'stable',
        percentile: 75,
        verdict: 'Synthetic insight for navigation regression.',
        recommendedGame: 'logical',
        recommendedGameTitle: 'Логические матрицы',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;
  });

  it('opens the recommended module after completed NumericalAnalysis instead of replaying the same test', async () => {
    render(
      <MemoryRouter initialEntries={['/numerical']}>
        <Routes>
          <Route
            path="/numerical"
            element={(
              <>
                <LocationProbe />
                <NumericalAnalysis />
              </>
            )}
          />
          <Route
            path="/logical"
            element={(
              <>
                <LocationProbe />
                <div>Logical route reached</div>
              </>
            )}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/numerical');
    const recommendedButton = await screen.findByRole('button', { name: /Начать рекомендованное/i });

    fireEvent.click(recommendedButton);

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/logical');
    });
    expect(screen.getByText('Logical route reached')).toBeInTheDocument();
    expect(engineMocks.startGame).not.toHaveBeenCalled();
  }, 10_000);
});
