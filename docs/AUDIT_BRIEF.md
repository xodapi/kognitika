# Kognitika — описание проекта для внешнего аудитора

> Версия: 1.0 | Обновлено: 2026-07-29 | Статус: Stabilized MVP

## 1. Что это за продукт

Kognitika — приватная веб-платформа когнитивных тренировок (MVP, стадия технической стабилизации). Содержит 30+ тренажёров (таблицы Шульте, N-Back, тест Струпа, ментальная арифметика, «Страж Разума» — модули критического мышления), геймификацию (XP, уровни, лидерборды), real-time дуэли и адаптивную аналитику прогресса.

- Репозиторий: `github.com/xodapi/kognitika` (приватный, рабочая ветка `main`)
- Продакшн: `https://kognitika.syntog.ru` (health-check: `/api/health`, возвращает `buildId` = short hash коммита)
- Roadmap трекается в GitHub issue #10

## 2. Технологический стек

| Слой | Технологии |
|---|---|
| Frontend | React 19 + Vite 7 + TypeScript, Tailwind 4, Motion, Recharts, react-router 7 |
| Backend | Express 4 + Socket.io 4 (real-time дуэли, чат), один процесс `server.ts` на порту 3006 |
| Данные | PostgreSQL 15+ через Prisma 7 (12 моделей: User, GameSession, XpEvent, LeaderboardEntry, Feedback, Idea, Achievement, DailyPracticePlan и др.) |
| Аналитика | JS Web Worker (`analytics.worker.ts`) с WASM-ready контрактом; Rust-крейт `crates/kognitika-core` существует, но не является runtime-зависимостью |
| Mobile | Capacitor 8 (`apps/capacitor`), ветка `apps/mobile` |
| Тесты | Vitest (357 тестов, 84 файла — все зелёные), Playwright E2E |
| CI/CD | GitHub Actions: `ci.yml` (lint+test+build+E2E), `deploy.yml` (деплой на сервер при мерже в main), `android.yml` (сборка APK) |

## 3. Ключевые архитектурные принципы

- **Event-Driven Core**: бизнес-логика каждого тренажёра изолирована в hook `use{Module}Engine`, UI получает только state; связь через EventBus (`CELL_CLICK`, `TRAINING_COMPLETE`, `MISTAKE_MADE` и др.)
- **Seeded determinism**: все генераторы принимают seed — тесты воспроизводимы
- **Единый полно-стек сервер**: `server.ts` отдаёт и API, и статику Vite-билда; canonical port 3006
- **Deploy только repository-first**: прямые правки на проде запрещены (кроме задокументированного hotfix-протокола в `AGENTS.md`)

## 4. Модель идентичности и приватности (зона особого внимания аудита)

- **Brain ID-first**: публичная аутентификация только через Brain ID; email/password — legacy, явно отгейтованы. Firebase полностью выведён из runtime
- Контракты приватности: сырой Brain ID, email, хэши, токены не должны появляться в UI/API — это проверяется контракт-тестами (`admin-route-privacy`, `analytics-export-privacy`, `app-identity-privacy`, `legacy-email-audit`)
- CORS: allowlist через `CORS_ORIGIN`, wildcard только в dev при явном флаге; прод без allowlist закрывается fail-closed
- JWT-авторизация, rate-limiting, helmet; роль ADMIN не доверяет подписанному JWT без серверной проверки
- Границы хранения/восстановления Brain ID задокументированы в `docs/brain-id-identity.md`

## 5. Тестирование и качество

- `pnpm lint` (tsc), `pnpm test` (Vitest), `pnpm build`, `pnpm test:e2e` (Playwright) — обязательный гейт перед production-risk изменениями
- Контракт-тесты: навигация, база знаний, XP-события, приватность экспорта аналитики, socket-trust-boundary дуэлей
- Известные неблокирующие предупреждения: Recharts zero-size в jsdom, React `act(...)` в dashboard-тестах

## 6. Текущее состояние репозитория (на 29.07.2026)

- Последний коммит: `3724104 feat(ux): add Express Knowledge hub for tasks #7 and #8`
- В работе: фиксы контракт-тестов (navigation, knowledge-base), статья `express-knowledge` в базе знаний

## 7. Известные риски для аудитора

1. PWA/offline отключён до выполнения гейтов `docs/pwa-offline-strategy.md`
2. Rust/WASM hot-path не должен начинаться без frame-budget гейта (`docs/frame-budget-benchmark.md`)
3. Legacy email-функции должны оставаться отгейтованными
4. Лицензия: проприетарная, см. `LICENSE` в корне репозитория

## 8. Ключевые документы для аудитора

- `AGENTS.md` — обязательные правила работы агентов (чеклист, deploy flow, изоляция write-set)
- `ARCHITECTURE.md` / `KOGNITIKA_CORE.md` — архитектурный source of truth
- `README.md` — установка, скрипты, runtime-контракты
- `security_spec.md` — спецификация безопасности системы обратной связи (data invariants + threat model)
- `docs/brain-id-identity.md` — границы идентичности Brain ID
- `docs/feedback-operations.md` — операционная верификация feedback
