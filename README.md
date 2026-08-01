<div align="center">
  <br />
  <h1>🧠 Когнитика</h1>
  <p><strong>Платформа когнитивных тренировок — память, внимание, скорость реакции и адаптивная аналитика</strong></p>
  <p>
    <a href="https://kognitika.ru" target="_blank">kognitika.ru</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff" alt="TypeScript" />
    <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Express-000?logo=express&logoColor=fff" alt="Express" />
    <img src="https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=fff" alt="Prisma" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=fff" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=fff" alt="Socket.io" />
    <br />
    <img src="https://img.shields.io/badge/тесты-CI_проверка-22c55e?logo=vitest&logoColor=fff" alt="Tests" />
    <img src="https://img.shields.io/badge/лицензия-Proprietary-ff69b4" alt="License" />
    <img src="https://img.shields.io/github/last-commit/xodapi/kognitika?logo=git" alt="Last commit" />
  </p>
  <p>
    <sub>
      <a href="README.en.md">English version</a>
    </sub>
  </p>
  <br />
</div>

> 🚀 **Live:** [kognitika.ru](https://kognitika.ru) | 📱 **Android APK:** [Latest Release](https://github.com/xodapi/kognitika/releases/tag/android-latest) | 📚 **Wiki:** [Project Wiki](https://github.com/xodapi/kognitika/wiki)

---

## ✨ Key Features

| Domain | Trainers | Focus |
|--------|----------|-------|
| **Base** | Schulte, N-Back, Stroop, Mental Math, Spatial, Typing | Attention, memory, speed |
| **Engineering** | Numerical, Logical, Topology, Collision, Dispatcher, Noise | Systems thinking |
| **Mind-Guard** | Scanner, Decryptor, Reality Check, Hype Filter, Reframing, Rejection | Critical thinking |
| **Meta** | Cognitive Map, Wiki, Leaderboard, Duels, Express Knowledge Hub | Progress, knowledge, competition |

- 🔐 **Brain ID** — Privacy-first auth (no Firebase, no email exposure)
- ⚡ **Real-time duels** — Socket.io with resource bounds
- 📊 **Когнитивная аналитика** — текущий JS/TypeScript pipeline, `kognitika-core` на Rust и план перехода shadow → canary → Rust-primary
- 📱 **Native Android** — Capacitor 8, rolling debug APK on every push
- ✅ **Контрактные проверки** — Vitest + Playwright E2E, navigation и privacy contracts; точный текущий результат подтверждает CI

---

## 🛠 Quick Start (Development)

```bash
# Clone & install
git clone https://github.com/xodapi/kognitika.git
cd kognitika
pnpm install --frozen-lockfile

# Setup env & database
cp .env.example .env
# Edit .env with DATABASE_URL, JWT_SECRET
pnpm exec prisma migrate deploy

# Dev server (port 3006)
pnpm dev
```

---

## Быстрая навигация

| Раздел | Ссылка |
|---|---|
| Архитектура и дизайн системы | [`ARCHITECTURE.md`](ARCHITECTURE.md), [`KOGNITIKA_CORE.md`](KOGNITIKA_CORE.md) |
| Научная методология всех тренажёров | [Научная методология (вики)](https://github.com/xodapi/kognitika/wiki/Научная-методология) |
| Тестирование и quality gates | [Тестирование (вики)](https://github.com/xodapi/kognitika/wiki/Testing-reference), текущий результат подтверждает CI |
| Экспорт агрегированной аналитики | [Экспорт данных (вики)](https://github.com/xodapi/kognitika/wiki/Data-export) |
| Безопасность и ответственное раскрытие уязвимостей | [`SECURITY.md`](SECURITY.md) |
| Гайд по разработке для агентов | [`AGENTS.md`](AGENTS.md) |
| Актуальная roadmap стабилизации | [Issues](https://github.com/xodapi/kognitika/issues?q=is%3Aissue%20is%3Aopen%20label%3Astatus%3Aplanned); historical [#10](https://github.com/xodapi/kognitika/issues/10) закрыт |
| Переход аналитики и backend на Rust | [Roadmap #139](https://github.com/xodapi/kognitika/issues/139), [страница Wiki](https://github.com/xodapi/kognitika/wiki/rust-analytics-roadmap) |
| Носимые устройства и физиологическая feedback-петля | [#148 consent/privacy](https://github.com/xodapi/kognitika/issues/148) → [#149 summary contract](https://github.com/xodapi/kognitika/issues/149) → [#150 Health Connect](https://github.com/xodapi/kognitika/issues/150) → [#151 shadow policy](https://github.com/xodapi/kognitika/issues/151) |
| База знаний тренажёров (в приложении) | `src/lib/knowledge-base.ts` |
| Описание для внешнего аудитора | [`docs/AUDIT_BRIEF.md`](docs/AUDIT_BRIEF.md) |
| Стратегическое видение | [`GLOBAL_VISION.md`](GLOBAL_VISION.md), стратегическая заметка, не runtime source of truth |
| API Reference (OpenAPI) | [Issue #138](https://github.com/xodapi/kognitika/issues/138), planned; `/api/docs` и `/api/docs.json` пока не доступны |

---

## Статус проекта

**MVP / техническая стабилизация с поэтапным развитием аналитики.** Базовый приоритет остаётся прежним: production recovery, контракты хранилища, приватная идентификация, API consistency, CI evidence и воспроизводимый deploy. Historical roadmap [#10](https://github.com/xodapi/kognitika/issues/10) закрыт.

Активные направления:

1. **Когнитивная аналитика на Rust:** [#139](https://github.com/xodapi/kognitika/issues/139), с canonical events → durable jobs → Axum shadow → canary → Rust-primary, при временном TypeScript fallback.
2. **Носимые устройства, только opt-in:** отдельный privacy-first трек [#148](https://github.com/xodapi/kognitika/issues/148) → [#149](https://github.com/xodapi/kognitika/issues/149) → [#150](https://github.com/xodapi/kognitika/issues/150) → [#151](https://github.com/xodapi/kognitika/issues/151). Он начинается с локальных минимизированных summary и recommendation-only shadow режима, не с raw telemetry или медицинских claims.
3. **Platform stabilization:** открытые planned issues и текущий CI определяют порядок безопасных runtime/deploy изменений.

Wearable signals не являются обязательным условием когнитивной аналитики. Они могут войти позже как отдельный consented input: consent + local aggregation + signal quality → versioned physiological summary → bounded recommendation policy. Без consent, при отсутствии, low-quality, stale или revoked signal используется обычная cognitive-only логика.

---

## Стек технологий

| Слой | Технологии |
|---|---|
| Frontend | React 19 + Vite 7 + TypeScript + Tailwind CSS 4 + Motion + Recharts |
| Backend | Express 4 + Socket.io 4 |
| База данных | PostgreSQL 15+ через Prisma 7 (12 моделей) |
| Аналитика | JS/TypeScript runtime сегодня; Rust `kognitika-core` уже реализует `AnalyzeSession`; целевой путь — native Rust/Axum analytics через shadow и canary |
| API-контракт | OpenAPI/Swagger в работе: [#138](https://github.com/xodapi/kognitika/issues/138); спецификация должна оставаться независимой от Express/Rust реализации |
| Мобильное приложение | Capacitor 8 (Android APK в CI) |
| Тестирование | Vitest + Playwright E2E; точный текущий результат подтверждается CI |
| CI/CD | GitHub Actions: Lint → Test → Build → E2E → Deploy → APK |

---

## Структура проекта

```
kognitika/
├── src/                         # Исходный код приложения
│   ├── components/              # React-компоненты (70+ тренажёров, модалки, панели)
│   ├── hooks/                   # React-hooks (паттерн use{Module}Engine)
│   ├── lib/                     # Общие утилиты, маршруты, база знаний
│   ├── core/                    # EventBus, генераторы с seed, аналитика
│   ├── server/                  # Express API, Socket.io, middleware, схемы
│   ├── client/                  # Клиентский event-bus
│   ├── workers/                 # Web Worker'ы (аналитика, сессии)
│   ├── tests/                   # Vitest contract and integration tests
│   ├── App.tsx                  # Корневой компонент с роутингом
│   └── main.tsx                 # Точка входа
├── crates/
│   └── kognitika-core/          # Rust AnalyzeSession core: native + WASM; основа поэтапной миграции аналитики
├── apps/
│   ├── capacitor/               # Android/iOS через Capacitor
│   └── mobile/                  # Мобильная конфигурация
├── prisma/                      # Схема базы данных (12 моделей)
├── tests/                       # Playwright E2E-спецификации
├── docs/                        # Архитектура, идентификация, операции, аудит
├── server.ts                    # Express + Vite dev server
├── .github/workflows/           # CI, Deploy, Android APK
├── SECURITY.md                  # Политика безопасности
├── AGENTS.md                    # Гайд по разработке для AI-агентов
└── ARCHITECTURE.md              # Архитектурный источник истины
```

---

## Требования к окружению

- **Node.js** 22 или выше
- **pnpm** 10.22.0 (канонический пакетный менеджер; npm/yarn не используются)
- **PostgreSQL** 15+ (локально или в Docker)

---

## Локальный запуск

```bash
# 1. Установить зависимости
pnpm install

# 2. Создать файл окружения
cp .env.example .env

# 3. Указать POSTGRES_USER, POSTGRES_PASSWORD и POSTGRES_DB в .env,
# затем запустить PostgreSQL во внутренней Docker-сети
docker compose up -d db

# 4. Настроить Prisma
pnpm prisma generate
pnpm prisma db push

# 5. Запустить dev-сервер
pnpm dev
```

По умолчанию: **http://localhost:3006**

---

## Переменные окружения

Полный список в `.env.example`. Обязательные для локальной разработки:

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | Строка подключения к PostgreSQL |
| `JWT_SECRET` | Секрет для подписи JWT-токенов |
| `PORT=3006` | Порт сервера |
| `APP_URL` | Публичный URL приложения |
| `CORS_ORIGIN` | Разрешённые источники CORS (через запятую) |
| `CORS_ALLOW_DEV_WILDCARD=false` | Разрешить `*` в CORS только для разработки |

Дополнительно: Telegram и Neurotrainer, опционально, см. `.env.example`.

---

## Скрипты

| Команда | Назначение |
|---|---|
| `pnpm dev` | Запуск Express/Vite dev-сервера |
| `pnpm start` | Запуск Express-сервера (production) |
| `pnpm lint` | Prisma generate + TypeScript check |
| `pnpm test` | Vitest suite; точный текущий результат подтверждается CI |
| `pnpm validate` | Базовый прогон валидации |
| `pnpm build` | Prisma generate + Vite build |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm test:e2e:attached` | Playwright к уже запущенному серверу |
| `pnpm clean` | Очистка `dist/` |

---

## Валидация перед коммитом

Перед production-risk изменениями выполнить:

```bash
pnpm lint
pnpm test
pnpm build
```

Для навигации и post-game flow дополнительно:

```bash
pnpm test:e2e
```

Известные неблокирующие предупреждения: Recharts zero-size в jsdom, React `act(...)` в dashboard-тестах. Новые падения — блокирующие.

---

## Runtime-контракты

- **Порт**: `3006` (канонический).
- **Обратная связь**: Prisma-backed `/api/feedback` — операторская верификация в `docs/feedback-operations.md`.
- **Идентификация**: Brain ID-first; сырой Brain ID, email, токены и хэши паролей не появляются в UI/API.
- **Хранилище Brain ID**: `docs/brain-id-identity.md`.
- **PWA/offline**: отключён до acceptance-гейтов `docs/pwa-offline-strategy.md`.
- **Текущая аналитика**: production использует JS/TypeScript worker и серверные сервисы; упрощённый `ClickEvent` и full-session `AnalyzeSession` пока являются разными контрактами.
- **Целевой Rust-контур**: единые события всех когнитивных модулей → durable analytics jobs → internal Axum analyzer → shadow → canary → Rust-primary с временным TS fallback. Roadmap: [#139](https://github.com/xodapi/kognitika/issues/139).
- **Browser WASM**: включается только после frame-budget гейта `docs/frame-budget-benchmark.md`; серверный native Rust оценивается отдельно и не требует переписывания React UI.
- **Wearable feedback, opt-in**: не относится к raw telemetry pipeline. Будущий mobile adapter сначала получает явное consent, локально агрегирует quality-aware summary и только затем может передать versioned physiological input в recommendation-only shadow policy. Без consent, при отсутствии, stale, low-quality или revoked signal применяется обычная cognitive-only логика. Roadmap: [#148](https://github.com/xodapi/kognitika/issues/148) → [#149](https://github.com/xodapi/kognitika/issues/149) → [#150](https://github.com/xodapi/kognitika/issues/150) → [#151](https://github.com/xodapi/kognitika/issues/151).
- **OpenAPI**: [#138](https://github.com/xodapi/kognitika/issues/138) должен описывать независимый от языка HTTP-контракт, совместимый с Express и будущими Rust endpoints. `/api/docs` и `/api/docs.json` пока не доступны.
- **Production-патчи**: запрещены без задокументированного hotfix-протокола.

---

## Деплой

```
локальные изменения → commit → push → PR → merge в main → GitHub Actions → сервер
```

Production health-check:

```bash
curl https://kognitika.ru/api/health
```

Ответ содержит `buildId` = short hash коммита.

---

## Docker

```bash
docker compose up --build
```

Приложение публикуется на `3006:3006`. PostgreSQL доступен только внутри Docker-сети и не публикуется на хост; учётные данные и `JWT_SECRET` должны быть заданы через `.env`.

---

## Мобильное приложение (Android)

Последняя debug APK собирается автоматически при каждом пуше в `main`:

- **Скачать**: [GitHub Releases → android-latest](https://github.com/xodapi/kognitika/releases/tag/android-latest)

Подписанные App Bundle для Play Console собираются вручную через workflow `Android Native Build` (`workflow_dispatch` с `release=true`) в окружении `android-release`.

---

## Оформление issues

Префиксы заголовков:

- `[P0]` — production-аутэйдж, активный security-риск, потеря данных
- `[P1]` — приоритетная стабилизация, приватность, безопасность
- `[P2]` — чистка, документация, гигиена контрактов
- `[P3]` — стратегический горизонт

Предпочтительные лейблы:

| Лейбл | Область |
|---|---|
| `area:boot` | Загрузка, восстановление, браузер |
| `area:security` | Безопасность, trust-boundary |
| `area:privacy` | Приватность, 152-ФЗ |
| `area:identity` | Brain ID, идентификация |
| `area:storage` | База данных, Prisma, localStorage |
| `area:api` | API-контракты |
| `area:infra` | CI/CD, деплой, nginx |
| `area:docs` | Документация |
| `area:ux` | Пользовательский опыт |
| `area:analytics` | Аналитика, EventBus, метрики |
| `area:wasm` | Rust/WASM, hot-path |
| `area:product` | Продукт, стратегия, геймификация |

---

## Лицензия

Проприетарная — см. [LICENSE](LICENSE). Доступ к исходному коду предоставляется участникам команды, аудиторам и контракторам в рамках NDA.

Все права защищены. Политика безопасности и ответственное раскрытие уязвимостей: [SECURITY.md](SECURITY.md).

---

*Читать на других языках: [English](README.en.md)*
