import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaderboardView } from './LeaderboardView';

// Mock the global fetch
const mockUsers = [
  { id: '1', name: 'Атлет 1', experience: 1000, level: 5, rating: 100, _count: { sessions: 10 } },
  { id: '2', name: 'Атлет 2', experience: 800, level: 4, rating: 90, _count: { sessions: 8 } },
  { id: '3', name: 'Атлет 3', experience: 600, level: 3, rating: 80, _count: { sessions: 6 } },
  { id: '4', name: 'Атлет 4', experience: 400, level: 2, rating: 70, _count: { sessions: 4 } },
];

global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve(mockUsers),
  })
) as any;

describe('LeaderboardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render top 3 podium', async () => {
    render(<LeaderboardView />);
    
    await waitFor(() => {
      expect(screen.getByText('Атлет 1')).toBeInTheDocument();
      expect(screen.getByText('Атлет 2')).toBeInTheDocument();
      expect(screen.getByText('Атлет 3')).toBeInTheDocument();
    });

    expect(screen.getByText('Чемпион')).toBeInTheDocument();
    expect(screen.getByText('Серебро')).toBeInTheDocument();
    expect(screen.getByText('Бронза')).toBeInTheDocument();
  });

  it('should render other users in table', async () => {
    render(<LeaderboardView />);
    
    await waitFor(() => {
      expect(screen.getByText('Атлет 4')).toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row');
    // Header + users beyond top 3 (1 in this case)
    expect(rows.length).toBe(2); 
  });

  it('should show empty message when no users found', async () => {
    (global.fetch as any).mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve([]),
      })
    );

    render(<LeaderboardView />);
    
    await waitFor(() => {
      expect(screen.getByText('Атлеты не найдены')).toBeInTheDocument();
    });
  });
});
