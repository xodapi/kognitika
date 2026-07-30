<div align="center">
  <br />
  <h1>🧠 Когнитика</h1>
  <p><strong>Платформа когнитивных тренировок — память, внимание, скорость реакции и адаптивная аналитика</strong></p>
  <p>
    <a href="https://kognitika.syntog.ru" target="_blank">kognitika.syntog.ru</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff" alt="TypeScript" />
    <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Express-000?logo=express&logoColor=fff" alt="Express" />
    <img src="https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=fff" alt="Prisma" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=fff" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=fff" alt="Socket.io" />
    <br />
    <img src="https://img.shields.io/badge/тесты-357_пройдены-22c55e?logo=vitest&logoColor=fff" alt="Tests" />
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

Приватная веб-платформа для когнитивных тренировок. Аутентификация через Brain ID, 30+ тренажёров, адаптивная аналитика, real-time дуэли и геймификация.

<p>
  <a href="https://github.com/xodapi/kognitika/wiki"><strong>Вики проекта</strong></a> ·
  <a href="https://kognitika.syntog.ru"><strong>Продакшн</strong></a> ·
  <a href="https://github.com/xodapi/kognitika/releases/tag/android-latest"><strong>Скачать APK</strong></a>
</p>

---

## Быстрая навигация

| Раздел | Ссылка |
|---|---|
| Архитектура и дизайн системы | [`ARCHITECTURE.md`](ARCHITECTURE.md), [`KOGNITIKA_CORE.md`](KOGNITIKA_CORE.md) |
| Научная методология всех тренажёров | [Научная методология (вики)](https://github.com/xodapi/kognitika/wiki/Научная-методология) |
| Все тесты: 84 файла, 357 проверок | [Тестирование (вики)](https://github.com/xodapi/kognitika/wiki/Тестирование) |
| Экспорт данных для анализа в LLM | [Экспорт данных (вики)](https://github.com/xodapi/kognitika/wiki/Экспорт-данных) |
| Безопасность и ответственное раскрытие уязвимостей | [`SECURITY.md`](SECURITY.md) |
| Гайд по разработке для агентов | [`AGENTS.md`](AGENTS.md) |
| Дорожная карта | [Issue #10](https://github.com/xodapi/kognitika/issues/10) |
| База знаний тренажёров (в приложении) | `src/lib/knowledge-base.ts` |
| Описание для внешнего аудитора | [`docs/AUDIT_BRIEF.md`](docs/AUDIT_BRIEF.md) |
| GLOBAL_VISION.md | `GLOBAL_VISION.md` |
| API Reference (OpenAPI) | https://kognitika.syntog.ru/api/docs |

---

## Статус проекта

**MVP / Техническая стабилизация.** Приоритет — снижение production-рисков: boot recovery, контракты хранилища, приватная идентификация, консистентность API, тестовое покрытие, воспроизводимость деплоя.

Дорожная карта: [github.com/xodapi/kognitika/issues/10](https://github.com/xodapi/kognitika/issues/10)

---

## Стек технологий

| Слой | Технологии |
|---|---|
| Frontend | React 19 + Vite 7 + TypeScript + Tailwind CSS 4 + Motion + Recharts |
| Backend | Express 4 + Socket.io 4 |
| База данных | PostgreSQL 15+ через Prisma 7 (12 моделей) |
| Аналитика | JS Web Worker + Rust/WASM-ready граница |
| Мобильное приложение | Capacitor 8 (Android APK в CI) |
| Тестирование | Vitest (84 файла, 357 тестов) + Playwright E2E |
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
│   ├── tests/                   # Vitest (84 файла, 357 тестов)
│   ├── App.tsx                  # Корневой компонент с роутингом
│   └── main.tsx                 # Точка входа
├── crates/
│   └── kognitika-core/          # Rust/WASM исследовательский крейт
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

# 3. Запустить PostgreSQL в Docker
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

Дополнительно: Telegram, SMTP, Neurotrainer — опционально, см. `.env.example`.

---

## Скрипты

| Команда | Назначение |
|---|---|
| `pnpm dev` | Запуск Express/Vite dev-сервера |
| `pnpm start` | Запуск Express-сервера (production) |
| `pnpm lint` | Prisma generate + TypeScript check |
| `pnpm test` | Vitest (357 тестов) |
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
- **Rust/WASM, 60 FPS**: требуют frame-budget гейта `docs/frame-budget-benchmark.md`.
- **Аналитика**: `ClickEvent = { cellId, reactionTimeMs }`.
- **Production-патчи**: запрещены без задокументированного hotfix-протокола.

---

## Деплой

```
локальные изменения → commit → push → PR → merge в main → GitHub Actions → сервер
```

Production health-check:

```bash
curl https://kognitika.syntog.ru/api/health
```

Ответ содержит `buildId` = short hash коммита.

---

## Docker

```bash
docker compose up --build
```

Приложение: `3006:3006`, PostgreSQL: `5432:5432`.

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
