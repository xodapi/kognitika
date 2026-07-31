# Начало работы

## Требования

- **Node.js** 22+
- **pnpm** 10.22.0 (канонический пакетный менеджер; npm/yarn не используются)
- **PostgreSQL** 15+ (локально или через Docker)

## Установка

```bash
# Зависимости
pnpm install

# Файл окружения
cp .env.example .env

# PostgreSQL в Docker
docker compose up -d db

# Prisma
pnpm prisma generate
pnpm prisma db push

# Dev-сервер (Express + Vite)
pnpm dev
```

По умолчанию: **http://localhost:3006**

## Переменные окружения

Полный список в `.env.example`. Обязательные для локальной работы:

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | Строка подключения к PostgreSQL |
| `JWT_SECRET` | Секрет для подписи JWT |
| `PORT=3006` | Порт сервера |
| `APP_URL=http://localhost:3006` | Публичный URL приложения |
| `CORS_ORIGIN=http://localhost:3006` | Разрешённые источники CORS |
| `CORS_ALLOW_DEV_WILDCARD=false` | Wildcard CORS только в dev с явным флагом |

`CORS_ORIGIN` принимает comma-separated allowlist, разделяемый Express и Socket.io. Продакшн без allowlist закрывается fail-closed.

Опционально: Telegram, SMTP, legacy email-каналы. Публичная аутентификация — Brain ID-first; legacy email явно отгейтованы.

## Скрипты

| Команда | Назначение |
|---|---|
| `pnpm dev` | Запуск Express/Vite dev-сервера |
| `pnpm start` | Запуск Express сервера (production) |
| `pnpm lint` | Prisma generate + TypeScript check |
| `pnpm test` | Запуск Vitest suite |
| `pnpm validate` | Базовый прогон валидации |
| `pnpm build` | Prisma generate + Vite build |
| `pnpm test:e2e` | Playwright E2E (Playwright управляет webServer) |
| `pnpm test:e2e:attached` | Playwright к уже запущенному серверу (Win/proxy) |
| `pnpm clean` | Удаление только локального `dist` |

## Валидация перед коммитом

Перед production-risk изменениями:

```bash
pnpm lint
pnpm test
pnpm build
```

Для навигации / post-game flow:

```bash
pnpm test:e2e
```

Если локальный Playwright webServer readiness влияет десктопный прокси:

```bash
pnpm dev
pnpm test:e2e:attached
```

Известные неблокирующие предупреждения: Recharts zero-size в jsdom, React `act(...)` в dashboard-тестах. Новые падения — блокеры.

## Структура проекта (кратко)

```
kognitika/
├── src/
│   ├── components/        # React UI (70+ тренажёров, модалки, панели)
│   ├── hooks/             # use{Module}Engine паттерн
│   ├── lib/               # Утилиты, маршруты, база знаний
│   ├── core/              # EventBus, генераторы, аналитика
│   ├── server/            # Express API, Socket.io, middleware, схемы
│   ├── client/            # Клиентский event-bus
│   ├── workers/           # Web Workers (analytics, session analysis)
│   ├── tests/             # Vitest (84 файла, 357 тестов)
│   ├── App.tsx            # Корневой роутинг
│   └── main.tsx           # Точка входа
├── crates/kognitika-core/ # Rust/WASM research крейт
├── apps/capacitor/        # Android/iOS через Capacitor
├── prisma/                # DB схема (12 моделей)
├── tests/                 # Playwright E2E спеки
├── docs/                  # Архитектура, идентичность, операции, аудит
├── server.ts              # Full-stack entry point
├── .github/workflows/     # CI (lint+test+build+e2e), Deploy, Android APK
├── SECURITY.md            # Политика безопасности
├── AGENTS.md              # Гайд для AI-агентов с обязательным чеклистом
└── ARCHITECTURE.md        # Архитектурный source of truth
```

## Docker

```bash
docker compose up --build
```

App: `3006:3006`, PostgreSQL: `5432:5432`.

## Мобильное приложение (Android)

Последний debug APK публикуется автоматически при каждом пуше в `main`:

- **Скачать**: [GitHub Releases → android-latest](https://github.com/xodapi/kognitika/releases/tag/android-latest)

Подписанные App Bundle для Play Console собираются вручную через workflow `Android Native Build` (`workflow_dispatch` с `release=true`) в окружении `android-release`.
