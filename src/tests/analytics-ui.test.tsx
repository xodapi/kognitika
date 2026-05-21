import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CognitiveProfile } from '../components/CognitiveProfile';
import { Wiki } from '../components/Wiki';
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
    render(<CognitiveProfile />);
    expect(await screen.findByText(/Когнитивный Профиль/i)).toBeDefined();
    expect(screen.getAllByText(/12/)).toHaveLength(2); // Sessions count and header
  });

  it('должен иметь кнопку экспорта', async () => {
    render(<CognitiveProfile />);
    const exportBtn = await screen.findByRole('button', { name: /Скачать JSON/i });
    expect(exportBtn).toBeDefined();
  });
});

describe('Wiki UI', () => {
  it('должен отображать список статей', () => {
    render(<Wiki />);
    expect(screen.getByText(/Эффект Струпа/i)).toBeDefined();
    expect(screen.getByText(/Таблицы Шульте/i)).toBeDefined();
  });

  it('должен показывать контент при выборе статьи', async () => {
    render(<Wiki />);
    const article = screen.getByText(/Эффект Струпа/i);
    fireEvent.click(article);
    expect(screen.getByText(/селективное внимание/i)).toBeDefined();
  });
});
