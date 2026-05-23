import { describe, it, expect } from 'vitest';

// Алгоритм вычисления слабой зоны (копия логики из dashboard.ts для изолированного тестирования)
function getWeakestGameType(sessions: any[]) {
  const domains = {
    attention: { games: ['SCHULTE', 'STROOP', 'SPEED_TYPING', 'N_BACK', 'NOISE_REDUCTION'], sum: 0, count: 0, defaultGame: 'SCHULTE' },
    memory: { games: ['N_BACK', 'SPATIAL_CONCEALMENT', 'TOPOLOGY_MEMORY'], sum: 0, count: 0, defaultGame: 'N_BACK' },
    logic: { games: ['NUMERICAL_ANALYSIS', 'LOGICAL_SEQUENCE', 'LANGUAGE_SCANNER', 'DECRYPTOR', 'REALITY_CHECK', 'OBJECTIVE_FILTER', 'PROFILING_RICE'], sum: 0, count: 0, defaultGame: 'OBJECTIVE_FILTER' },
    speed: { games: ['SPEED_TYPING', 'SCHULTE', 'COLLISION_DETECTOR'], sum: 0, count: 0, defaultGame: 'SPEED_TYPING' },
    resilience: { games: ['ASYNC_DISPATCHER', 'COLLISION_DETECTOR', 'NOISE_REDUCTION'], sum: 0, count: 0, defaultGame: 'NOISE_REDUCTION' }
  };

  sessions.forEach(s => {
    for (const [_, data] of Object.entries(domains)) {
      if (data.games.includes(s.gameType)) {
        data.sum += s.score;
        data.count += 1;
      }
    }
  });

  let weakestDomain = 'memory';
  let minAvg = Infinity;

  if (sessions.length === 0) {
    weakestDomain = 'memory';
  } else {
    for (const [domain, data] of Object.entries(domains)) {
      const avg = data.count > 0 ? data.sum / data.count : Infinity;
      if (avg < minAvg) {
        minAvg = avg;
        weakestDomain = domain;
      }
    }
  }

  return domains[weakestDomain as keyof typeof domains].defaultGame;
}

describe('Daily Tasks - Weakest Zone Algorithm', () => {
  it('должен определить N_BACK (Память) как слабую зону, если оценки по памяти самые низкие', () => {
    const mockSessions = [
      { gameType: 'SCHULTE', score: 800 },
      { gameType: 'STROOP', score: 900 },
      { gameType: 'N_BACK', score: 100 }, // Низкий скор памяти
      { gameType: 'NUMERICAL_ANALYSIS', score: 750 },
      { gameType: 'COLLISION_DETECTOR', score: 850 }
    ];

    const result = getWeakestGameType(mockSessions);
    expect(result).toBe('N_BACK');
  });

  it('должен определить SCHULTE (Внимание) как слабую зону, если оценки внимания минимальны', () => {
    const mockSessions = [
      { gameType: 'STROOP', score: 50 }, // Низкий скор внимания
      { gameType: 'SPATIAL_CONCEALMENT', score: 950 },
      { gameType: 'COLLISION_DETECTOR', score: 950 },
      { gameType: 'ASYNC_DISPATCHER', score: 950 },
      { gameType: 'NUMERICAL_ANALYSIS', score: 950 }
    ];

    const result = getWeakestGameType(mockSessions);
    expect(result).toBe('SCHULTE');
  });

  it('должен вернуть дефолтную игру (N_BACK), если список сессий пуст', () => {
    const result = getWeakestGameType([]);
    expect(result).toBe('N_BACK');
  });
});
