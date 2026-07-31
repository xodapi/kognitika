# Деплой

## CI/CD Pipeline

Три GitHub Actions workflow в `.github/workflows/`:

| Workflow | Триггер | Назначение |
|---|---|---|
| `ci.yml` | push/PR на `main` | TypeScript lint → Vitest (357 тестов) → Vite build → Playwright E2E |
| `deploy.yml` | merge в `main` | Деплой на продакшн сервер |
| `android.yml` | push на `main` + `workflow_dispatch` | Сборка debug APK + rolling release `android-latest` |

---

## Canonical Deploy Flow

```
локальные изменения
  → git commit
  → git push / GitHub PR
  → merge или approved branch
  → сервер: git pull
  → pnpm install --frozen-lockfile
  → pnpm build
  → restart service
  → verify /api/health и внешний HTTPS smoke
```

**Прямые правки на проде запрещены** (кроме задокументированных emergency hotfixes).

---

## Production Health Check

```bash
curl https://kognitika.ru/api/health
```

Ответ включает `buildId` = short hash коммита. Deploy workflow читает внутренний health-check порт из серверного `.env` `PORT` (fallback 3006).

---

## Docker

```bash
docker compose up --build
```

- App: `3006:3006`
- PostgreSQL: `5432:5432`

---

## Android Releases

### Rolling debug APK (`android-latest`)

Каждый пуш в `main` обновляет GitHub Release `android-latest` с `kognitika-debug.apk` (~4.8 MB):

- **Скачать**: https://github.com/xodapi/kognitika/releases/tag/android-latest
- Автоматически публикуется job `github-release` в `android.yml`

### Signed Play Console Bundle

Ручной запуск через `workflow_dispatch`:

1. GitHub Actions → `Android Native Build` → `Run workflow`
2. `release: true`
3. Job `release` в окружении `android-release` собирает `.aab` с подписью (keystore из секретов)

**Secrets требуемые для release**:
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

---

## Server Configuration

- **Canonical port**: 3006 (`.env.example`, `server.ts`, Dockerfile, docker-compose.yml, README, deployment config)
- **Express + Vite**: `server.ts` отдаёт и API, и статику production-билда
- **Socket.io**: Real-time дуэли и SymbolChat на том же процессе
- **CORS**: Allowlist через `CORS_ORIGIN` (comma-separated). Wildcard только в dev с `CORS_ALLOW_DEV_WILDCARD=true`. Продакшн без allowlist = fail-closed.
- **Security headers**: Helmet, rate-limit, JWT auth, admin role проверяется серверно (не доверяет JWT alone).

---

## Emergency Hotfix Protocol

Разрешено только когда продакшн **активно сломан** и координатор явно одобрил:

1. Timestamped backup перед правкой
2. Запись точных файлов и команд
3. Немедленное воспроизведение в git, commit, push, повторный деплой через canonical flow
4. Отчёт временного патча как `[WARNING]` до синхронизации git и продакшн
