import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrainingGallery } from '../components/TrainingGallery';
import React from 'react';

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
    button: ({ children, onClick, className }: any) => <button onClick={onClick} className={className}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('TrainingGallery UI', () => {
  vi.setConfig({ testTimeout: 30000 });
  it('должен отображать базовые модули по умолчанию', () => {
    render(<TrainingGallery onStart={() => {}} />);
    expect(screen.getByText(/Таблицы Шульте/i)).toBeDefined();
    expect(screen.getByText(/Числовой анализ/i)).toBeDefined();
    // Engineering module should NOT be visible
    expect(screen.queryByText(/Архитектура контекста/i)).toBeNull();
  });

  it('должен переключаться на домен Инжиниринг', () => {
    render(<TrainingGallery onStart={() => {}} />);
    
    const engineeringTab = screen.getByRole('button', { name: /Инжиниринг/i });
    fireEvent.click(engineeringTab);

    expect(screen.getByText(/Архитектура контекста/i)).toBeDefined();
    expect(screen.getByText(/Детектор коллизий/i)).toBeDefined();
    // Base module should be gone
    expect(screen.queryByText(/Таблицы Шульте/i)).toBeNull();
  });

  it('должен переключаться на домен Страж Разума', () => {
    render(<TrainingGallery onStart={() => {}} />);
    
    const guardTab = screen.getByRole('button', { name: /Страж Разума/i });
    fireEvent.click(guardTab);

    expect(screen.getByText(/Смысловой Сканер/i)).toBeDefined();
    expect(screen.getByText(/Проверка Реальности/i)).toBeDefined();
  });

  it('должен вызывать onStart при клике на модуль', () => {
    const onStart = vi.fn();
    render(<TrainingGallery onStart={onStart} />);
    
    const schulteModule = screen.getByText(/Таблицы Шульте/i).closest('button');
    if (schulteModule) fireEvent.click(schulteModule);
    
    expect(onStart).toHaveBeenCalledWith('schulte');
  });
});
