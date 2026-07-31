# Архитектура

## Event-Driven Core (EDA)

Вся бизнес-логика каждого тренажёра изолирована в хуке `use{Module}Engine.ts`. UI-компоненты получают только `state` и экшены, не содержат логики.

```
UI Component ←→ use{Module}Engine ←→ EventBus ←→ Analytics / Subscribers
```

### Ключевые события шины

| Событие | Эмиттер | Подписчики |
|---|---|---|
| `CELL_CLICK` | Engine | Analytics, Recorder |
| `TRAINING_COMPLETE` | Engine | DB-writer, Leaderboard |
| `MISTAKE_MADE` | Engine | Analytics |
| `STABILITY_UPDATE` | Analytics | UI (HUD widgets) |
| `DIFFICULTY_SUGGESTION` | Analytics worker | Engine (Adaptive mode) |

## Seeded Determinism

Все генераторы (`schulte-generator.ts`, движки N-Back, Spatial) принимают `seed`. Это гарантирует воспроизводимость тестов:

```typescript
const grid1 = generateGrid(5, 'classic', 42);
const grid2 = generateGrid(5, 'classic', 42);
expect(grid1).toEqual(grid2); // всегда true
```

## Analytics Boundary

Текущий аналитический слой:
- **JS Worker**: `src/workers/analytics.worker.ts` держит расчёты за worker-границей
- **JS Metrics**: `src/lib/cognitive-metrics.ts` — текущие реализации метрик
- **WASM-ready contract**: будущий Rust/WASM модуль должен сохранить публичный `ClickEvent` контракт

## Полно-стек сервер

`server.ts` отдаёт и API, и статику Vite-билда. Канонический порт: **3006**.

## EDA поток (Mermaid)

```mermaid
graph TD
    UI[UI Component] --> Engine[use{Module}Engine]
    Engine --> Bus[EventBus]
    Bus --> Analytics[Analytics Worker]
    Bus --> Persistence[DB Writer]
    Bus --> UI_Widgets[HUD / ConcentrationCurve]
    Analytics -->|DIFFICULTY_SUGGESTION| Engine
```

## Хранилища данных

| Система | Зона ответственности |
|---|---|
| **Prisma / PostgreSQL** | Сессии тренировок, XP, история, лидерборд |
| **Express / Socket.io** | API, real-time дуэли, SymbolChat |
| **StorageGateway** | Аудируемый доступ браузера к localStorage |

## Ссылки на код

- EventBus: `src/core/events/event-bus.ts`
- Engine pattern: `src/hooks/useSchulteEngine.ts` (пример)
- Analytics worker: `src/workers/analytics.worker.ts`
- Cognitive metrics: `src/lib/cognitive-metrics.ts`
- Server entry: `server.ts`
