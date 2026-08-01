# CI/CD Pipeline (GitHub Actions)

**Репозиторий**: https://github.com/xodapi/kognitika · **Workflow'ы**: `.github/workflows/*.yml` · **Порты**: 3006 (app), 5432 (PostgreSQL)

---

## Обзор Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   ci.yml    │───▶│ deploy.yml  │───▶│  health     │───▶│  smoke      │───▶│  done       │
│ (push/PR)   │    │ (merge)     │    │  check      │    │  test       │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                  │                  │                  │
       ▼                  ▼                  ▼                  ▼
   lint+test+build   git pull+build    curl /api/health   curl HTTPS + WS
```

---

## 1. CI Workflow (`.github/workflows/ci.yml`)

### Триггеры
```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

### Jobs

| Job | Runner | Steps | Время | Артефакты |
|---|---|---|---|---|
| **lint** | `ubuntu-latest` | `pnpm lint` (ESLint + TypeScript) | ~30s | — |
| **test** | `ubuntu-latest` | `pnpm test --run` (Vitest; точный текущий результат подтверждает CI) | зависит от suite | coverage.xml |
| **build** | `ubuntu-latest` | `pnpm build` (Vite production) | ~1m | dist/ (upload) |
| **e2e** | `ubuntu-latest` | `pnpm playwright install` + `pnpm test:e2e` | ~3m | trace.zip, screenshots |

### Кэширование
```yaml
- uses: actions/cache@v4
  with:
    path: |
      ~/.pnpm-store
      node_modules
      .turbo
    key: ${{ runner.os }}-pnpm-${{ hashFiles('pnpm-lock.yaml') }}
```

### Matrix (опционально)
```yaml
strategy:
  matrix:
    node: [20, 22]
    os: [ubuntu-latest]
```

### Artifacts
| Job | Artifact | Retention |
|---|---|---|
| build | `dist/` | 7 дней |
| e2e | `playwright-report/` | 7 дней |
| test | `coverage/` | 7 дней |

---

## 2. Deploy Workflow (`.github/workflows/deploy.yml`)

### Триггер
```yaml
on:
  push:
    branches: [main]  # только после merge в main
```

### Jobs

| Job | Описание |
|---|---|
| **deploy** | SSH на продакшн сервер → git pull → pnpm install → pnpm build → systemctl restart |
| **health-check** | `curl https://kognitika.ru/api/health` (retries: 10, interval: 10s) |
| **smoke** | Full HTTPS check + WebSocket connect + API call |

### Серверная конфигурация (на продакшне)
```bash
# /opt/kognitika/.env
PORT=3006
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=...
CORS_ORIGIN=https://kognitika.ru

# systemd service
# /etc/systemd/system/kognitika.service
[Unit]
Description=Kognitika App
After=network.target postgresql.service

[Service]
Type=simple
User=kognitika
WorkingDirectory=/opt/kognitika
ExecStart=/usr/bin/node dist/server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Deploy Steps
```bash
# На сервере (выполняется через SSH action)
cd /opt/kognitika
git fetch origin
git reset --hard origin/main
pnpm install --frozen-lockfile
pnpm build
systemctl restart kognitika
```

### Health Check
```bash
# Ожидаемый ответ /api/health
{
  "status": "ok",
  "timestamp": "2026-07-29T12:00:00.000Z",
  "uptime": 12345,
  "buildId": "a1b2c3d",      # short git hash
  "version": "1.2.3",
  "db": "connected"
}
```

---

## 3. Android Build (`.github/workflows/android.yml`)

### Триггеры
```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      release:
        type: boolean
        description: 'Build signed release AAB'
        default: false
```

### Jobs

| Job | Условие | Артефакт |
|---|---|---|
| **debug** | always | `kognitika-debug.apk` → GitHub Release `android-latest` |
| **release** | `inputs.release == true` | `kognitika-release.aab` → GitHub Release `android-release-v{version}` |

### Debug APK (Rolling)
- Каждый push в `main` обновляет Release `android-latest`
- **Скачать**: https://github.com/xodapi/kognitika/releases/tag/android-latest
- Размер: ~4.8 MB

### Release AAB (Signed)
**Secrets требуемые**:
| Secret | Описание |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Base64 encoded `.jks` / `.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | Пароль keystore |
| `ANDROID_KEY_ALIAS` | Алиас ключа |
| `ANDROID_KEY_PASSWORD` | Пароль ключа |

```yaml
- name: Decode keystore
  run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > keystore.jks

- name: Build AAB
  run: ./gradlew bundleRelease -Pandroid.keystore=keystore.jks ...
```

---

## 4. Security & Dependencies

### Dependabot (`.github/dependabot.yml`)
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
    labels: ["dependencies", "npm"]
    groups:
      dev-deps:
        patterns: ["*eslint*", "*prettier*", "*vitest*", "*playwright*"]
        update-types: ["minor", "patch"]
