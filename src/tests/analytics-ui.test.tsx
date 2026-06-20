import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CognitiveProfile } from '../components/CognitiveProfile';
import { Wiki } from '../components/Wiki';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import React from 'react';


// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
    button: ({ children, onClick, className }: any) => <button onClick={onClick} className={className}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock recharts
vi.mock('recharts', () => ({
  Radar: () => <div />,
  RadarChart: ({ children }: any) => <div>{children}</div>,
  PolarGrid: () => <div />,
  PolarAngleAxis: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
}));

describe('CognitiveProfile UI', () => {
  vi.setConfig({ testTimeout: 30000 });
  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          profile: { attention: 80, memory: 70, logic: 90, speed: 60, resilience: 75 },
          trend: 5,
          sessionsCount: 12
        }),
      })
    ) as any;
  });

  it('должен отображать заголовок и данные профиля', async () => {
    render(
      <MemoryRouter>
        <CognitiveProfile />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Когнитивный Профиль/i)).toBeDefined();
    expect(screen.getAllByText(/12/)).toHaveLength(2); // Sessions count and header
  });

  it('должен иметь кнопку экспорта', async () => {
    render(
      <MemoryRouter>
        <CognitiveProfile />
      </MemoryRouter>
    );
    const exportBtn = await screen.findByRole('button', { name: /Скачать JSON/i });
    expect(exportBtn).toBeDefined();
  });

  it('должен показывать readiness count при нуле тренировок', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          profile: null,
          trend: 0,
          sessionsCount: 0,
          requiredSessions: 5,
          remainingSessions: 5,
        }),
      })
    ) as any;

    render(
      <MemoryRouter>
        <CognitiveProfile />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Пройдено 0 из 5 тренировок/i)).toBeDefined();
    expect(screen.getByText(/Осталось пройти 5 тренировок/i)).toBeDefined();
  });

  it('должен показывать readiness count при частичном прогрессе', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          profile: null,
          trend: 0,
          sessionsCount: 3,
          requiredSessions: 5,
          remainingSessions: 2,
        }),
      })
    ) as any;

    render(
      <MemoryRouter>
        <CognitiveProfile />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Пройдено 3 из 5 тренировок/i)).toBeDefined();
    expect(screen.getByText(/Осталось пройти 2 тренировки/i)).toBeDefined();
  });

  it('должен открывать рекомендованные модули профиля внутренними переходами', async () => {
    function LocationProbe() {
      const location = useLocation();
      return <div data-testid="location">{location.pathname}</div>;
    }

    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          profile: { attention: 80, memory: 70, logic: 90, speed: 60, resilience: 10 },
          trend: 5,
          sessionsCount: 12,
          requiredSessions: 5,
          remainingSessions: 0,
        }),
      })
    ) as any;

    render(
      <MemoryRouter>
        <CognitiveProfile />
        <LocationProbe />
      </MemoryRouter>
    );

    const noiseButton = await screen.findByRole('button', { name: /Редукция шума/i });
    expect(screen.getByRole('button', { name: /Тишина/i })).toBeDefined();

    fireEvent.click(noiseButton);
    expect(screen.getByTestId('location')).toHaveTextContent('/noise');
  });
});

describe('Wiki UI', () => {
  function renderWiki(initialPath = '/wiki') {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/wiki" element={<Wiki />} />
          <Route path="/wiki/:articleId" element={<Wiki />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('должен отображать список статей', () => {
    renderWiki();
    expect(screen.getByText(/Эффект Струпа/i)).toBeDefined();
    expect(screen.getByText(/Таблицы Шульте/i)).toBeDefined();
  });

  it('должен показывать контент при выборе статьи', async () => {
    renderWiki();
    const article = screen.getByText(/Эффект Струпа/i);
    fireEvent.click(article);
    expect(screen.getByText(/Что тренирует/i)).toBeDefined();
    expect(screen.getByText(/Селективное внимание/i)).toBeDefined();
    expect(screen.getByText(/Способность остановить автоматическую реакцию/i)).toBeDefined();
  });
});
