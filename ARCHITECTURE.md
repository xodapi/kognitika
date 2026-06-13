# Kognitika Core: Architectural Source of Truth

> Версия: 1.4.0 | Обновлено: 2026-06-13 | Статус: Stabilized MVP

---

## Текущий статус платформы

Платформа эволюционировала: **EDA → Adaptive Intelligence System → Cognitive Engineering Suite**.

Когнитивные расчёты сейчас выполняются в TypeScript/JS через engine hooks и analytics worker. WASM остаётся будущей границей для hot-path алгоритмов, но отсутствующий Rust-пакет не является runtime-зависимостью. Интерфейс динамически подстраивается под состояние пользователя, а real-time функции идут через Express + Socket.io.

---

## Полная карта модулей

| Модуль | Hook | EventBus | Тест | Analytics | Статус |
|---|---|---|---|---|---|
| **Таблицы Шульте** | `useSchulteEngine` | ✅ | ✅ 7/7 | JS / WASM-ready | Production |
| **Скоропечатание** | `useTypingEngine` | ✅ | ✅ 2/2 | JS / WASM-ready | Production |
| **Spatial Concealment** | `useSpatialEngine` | ✅ | ✅ 3/3 | JS / WASM-ready | Production |
| **N-Back Test** | `useNBackEngine` | ✅ | ✅ 4/4 | JS | Production |
| **Тест Струпа** | `useStroopEngine` | ✅ | ✅ 4/4 | JS | Production |
| **Логическая матрица** | `useLogicalEngine` | ✅ | ✅ 3/3 | JS | Production |
| **Числовой анализ** | `useNumericalEngine` | ✅ | ✅ 3/3 | JS | Production |
| **Топологическая память** | `useTopologyEngine` | ✅ | ✅ | JS | Production |
| **Детектор коллизий** | `useCollisionEngine` | ✅ | ✅ | JS | Production |
| **Асинхронный диспетчер** | `useDispatcherEngine` | ✅ | ✅ | JS | Production |
| **Смысловой сканер** | `useLanguageScannerEngine` | ✅ | — | JS | Production |
| **Декриптор** | `useDecryptorEngine` | ✅ | — | JS | Production |
| **Верификация реальности** | `useRealityCheckEngine` | ✅ | — | JS | Production |
| **Редукция шума** | `useNoiseReductionEngine` | ✅ | ✅ | JS | Production |
| **Ситуационный тест** | `useSituationalEngine` | ✅ | — | JS | Beta |
| **Concentration Curve** | — (UI Widget) | ✅ | ✅ | UI | UI Visualization |

> **Concentration Curve** — визуализирующий виджет, отображает данные от EventBus. Собственного Engine-хука не имеет намеренно.

---

## Архитектурные стандарты

### 1. Event-Driven Core (EDA)

Вся бизнес-логика тренажёров изолирована в хуках `use{Module}Engine.ts`. UI-компоненты получают только `state` и экшены, не содержат логики.

```
UI Component ←→ use{Module}Engine ←→ EventBus ←→ Analytics / Subscribers
```

**Ключевые события шины:**

| Событие | Эмиттер | Подписчики |
|---|---|---|
| `CELL_CLICK` | Engine | Analytics, Recorder |
| `TRAINING_COMPLETE` | Engine | DB-writer, Leaderboard |
| `MISTAKE_MADE` | Engine | Analytics |
| `STABILITY_UPDATE` | Analytics | UI (HUD widgets) |
| `DIFFICULTY_SUGGESTION` | Analytics worker | Engine (Adaptive mode) |

### 2. Analytics Boundary

Текущий аналитический слой:
- **JS Worker**: `src/workers/analytics.worker.ts` держит расчёты за worker-границей.
- **JS Metrics**: `src/lib/cognitive-metrics.ts` содержит текущие реализации метрик.
- **WASM-ready contract**: будущий Rust/WASM модуль должен сохранить публичный `ClickEvent` contract и не возвращать отсутствующий `packages/analytics-kernel`.

### 3. Seeded Determinism

Все генераторы (`schulte-generator.ts`, движки N-Back, Spatial) принимают `seed`. Это гарантирует воспроизводимость тестов:

```typescript
const grid1 = generateGrid(5, 'classic', 42);
const grid2 = generateGrid(5, 'classic', 42);
expect(grid1).toEqual(grid2); // всегда true
```

### 4. Хранилища данных

| Система | Зона ответственности |
|---|---|
| **Prisma / PostgreSQL** | Сессии тренировок, XP, история, лидерборд |
| **Express / Socket.io** | API, real-time дуэли, SymbolChat |
| **StorageGateway** | Аудируемый доступ браузера к localStorage |

---

## Дорожная карта

### ✅ Phase 1-4: Завершены
- EDA рефакторинг, EventBus, JS analytics worker с WASM-ready contract
- Adaptive UI (стабильность, кривая концентрации)
- Reaction Consistency, Fatigue Threshold через JS analytics boundary

### ✅ Phase 5: Cognitive Engineering Suite
- Топологическая память (граф-память)
- Детектор коллизий (семантический фильтр)
- Асинхронный диспетчер (оркестрация потоков)

### ✅ Phase 6: Страж Разума (Mind-Guard) — Завершена
- Смысловой сканер — распознавание паттернов манипуляций
- Декриптор — разделение фактов и эмоций
- Верификация реальности — детектор подмены данных AI
- Редукция шума — фильтрация когнитивного шума
- Контент-движок переведён на статическую БД (content-db.ts, 500+ карточек, seed-детерминизм)

### ✅ Phase 7: Social & Community (Завершена)
- ShareCard.tsx (Виральные карточки когнитивного профиля)
- Глобальные и недельные лидерборды
- Socket.io инфраструктура для дуэлей

### 🗓 Phase 9: Leagues & Real-time Duels
- Полноценный UI для когнитивных дуэлей
- Глобальные лиги и сезоны
- WASM hot-path research без переписывания всего стека

---

> [!IMPORTANT]
> Перед каждым коммитом: `pnpm validate`, а для production-risk изменений также `pnpm lint`, `pnpm test`, `pnpm build`.
