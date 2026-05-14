import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LanguageScanner } from '../components/LanguageScanner';
import { RealityCheck } from '../components/RealityCheck';
import React from 'react';

// Mock engines to avoid complex logic
vi.mock('../hooks/useLanguageScannerEngine', () => ({
  useLanguageScannerEngine: () => ({
    state: { phase: 'memorize', rules: [], memorizeTimeLeft: 5 },
    startGame: vi.fn(),
    flagCard: vi.fn(),
    skipCard: vi.fn()
  })
}));

vi.mock('../hooks/useRealityCheckEngine', () => ({
  useRealityCheckEngine: () => ({
    currentPair: { fact: 'Test', statement: 'Test' },
    progress: 0,
    isActive: true,
    startSession: vi.fn(),
    submitAnswer: vi.fn(),
    score: 0,
    pairsRemaining: 10
  })
}));

describe('Mind Guard UI Smoke Tests', () => {
  it('LanguageScanner должен отображать фазу запоминания при старте', () => {
    render(<LanguageScanner />);
    expect(screen.getByText(/База Знаний/i)).toBeDefined();
  });

  it('RealityCheck должен отображать инициализацию', () => {
    render(<RealityCheck onFinish={() => {}} />);
    expect(screen.getByText(/Проверка Реальности/i)).toBeDefined();
  });
});
