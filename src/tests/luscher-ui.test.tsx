import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LuscherTest } from '../components/LuscherTest';
import React from 'react';

vi.setConfig({ testTimeout: 30000 });

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
    button: ({ children, onClick, className, style, title }: any) => (
      <button onClick={onClick} className={className} style={style} title={title}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('LuscherTest UI', () => {
  it('должен отображать заголовок цветового теста Люшера', () => {
    const onFinish = vi.fn();
    render(<LuscherTest onFinish={onFinish} />);
    expect(screen.getByText(/Цветовой тест Люшера/i)).toBeDefined();
  });

  it('должен проходить пошаговый выбор всех 8 цветов и вызывать onFinish', () => {
    const onFinish = vi.fn();
    render(<LuscherTest onFinish={onFinish} />);

    // Должно быть 8 кнопок в начале
    let buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(8);

    // Кликаем по кнопкам одну за другой
    // Каждый раз кликаем по первой доступной кнопке, так как выбранная кнопка удаляется
    for (let i = 0; i < 8; i++) {
      buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);
    }

    // После 8 кликов тест завершается, должен вызваться коллбэк onFinish
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0].length).toBe(8);
  });
});
