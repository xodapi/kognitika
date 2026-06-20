import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Dashboard } from '../components/Dashboard';
import React from 'react';

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
    button: ({ children, onClick, className }: any) => <button onClick={onClick} className={className}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock useAuth
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Test User', level: 5, experience: 1200, rating: 1500, brainId: '00000000-0000-4000-8000-000000000488' },
    token: 'fake-token',
    refreshUser: vi.fn()
  })
}));

// Mock child components to isolate Dashboard
vi.mock('../components/TrainingGallery', () => ({
  TrainingGallery: () => <div data-testid="training-gallery">Gallery</div>
}));
vi.mock('../components/AdminPanel', () => ({
  AdminPanel: () => <div data-testid="admin-panel">Admin</div>
}));
vi.mock('../components/DuelsView', () => ({
  DuelsView: () => <div data-testid="duels-view">Duels</div>
}));
vi.mock('../components/CognitiveProfile', () => ({
  CognitiveProfile: () => <div data-testid="cognitive-profile">Profile Content</div>
}));

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve([]),
  })
) as any;

describe('Dashboard UI', () => {
  vi.setConfig({ testTimeout: 30000 });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('должен отображать вкладку тренировок по умолчанию', () => {
    render(<Dashboard onStartGame={() => {}} />);
    expect(screen.getByText(/Привет, Test User/i)).toBeDefined();
    expect(screen.getByTestId('training-gallery')).toBeDefined();
  });

  it('должен переключаться на вкладку профиля', async () => {
    render(<Dashboard onStartGame={() => {}} />);
    
    const profileTab = screen.getByRole('button', { name: /Профиль/i });
    fireEvent.click(profileTab);

    expect(await screen.findByTestId('cognitive-profile')).toBeDefined();
    expect(screen.queryByTestId('training-gallery')).toBeNull();
  });

  it('должен переключаться на вкладку дуэлей', async () => {
    render(<Dashboard onStartGame={() => {}} />);
    
    const duelsTab = screen.getByRole('button', { name: /Дуэли/i });
    fireEvent.click(duelsTab);

    expect(await screen.findByTestId('duels-view')).toBeDefined();
  });

  it('должен отображать бейджи рейтинга и Brain ID', () => {
    render(<Dashboard onStartGame={() => {}} />);
    expect(screen.getByText(/Профиль защищен/i)).toBeDefined();
    expect(screen.getByText(/0488/i)).toBeDefined();
    expect(screen.queryByText(/00000000-0000-4000-8000-000000000488/i)).toBeNull();
    expect(screen.getByText(/Test User/i)).toBeDefined();
  });
});
