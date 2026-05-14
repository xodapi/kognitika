# План тестирования — Когнитика

> Статус: актуален для v1.2.0+ | Обновлён: 2026-05-13

## Текущее состояние инфраструктуры

Инфраструктура тестирования **полностью развёрнута** и работает.

| Инструмент | Назначение | Статус |
|---|---|---|
| **Vitest** | Unit + Integration тесты (headless) | ✅ Установлен |
| **@testing-library/react** | Component тесты | ✅ Установлен |
| **Playwright** | E2E тесты | ✅ Установлен |

---

## Уровень 1 — Headless Unit/Integration тесты (Vitest)

**Конфиг:** `vitest.config.ts` — включает `src/**/*.test.{ts,tsx}`

### Карта тестовых файлов

| Файл | Модуль | Тестов | В `validate`? |
|---|---|---|---|
| `src/tests/schulte-core.test.ts` | Таблицы Шульте | 7 | ✅ |
| `src/tests/typing-core.test.ts` | Скоропечатание | 2 | ✅ |
| `src/tests/spatial-core.test.ts` | Spatial Concealment | 3 | ✅ |
| `src/tests/nback-core.test.ts` | N-Back Test | 4 | ✅ |
| `src/tests/stroop-core.test.ts` | Тест Струпа | 4 | ✅ |
| `src/tests/logical-core.test.ts` | Логическая матрица | 3 | ✅ |
| `src/tests/numerical-core.test.ts` | Числовой анализ | 3 | ✅ |
| `src/tests/topology-core.test.ts` | Топологическая память | — | ✅ |
| `src/tests/collision-core.test.ts` | Детектор коллизий | — | ✅ |
| `src/tests/dispatcher-core.test.ts` | Асинхронный диспетчер | — | ✅ |
| `src/tests/logic-verification.test.ts` | Верификация логики | — | ✅ |
| `src/tests/reproducibility.test.ts` | Детерминизм seed | — | ✅ |
| `src/components/ConcentrationCurve.test.tsx` | Кривая концентрации | — | ❌ (UI only) |
| `src/components/LeaderboardView.test.tsx` | Лидерборд | — | ❌ (UI only) |

### Разница между `npm run test` и `npm run validate`

```
npm run test      → запускает ВСЕ файлы через vitest.config.ts
npm run validate  → запускает только 12 ключевых engine-тестов (Gatekeeper)
```

`validate` — это «Вратарь»: быстрая проверка математического ядра перед коммитом.
`test` — полное покрытие, включая UI-компоненты.

**Правило:** всегда запускать `npm run validate` перед `git commit`.

---

## Уровень 2 — Component тесты (Vitest + React Testing Library)

Файлы: `src/components/*.test.tsx`

Что тестируем:
- `ConcentrationCurve.test.tsx` — рендеринг виджета, корректность данных
- `LeaderboardView.test.tsx` — рендеринг из API-мока, поиск по именам

---

## Уровень 3 — E2E тесты (Playwright)

**Конфиг:** отдельный от Vitest, файлы в `tests/`

| Файл | Сценарий | Статус |
|---|---|---|
| `tests/basic.spec.ts` | Загрузка лендинга, лидерборд, тема | ✅ Реализован |
| `tests/admin-security.spec.ts` | Защита `/admin` от неавторизованных | 🔜 Планируется |

---

## Как добавить тест для нового модуля

1. Создать `src/tests/{module}-core.test.ts`
2. Импортировать хук `use{Module}Engine`
3. Замокировать WASM: `vi.mock('../lib/cognitive-metrics', ...)`
4. Добавить файл в команду `validate` в `package.json`
5. Запустить `npm run validate` — должно быть зелёным

---

## CI/CD интеграция

Шаг в GitHub Actions:

```yaml
- name: Validate core logic
  run: npm run validate
  working-directory: apps/kognitika
```

Этот шаг блокирует merge при любом регрессе в математическом ядре.
