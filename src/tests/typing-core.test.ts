import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTypingEngine } from '../hooks/useTypingEngine';
import { eventBus } from '../lib/event-bus';
import { formatTypingAccuracy, formatTypingCpm } from '../components/SpeedTyping';

// Mock analytics to avoid WASM issues in tests
vi.mock('../lib/cognitive-metrics', () => ({
  getDifficultySuggestion: vi.fn().mockResolvedValue({
    nextGridSize: 5,
    noiseLevel: 0,
    rotationEnabled: false,
    message: 'Test'
  }),
  getTypingStats: vi.fn().mockResolvedValue({
    cpm: 300,
    wpm: 60,
    accuracy: 100,
    errors: 0
  }),
  analyzeSession: vi.fn()
}));

describe('Typing Core Engine (Event-Driven)', () => {
  const TEST_TEXTS = ["Hello World"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('должен корректно фиксировать начало и завершение печати', async () => {
    const trainingCompleteSpy = vi.fn();
    eventBus.on('TRAINING_COMPLETE', trainingCompleteSpy);

    const { result } = renderHook(() => useTypingEngine(TEST_TEXTS));
    
    act(() => {
      result.current.startTest();
    });

    expect(result.current.state.text).toBe("Hello World");
    expect(result.current.state.isActive).toBe(true);

    // Имитируем печать
    act(() => {
      result.current.handleInput("Hello");
    });
    
    // No need to advance timers if we don't use them

    expect(result.current.state.userInput).toBe("Hello");
    expect(result.current.state.isFinished).toBe(false);

    // Завершаем
    await act(async () => {
      await result.current.handleInput("Hello World");
    });

    expect(trainingCompleteSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'TYPING'
    }));
    expect(result.current.state.isFinished).toBe(true);
  });

  it('должен считать ошибки', async () => {
    const { result } = renderHook(() => useTypingEngine(TEST_TEXTS));
    
    act(() => {
      result.current.startTest();
    });

    // Опечатка
    await act(async () => {
      await result.current.handleInput("Hella"); // Ошибка в 'o'
    });

    expect(result.current.state.errors).toBe(1);
  });

  it('должен ротировать банк текстов между попытками', () => {
    const { result } = renderHook(() => useTypingEngine(['Первый текст', 'Второй текст', 'Третий текст']));

    act(() => result.current.startTest());
    expect(result.current.state.text).toBe('Первый текст');

    act(() => result.current.startTest());
    expect(result.current.state.text).toBe('Второй текст');

    act(() => result.current.startTest());
    expect(result.current.state.text).toBe('Третий текст');

    act(() => result.current.startTest());
    expect(result.current.state.text).toBe('Первый текст');
  });

  it('должен форматировать пользовательские метрики без длинных дробей', () => {
    expect(formatTypingCpm(126.6679297371911)).toBe('127');
    expect(formatTypingAccuracy(83.33333333333334)).toBe('83,3');
  });
});
