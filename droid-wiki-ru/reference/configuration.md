# Конфигурация

Все переменные окружения с описанием на русском.

---

## Обязательные для локальной работы

| Переменная | Описание | Пример / дефолт |
|---|---|---|
| `DATABASE_URL` | Строка подключения к PostgreSQL | `postgresql://user:pass@localhost:5432/kognitika` |
| `JWT_SECRET` | Секрет для подписи JWT токенов | случайная 64-символьная строка |
| `PORT` | Порт сервера | `3006` |
| `APP_URL` | Публичный URL приложения | `http://localhost:3006` |
| `FRONTEND_URL` | URL фронтенда (для CORS) | `http://localhost:3006` |
| `CORS_ORIGIN` | Разрешённые источники CORS (через запятую) | `http://localhost:3006` |
| `CORS_ALLOW_DEV_WILDCARD` | Разрешить `*` в CORS (только dev) | `false` |

`CORS_ORIGIN` — comma-separated allowlist, общий для Express и Socket.io. Продакшн без allowlist закрывается fail-closed и логирует предупреждение при старте.

---

## Серверные настройки

| Переменная | Описание | Пример / дефолт |
|---|---|---|
| `NODE_ENV` | Режим runtime | `development` / `production` |
| `LOG_LEVEL` | Уровень логирования | `info` / `debug` / `warn` / `error` |
| `RATE_LIMIT_WINDOW_MS` | Окно rate-limiting (мс) | `900000` (15 мин) |
| `RATE_LIMIT_MAX` | Макс запросов за окно | `100` |
| `SESSION_COOKIE_NAME` | Имя cookie сессии | `kognitika.sid` |
| `SESSION_COOKIE_SECURE` | Secure флаг cookie | `false` (dev) / `true` (prod) |

---

## Аутентификация / Brain ID

| Переменная | Описание | Пример / дефолт |
|---|---|---|
| `BRAIN_ID_LENGTH` | Длина генерируемого Brain ID | `24` |
| `BRAIN_ID_PREFIX` | Префикс Brain ID | `BR-` |
| `JWT_EXPIRES_IN` | TTL access токена | `7d` |
| `REFRESH_TOKEN_EXPIRES_IN` | TTL refresh токена | `30d` |
| `BCRYPT_ROUNDS` | Раунды bcrypt для legacy password | `12` |

---

## Neurotrainer / LLM

| Переменная | Описание | Пример / дефолт |
|---|---|---|
| `NEUROTRAINER_LLM_ENABLED` | Включить LLM-генерацию контента | `true` / `false` |
| `NEUROTRAINER_LLM_PROVIDER` | Провайдер LLM | `openai` / `anthropic` / `local` |
| `NEUROTRAINER_LLM_API_KEY` | API ключ провайдера | `sk-...` |
| `NEUROTRAINER_LLM_MODEL` | Модель LLM | `gpt-4o-mini` |
| `NEUROTRAINER_FALLBACK_ENABLED` | Включить fallback без LLM | `true` |
| `NEUROTRAINER_MAX_TOKENS` | Макс токенов в ответе | `2000` |
| `NEUROTRAINER_TEMPERATURE` | Температура генерации | `0.7` |

---

## Опциональные интеграции

### Telegram

| Переменная | Описание |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather |
| `TELEGRAM_ADMIN_CHAT_ID` | Chat ID админа для уведомлений |

### SMTP / Email (legacy, гейтованы)

| Переменная | Описание |
|---|---|
| `SMTP_HOST` | Хост SMTP сервера |
| `SMTP_PORT` | Порт (587/465/25) |
| `SMTP_USER` | Пользователь |
| `SMTP_PASS` | Пароль |
| `SMTP_FROM` | Email отправителя |
| `EMAIL_ENABLED` | Включить email-канал | `false` |

---

## Аналитика / Export

| Переменная | Описание | Дефолт |
|---|---|---|
| `MAX_EXPORT_SESSIONS` | Макс сессий в экспорте | `1000` |
| `ANALYTICS_WORKER_ENABLED` | Включить Web Worker аналитику | `true` |
| `ANALYTICS_BATCH_SIZE` | Размер батча для батч-аналитики | `50` |

---

## Мобильное приложение (Capacitor)

| Переменная | Описание |
|---|---|
| `CAPACITOR_ANDROID_KEYSTORE_BASE64` | Base64 keystore для подписи release |
| `CAPACITOR_ANDROID_KEYSTORE_PASSWORD` | Пароль keystore |
| `CAPACITOR_ANDROID_KEY_ALIAS` | Алиас ключа |
| `CAPACITOR_ANDROID_KEY_PASSWORD` | Пароль ключа |

---

## Отладка / Dev-only

| Переменная | Описание | Дефолт |
|---|---|---|
| `DEBUG` | Включить debug логи | `false` |
| `VITE_DEV_SERVER_PORT` | Порт Vite dev server | `5173` |
| `VITE_API_PROXY_TARGET` | Прокси API в dev | `http://localhost:3006` |

---

## Пример .env.example (минимальный)

```bash
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/kognitika
JWT_SECRET=your-64-char-random-secret-here
PORT=3006
APP_URL=http://localhost:3006
FRONTEND_URL=http://localhost:3006
CORS_ORIGIN=http://localhost:3006
CORS_ALLOW_DEV_WILDCARD=false

# Auth
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Optional
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
EMAIL_ENABLED=false

# Neurotrainer
NEUROTRAINER_LLM_ENABLED=false
NEUROTRAINER_FALLBACK_ENABLED=true
```

---

## Правила

1. **Никогда не коммитьте** реальные секреты, токены, сырой Brain ID, продакшн телеметрию или пользовательские данные.
2. Новые переменные объявляйте в `.env.example` в том же PR.
3. Держите Prisma схему, API контракты, тесты, README и деплой-конфиг в синхронизации.
