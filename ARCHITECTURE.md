# Kognitika Core: Architectural Source of Truth

> Версия: 1.2.0 | Обновлено: 2026-05-13 | Статус: Phase 5 Complete

---

## Текущий статус платформы

Платформа эволюционировала: **EDA → Adaptive Intelligence System → Neuro-Engineering Suite**.

Все когнитивные расчёты выполняются в Rust-ядре через WASM. Интерфейс динамически подстраивается под состояние пользователя. Phase 5 добавляет когнитивно-инженерные модули для работы с ИИ-системами.

---

## Полная карта модулей

| Модуль | Hook | EventBus | Тест | WASM | Статус |
|---|---|---|---|---|---|
| **Таблицы Шульте** | `useSchulteEngine` | ✅ | ✅ 7/7 | ✅ | Production |
| **Скоропечатание** | `useTypingEngine` | ✅ | ✅ 2/2 | ✅ | Production |
| **Spatial Concealment** | `useSpatialEngine` | ✅ | ✅ 3/3 | ✅ | Production |
| **N-Back Test** | `useNBackEngine` | ✅ | ✅ 4/4 | ❌ | Production |
| **Тест Струпа** | `useStroopEngine` | ✅ | ✅ 4/4 | ❌ | Production |
| **Логическая матрица** | `useLogicalEngine` | ✅ | ✅ 3/3 | ❌ | Production |
| **Числовой анализ** | `useNumericalEngine` | ✅ | ✅ 3/3 | ❌ | Production |
| **Топологическая память** | `useTopologyEngine` | ✅ | ✅ | ❌ | Production |
| **Детектор коллизий** | `useCollisionEngine` | ✅ | ✅ | ❌ | Production |
| **Асинхронный диспетчер** | `useDispatcherEngine` | ✅ | ✅ | ❌ | Production |
| **Смысловой сканер** | `useLanguageScannerEngine` | ✅ | — | ❌ | Production |
| **Декриптор** | `useDecryptorEngine` | ✅ | — | ❌ | Production |
| **Верификация реальности** | `useRealityCheckEngine` | ✅ | — | ❌ | Production |
| **Редукция шума** | `useNoiseReductionEngine` | ✅ | ✅ | ❌ | Production |
| **Ситуационный тест** | `useSituationalEngine` | ✅ | — | ❌ | Beta |
| **Concentration Curve** | — (UI Widget) | ✅ | ✅ | ❌ | UI Visualization |

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
| `DIFFICULTY_SUGGESTION` | WASM Kernel | Engine (Adaptive mode) |

### 2. Hybrid Analytical Bridge (Rust/WASM)

Тяжёлые вычисления в `@stroy/analytics-kernel`:
- **WASM Worker**: расчёты в отдельном потоке (не блокирует Main Thread, 60 FPS)
- **JS Fallbacks**: `src/lib/cognitive-metrics.ts` — аналоги всех Rust-функций
- **В тестах**: WASM мокируется через `vi.mock('../lib/cognitive-metrics')`

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
| **Firebase** | Real-time события (live duels), push-уведомления |

---

## Дорожная карта

### ✅ Phase 1-4: Завершены
- EDA рефакторинг, EventBus, Rust/WASM аналитическое ядро
- Adaptive UI (стабильность, кривая концентрации)
- Reaction Consistency, Fatigue Threshold (WASM)

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

### 🗓 Phase 7: Social & Community
- Когнитивные дуэли (Socket.io, уже в зависимостях)
- Глобальные лиги и сезоны
- Виральные карточки нейро-профиля

---

> [!IMPORTANT]
> Перед каждым коммитом: `npm run validate`. Это запускает Gatekeeper — 12 headless-тестов математического ядра всех Production-модулей.
