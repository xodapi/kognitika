# Configuration

All configuration is through environment variables. Copy `.env.example` to `.env` for local development. Never commit real secrets.

## Required

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string for Prisma. Format: `postgresql://user:password@host:port/database?schema=public` | -- |
| `JWT_SECRET` | Secret key for signing and verifying JWT authentication tokens. The server exits on startup if this is not set. | -- |

## Server

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP server port. Used for both the Express API and Vite dev server. | `3006` |
| `APP_URL` | Public URL of the application (used for CORS, redirects, and API links). | `http://localhost:3006` |
| `FRONTEND_URL` | Public URL of the frontend (used for CORS and redirects). | `http://localhost:3006` |
| `NODE_ENV` | Environment mode: `development`, `test`, or `production`. Controls Vite middleware vs. static serving, CORS wildcard behavior, and debug output. | `development` |

## CORS

| Variable | Description | Default |
|---|---|---|
| `CORS_ORIGIN` | Comma-separated list of allowed origins for CORS. Used by both Express and Socket.io. Must be an explicit allowlist in production. Example: `https://kognitika.ru,https://kognitika.syntog.ru` | -- |
| `CORS_ALLOW_DEV_WILDCARD` | When `"true"`, allows `CORS_ORIGIN=*` in development and test modes only. Ignored in production. | `false` |
| `CORS_ALLOW_NATIVE_APP` | When `"true"`, adds Capacitor native app origins (`capacitor://localhost`, `https://localhost`) to the allowlist. | `true` |

## Legacy email

| Variable | Description | Default |
|---|---|---|
| `ADMIN_NOTIFICATION_EMAIL` | Admin notification mailbox. Not a public identity or auth source. | `admin@example.com` |
| `LEGACY_EMAIL_NOTIFICATIONS_ENABLED` | Enables legacy email notification channels. Must be opt-in only. | `false` |
| `LEGACY_EMAIL_AUTH_ENABLED` | Enables legacy email-based authentication. Brain ID is the primary auth method. | `false` |

## Optional integrations

| Variable | Description | Default |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for admin notifications. | `replace-me` |
| `TELEGRAM_ADMIN_CHAT_ID` | Telegram chat ID for admin notifications. | `replace-me` |
| `SMTP_HOST` | SMTP server hostname for email sending. | `smtp.example.com` |
| `SMTP_PORT` | SMTP server port. | `465` |
| `SMTP_SECURE` | Whether to use TLS for SMTP. | `true` |
| `SMTP_USER` | SMTP authentication username. | `user@example.com` |
| `SMTP_PASS` | SMTP authentication password. | `replace-me` |

## Neurotrainer (LLM)

| Variable | Description | Default |
|---|---|---|
| `LLM_ENABLED` | Enables the OpenAI-compatible neurotrainer provider. When `"false"`, uses deterministic local generation. | `false` |
| `LLM_BASE_URL` | Base URL for the OpenAI-compatible API. | `https://api.openai.com/v1` |
| `LLM_API_KEY` | API key for the LLM provider. | `replace-me` |
| `LLM_MODEL` | Model name to use for generation. | `replace-with-model-name` |
| `LLM_TIMEOUT_MS` | Timeout for LLM API calls in milliseconds. | `8000` |

## Debugging

| Variable | Description | Default |
|---|---|---|
| `DEBUG_LOGS` | Enables verbose server-side logging when `"true"`. | `false` |

## Build-time variables

These are set during CI/CD build steps, not in `.env`:

| Variable | Description | Default |
|---|---|---|
| `VITE_BUILD_ID` | Build identifier embedded in the frontend. | `dev` |
| `VITE_GIT_COMMIT` | Git commit hash embedded in the frontend. | `dev` |
| `VITE_DEBUG_LOGS` | Enables frontend debug logging. | `false` |
| `BUILD_HASH` | Build hash used by the server health check endpoint. Set during deploy. | (resolved from git) |
