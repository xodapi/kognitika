# Mobile Layout Testing - Quick Start

## Запуск тестов

```bash
# Установить браузеры (один раз)
pnpm playwright install

# Запустить тест Schulte mobile layout
pnpm playwright test tests/mobile-schulte.spec.ts

# Запустить в headed режиме (видимый браузер)
pnpm playwright test tests/mobile-schulte.spec.ts --headed

# Сгенерировать HTML отчёт
pnpm playwright test tests/mobile-schulte.spec.ts --reporter=html
```

## Что проверяет тест

| Проверка | Критерий |
|----------|----------|
| **Font size** | Все текстовые элементы >= 14px computed font-size |
| **Key elements visible** | Start button, Timer HUD, Errors counter — bottom <= viewport height |
| **Grid renders** | Grid отображается после старта игры |
| **Two viewports** | iPhone SE (375x667) и iPhone 12/13 (390x844) |

## Добавленные data-testid

В `src/components/SchulteGrid.tsx` добавлены:

| Элемент | data-testid |
|---------|-------------|
| Кнопка "Начать тест" | `start-button` |
| Таймер HUD (левая панель) | `hud-timer` |
| Таймер дисплей | `timer-display` |
| Счётчик ошибок | `errors-count` |
| Кнопка "Завершить досрочно" | `stop-button` |
| Секция результатов | `results-section` |
| Статистика результатов | `result-stats` |

## Для остальных тренажёров

Добавьте аналогичные `data-testid`:

```tsx
// В компоненте тренажёра
<button data-testid="start-button">Начать</button>
<div data-testid="hud-timer">...</div>
<button data-testid="stop-button">Стоп</button>
<div data-testid="result-stats">...</div>
```

Затем создайте тест по аналогии с `tests/mobile-schulte.spec.ts`.
