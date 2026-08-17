# Mobile Layout Testing Guide

## Архитектура мобильного тестирования

Мобильное тестирование построено на трёх уровнях:

| Файл | Что делает |
|------|------------|
| `tests/mobile-contract.ts` | Общий измерительный харнесс (touch targets, reachability, overflow, glance) |
| `tests/mobile-contract.spec.ts` | Эталонный контракт Schulte + самопроверка харнесса |
| `tests/mobile-trainer-rollout.spec.ts` | Rollout-контракт для 13 тренажёров (Issue #247) |
| `tests/schulte-mobile.spec.ts` | Расширенный layout-тест для Schulte |
| `tests/schulte-mobile-play-isolation.spec.ts` | Изоляция игровой зоны Schulte |
| `tests/schulte-mobile-results-triage.spec.ts` | Экран результатов Schulte |

## Запуск тестов

```bash
# Установить браузеры (один раз)
pnpm playwright install

# Полный мобильный rollout (все 13 тренажёров, 3 вьюпорта)
pnpm playwright test tests/mobile-trainer-rollout.spec.ts

# Эталонный контракт Schulte + самопроверка харнесса
pnpm playwright test tests/mobile-contract.spec.ts

# Расширенный layout-тест Schulte
pnpm playwright test tests/schulte-mobile.spec.ts

# Запуск в headed-режиме
pnpm playwright test tests/mobile-trainer-rollout.spec.ts --headed

# HTML-отчёт
pnpm playwright test tests/mobile-trainer-rollout.spec.ts --reporter=html
```

## Вьюпорты

| Имя | Ширина | Высота |
|-----|--------|--------|
| compact phone | 320 | 700 |
| iPhone SE | 375 | 667 |
| standard phone | 390 | 844 |

## Статус rollout (Issue #247) — Завершено

Все 13 тренажёров прошли rollout. Каждый тренажёр проверяется на трёх вьюпортах по шести клаузам контракта.

| Тренажёр | Маршрут | start-button | stop-button | playfield |
|----------|---------|--------------|-------------|-----------|
| Alphabet table | `/alphabet-table` | ✅ | ✅ | ✅ |
| Cognitive trash filter | `/filter` | — автостарт | — нет прерывания | ✅ |
| Logical matrix | `/logical` | ✅ | — нет прерывания | ✅ |
| Mental math | `/mental-math` | ✅ | ✅ | ✅ |
| N-back | `/nback` | ✅ | — нет прерывания | ✅ |
| Numerical analysis | `/numerical` | ✅ | — нет прерывания | ✅ |
| Schulte | `/schulte` | ✅ | ✅ | ✅ |
| Schulte 90 | `/schulte-90` | ✅ | ✅ | ✅ |
| Situational judgment | `/situational` | ✅ | — нет прерывания | ✅ |
| Spatial concealment | `/spatial` | ✅ | — нет прерывания | ✅ |
| Speed typing | `/typing` | ✅ | — нет прерывания | ✅ |
| Stroop alphabet | `/stroop?mode=combined` | ✅ | ✅ | ✅ |
| Stroop | `/stroop` | ✅ | — нет прерывания | ✅ |

## Клаузы контракта

| Клауза | Что проверяет | Когда неприменима |
|--------|---------------|-------------------|
| `briefing` | Кнопка `start-button` видима до старта | Тренажёр стартует автоматически |
| `touchFloor` | Все интерактивные элементы playfield ≥ 44px | — |
| `innerScroll` | Playfield не имеет горизонтального overflow | Явное исключение (Schulte 90 90-клеточная сетка) |
| `activeCharts` | Графики не монтируются ниже fold во время игры | — |
| `abort` | `stop-button` достижим и ≥ 44px | Тренажёр не имеет досрочного прерывания |
| `fontAndOverflow` | Видимый текст ≥ 14px, `document.scrollWidth <= innerWidth` | — |

## Обязательные data-testid

Каждый тренажёр должен иметь следующие атрибуты:

| Атрибут | Элемент | Требуется |
|---------|---------|-----------|
| `data-testid="start-button"` | Кнопка начала сессии | Всегда (кроме autoStart) |
| `data-testid="stop-button"` | Кнопка досрочного прерывания | Если тренажёр поддерживает abort |
| `data-testid="playfield"` | Контейнер интерактивной зоны | Всегда |

## Добавление нового тренажёра

1. Добавьте `data-testid="start-button"`, `data-testid="playfield"` и при необходимости `data-testid="stop-button"` в компонент.
2. Добавьте запись в `TRAINERS` в `tests/mobile-trainer-rollout.spec.ts`:

```ts
{
  name: 'My Trainer',
  route: '/my-trainer',
  clauses: ALL_APPLY,          // или NO_ABORT / кастомные исключения
  playfield: '[data-testid="playfield"]',
}
```

3. Обновите `expect(TRAINERS).toHaveLength(N)` на новое количество.
4. Запустите `pnpm playwright test tests/mobile-trainer-rollout.spec.ts`.
5. Обновите эту таблицу rollout и `docs/mobile-rollout-audit-YYYY-MM-DD.md`.