```

### CodeQL Analysis (`.github/workflows/codeql.yml`)
```yaml
on:
  schedule:
    - cron: '0 3 * * 1'  # weekly Monday 3am
  push:
    branches: [main]
jobs:
  analyze:
    uses: github/codeql-action/analyze@v3
    with:
      languages: ['javascript', 'typescript']
```

---

## 5. Branch Protection & PR Rules

### Branch Protection (main)
| Rule | Setting |
|---|---|
| Require PR reviews | 1 approval |
| Dismiss stale reviews | Yes |
| Require status checks | `lint`, `test`, `build`, `e2e` |
| Require branches up to date | Yes |
| Require linear history | Yes |
| Include admins | Yes |

### PR Template (`.github/PULL_REQUEST_TEMPLATE.md`)
```markdown
## Описание
<!-- Что и зачем -->

## Тип изменений
- [ ] Bug fix
- [ ] Feature
- [ ] Refactor
- [ ] Docs
- [ ] Config

## Чек-лист
- [ ] `pnpm lint` проходит
- [ ] `pnpm test` проходит, что подтверждено текущим CI run
- [ ] `pnpm build` проходит
- [ ] E2E тесты пройдены (или `skip-e2e` label)
- [ ] Документация обновлена (wiki / README)
- [ ] Нет breaking changes (или описаны в CHANGELOG)

## Скриншоты / Видео (если UI)
```

---

## 6. Environment Variables (GitHub Secrets)

| Secret | Scope | Описание |
|---|---|---|
| `DEPLOY_SSH_KEY` | Repository | Private key для SSH на прод сервер |
| `DEPLOY_HOST` | Repository | IP/hostname прод сервера |
| `DEPLOY_USER` | Repository | SSH user (обычно `kognitika`) |
| `ANDROID_KEYSTORE_BASE64` | Repository | Base64 keystore для release |
| `ANDROID_KEYSTORE_PASSWORD` | Repository | Пароль keystore |
| `ANDROID_KEY_ALIAS` | Repository | Алиас ключа |
| `ANDROID_KEY_PASSWORD` | Repository | Пароль ключа |
| `CODECOV_TOKEN` | Repository | Codecov upload token |
| `SENTRY_DSN` | Repository | Sentry DSN для error tracking |
| `TELEGRAM_BOT_TOKEN` | Repository | Бот для уведомлений |
| `TELEGRAM_ADMIN_CHAT_ID` | Repository | Chat ID для алертов |

---

## 7. Notifications

### Telegram (`.github/workflows/notify.yml`)
```yaml
on:
  workflow_run:
    workflows: ["CI", "Deploy", "Android"]
    types: [completed]

jobs:
  notify:
    if: ${{ failure() }}
    steps:
      - uses: appleboy/telegram-action@master
        with:
          to: ${{ secrets.TELEGRAM_ADMIN_CHAT_ID }}
          token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          message: |
            🚨 ${{ github.workflow }} failed
            Repo: ${{ github.repository }}
            Branch: ${{ github.ref }}
            Run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

---

## 8. Rollback Procedure

### Автоматический (при failed health-check)
```yaml
# в deploy.yml
- name: Rollback on health check failure
  if: failure()
  run: |
    ssh ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} "
      cd /opt/kognitika &&
      git log --oneline -5 &&
      git reset --hard HEAD~1 &&
      pnpm install --frozen-lockfile &&
      pnpm build &&
      systemctl restart kognitika
    "
```

### Ручной (GitHub UI)
1. Actions → Deploy → последнее успешное → **Re-run jobs**
2. Или: `git revert <bad-commit> && git push origin main`

---

## 9. Мониторинг CI/CD

| Метрика | Target | Alert |
|---|---|---|
| CI Duration | < 8 мин | > 15 мин → Telegram |
| Deploy Duration | < 3 мин | > 10 мин → Telegram |
| CI Success Rate | > 95% | < 90% за неделю → Issue |
| Deploy Success Rate | > 99% | < 95% → Page |
| E2E Flakiness | 0% | > 2 flakes/week → Issue |

---

## 10. Локальная проверка перед пушем

```bash
# Полный цикл CI локально
pnpm lint && pnpm test --run && pnpm build && pnpm test:e2e

# Быстрая проверка (только lint + typecheck)
pnpm lint && pnpm tsc --noEmit
```

---

## Файлы конфигурации

| Путь | Назначение |
|---|---|
| `.github/workflows/ci.yml` | Основной CI |
| `.github/workflows/deploy.yml` | Production Deploy |
| `.github/workflows/android.yml` | Android APK/AAB |
| `.github/workflows/codeql.yml` | Security Analysis |
| `.github/workflows/notify.yml` | Telegram Notifications |
| `.github/dependabot.yml` | Auto-updates |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR Template |
| `.github/ISSUE_TEMPLATE/` | Bug/Feature templates |
