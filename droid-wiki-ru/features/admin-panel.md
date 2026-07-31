# Админ-панель (Admin Panel)

**Маршрут**: `/admin` · **Компонент**: `AdminPanel` · **Доступ**: `role === 'ADMIN'` (серверная проверка) · **Домен**: Модерация · Аналитика · Конфигурация · Безопасность

---

## Архитектура безопасности

| Уровень | Реализация |
|---|---|
| **Маршрут** | `GET /admin` → middleware `requireAdmin` → 403 если не ADMIN |
| **API** | Все `/api/admin/*` → `requireAdmin` + rate limit (10 req/min) |
| **JWT** | `role: 'ADMIN'` проверяется серверно (не доверяется клиенту) |
| **Аудит** | Все действия логируются в `AdminAuditLog` (кто, что, когда, IP, userAgent) |
| **2FA** | Опционально: TOTP для админ-аккаунтов (настройка в профиле) |

---

## Вкладки админ-панели

### 1. 📊 Обзор (Dashboard)
| Метрика | Источник | Обновление |
|---|---|---|
| Активных пользователей (DAU/MAU) | `User.lastPlayedAt` | Real-time |
| Сессий за 24ч | `GameSession.createdAt` | 5 мин |
| Средний рейтинг | `AVG(User.rating)` | 1 час |
| Конверсия в дуэль | `Duels / Sessions` | 1 час |
| Ошибки (5xx) | Sentry / Logs | Real-time |
| Экспортов за неделю | `AnalyticsExportLog` | 1 час |
| Онбординг completion rate | `OnboardingState` | 1 час |

**Виджеты**: Line charts (DAU, Sessions), Bar charts (Modules health), Alerts (errors, failed exports)

---

### 2. 👥 Пользователи (Users)

#### Таблица (Server-side pagination, 50/page)
| Колонка | Сортировка | Фильтр |
|---|---|---|
| Псевдоним | ✓ | текст |
| Brain ID | ✓ | текст (prefix) |
| Уровень / XP | ✓ | число / диапазон |
| Рейтинг | ✓ | число / диапазон |
| Роль | ✓ | USER / ADMIN |
| Статус | ✓ | Активен / Заблокирован |
| Стрик дней | ✓ | число |
| Последняя активность | ✓ | дата / диапазон |
| Дата регистрации | ✓ | дата |

#### Массовые действия (Multi-select)
| Действие | Подтверждение | Аудит |
|---|---|---|
| Блокировать (Soft: `isActive=false`) | Да | `ADMIN_BAN` |
| Разблокировать | Да | `ADMIN_UNBAN` |
| Сброс рейтинга → 1000 | Да | `ADMIN_RATING_RESET` |
| Сброс стрика → 0 | Да | `ADMIN_STREAK_RESET` |
| Экспорт данных (GDPR) | Да | `ADMIN_EXPORT_USER` |
| Промоут в ADMIN | Да | `ADMIN_ROLE_CHANGE` |

#### Детальная карточка пользователя (Модалка)
| Вкладка | Содержимое |
|---|---|
| **Профиль** | Brain ID, псевдоним, роль, уровень, XP, рейтинг, стрик, цели онбординга |
| **Сессии** | Таблица: дата, модуль, счёт, время, точность, тренд (последние 50) |
| **Дуэли** | История: противник, модуль, результат, рейтинг-дельта |
| **Фидбек** | Список обращений с трекинг-номерами и статусами |
| **Идеи** | Предложения на Ideas Wall + голоса |
| **Экспорт** | Кнопка «Скачать JSON» → тот же формат что `/api/analytics/export` |

---

### 3. 🎮 Тренажёры (Trainers)

#### Таблица
| Поле | Источник | Редактирование |
|---|---|---|
| Название / ID | `KnowledgeArticle` + `moduleId` | — |
| Статус | `enabled` / `disabled` / `maintenance` | Toggle + Select |
| Сессий за неделю | `COUNT(GameSession WHERE gameType=module AND createdAt > now-7d)` | — |
| Средняя точность | `AVG(metadata.accuracy)` | — |
| Лучшее время / Счёт | `MIN/MAX` по модулю | — |
| Норматив (targetMs) | `KnowledgeArticle.normative` | Inline edit |
| Конфиг генератора | JSON в `TrainerConfig` | JSON editor (modal) |

#### Режим «Техническое обслуживание»
- Блокирует вход в модуль для всех кроме ADMIN
- Показывает баннер: «Модуль на обслуживании до 14:00 MSK»
- Логирует попытки входа

---

### 4. ⚔️ Дуэли (Duels)

#### Метрики (Real-time cards)
| Метрика | Описание |
|---|---|
| Активных лобби | `Duel WHERE status='waiting'` |
| В процессе | `Duel WHERE status='playing'` |
| Завершённых за 24ч | `Duel WHERE status='finished' AND finishedAt > now-24h` |
| Win rate по модулям | `WIN / TOTAL` group by `moduleId` |
| Античит флаги | `suspiciousPatternScore > 0.8` в дуэлях |

#### Таблица дуэлей
| Колонка | Фильтр |
|---|---|
| ID | текст |
| Модуль | select |
| Статус | waiting / ready / playing / finished / cancelled |
| Создатель | псевдоним |
| Противник | псевдоним |
| Победитель | псевдоним / — |
| Рейтинг-дельта | число |
| Создана / Завершена | дата |

#### Действия
| Действие | Описание |
|---|---|
| Force-finish | Принудительно завершить (если завис) → winner = creator |
| Бан от дуэлей | `User.duelBanned = true` (неделя/месяц/навсегда) |
| Сброс рейтинга дуэли | Отдельный рейтинг для дуэлей → 1000 |

---

### 5. 💬 Обратная связь (Feedback)

#### Фильтры
| Фильтр | Значения |
|---|---|
| Тип | IDEA / BUG / IMPROVEMENT / OTHER |
| Статус | OPEN / IN_REVIEW / NEEDS_INFO / RESOLVED / REJECTED |
| Дата | диапазон |
| Автор | псевдоним / Brain ID |

#### Массовые действия
| Действие | Детали |
|---|---|
| Назначить ответственного | Select admin → уведомление |
| Закрыть (RESOLVED) | Требует комментарий → уведомление юзера |
| Отклонить (REJECTED) | Требует причину |
| Экспорт в CSV | Все колонки + метаданные |

#### Ответ админа
- **Markdown-редактор** в модалке
- **Шаблоны**: «Воспроизвели, фикс в след. релизе», «Дубликат #123», «Не баг, фича»
- **Публикация** → `Feedback.adminReply` + `updatedAt` → пуш-уведомление пользователю (в модалке `/feedback/status`)

---

### 6. 💡 Идеи (Ideas Wall)

#### Статусы и бейджи
| Статус | Бейдж | Описание |
|---|---|---|
| `OPEN` | 🟢 | Сбор голосов |
| `PLANNED` | 🔵 | В дорожной карте (следующий спринт/квартал) |
| `IN_PROGRESS` | 🟣 | В разработке (PR открыт) |
| `IMPLEMENTED` | ✅ | В проде (ссылка на релиз/коммит) |
| `REJECTED` | ❌ | Не в скоупе / дубликат / тех. невозможно |

#### Алгоритм ранжирования
```
Score = votes * 1.0 + (daysSinceCreated * -0.1) + statusWeight
statusWeight: IMPLEMENTED=100, IN_PROGRESS=50, PLANNED=20, OPEN=0, REJECTED=-50
```

#### Админ-действия
| Действие | Детали |
|---|---|
| Сменить статус | Dropdown → авто-уведомление голосовавших |
| Админ-комментарий | Публичный (на стене) / Приватный (только админы) |
| Тэги | trainer, ui, analytics, mobile, social, meta |
| **GitHub Integration** | Кнопка «Create Issue» → авто-создание в `xodapi/kognitika` + ссылка на идею |

#### Roadmap View (Kanban)
```
BACKLOG (OPEN) → PLANNED → IN_PROGRESS → DONE (IMPLEMENTED)
     ↓              ↓            ↓              ↓
  [12]           [5]          [2]            [8]
```

---

### 7. 📈 Аналитика (Analytics)

#### Retention
| Метрика | Когорты | Период |
|---|---|---|
| Day 1 / 7 / 30 | по дате регистрации | Rolling 30 дней |
| Rolling retention | по неделям | 12 недель |
| Onboarding → Day 1 | completed onboarding | 7 дней |

#### Engagement
| Метрика | Формула |
|---|---|
| DAU / MAU ratio | `DAU / MAU` |
| Sessions per User | `Total Sessions / Active Users` |
| Avg Session Time | `AVG(timeMs) / 1000 / 60` (минуты) |
| Modules per Session | `AVG(DISTINCT modules per session)` |

#### Module Health (Funnel)
| Этап | Метрика |
|---|---|
| Открыт модуль | `PageView(module)` |
| Начат онбординг/демо | `OnboardingStep = demo` |
| Завершена 1-я сессия | `GameSession.isCompleted` |
| 5+ сессий | `COUNT(sessions) >= 5` |
| 30 дней активности | `sessions in last 30d > 0` |

#### Duels
| Метрика | Описание |
|---|---|
| Matchmaking latency | P50 / P95 времени поиска оппонента |
| Rematch rate | `Duels with rematch / Total finished` |
| Rating inflation | `AVG(rating) trend over 30d` |

#### Export Stats
| Метрика | Период |
|---|---|
| Экспортов за неделю | `COUNT(AnalyticsExportLog)` |
| Средних модулей на экспорт | `AVG(modules_with_data)` |
| LLM-ready exports | `COUNT(WHERE safe_for_external_llm = true)` |

#### Errors (Sentry Integration)
| Колонка | Источник |
|---|---|
| Message | Sentry event |
| Count | Sentry count |
| Affected Users | Sentry users |
| Trend | 7d sparkline |
| Link | Sentry issue URL |

---

### 8. ⚙️ Конфигурация (Config)

#### Параметры (Hot-reload без рестарта)
| Параметр | Тип | Default | Описание |
|---|---|---|---|
| `RATE_LIMIT_MAX` | number | 100 | Requests per window |
| `RATE_LIMIT_WINDOW_MS` | number | 900000 | Window (15 min) |
| `CORS_ORIGIN` | string | `https://kognitika.ru` | Comma-separated allowlist |
| `CORS_ALLOW_DEV_WILDCARD` | boolean | false | Dev only |
| `JWT_EXPIRES_IN` | string | `365d` | Token TTL |
| `REFRESH_TOKEN_EXPIRES_IN` | string | `30d` | Refresh TTL |
| `MAX_EXPORT_SESSIONS` | number | 1000 | Лимит сессий в экспорте |
| `DUES_MATCHMAKING_TIMEOUT` | number | 30000 | ms to find opponent |
| `WELCOME_XP_BONUS` | number | 100 | XP за регистрацию |
| `DEMO_XP_BONUS` | number | 50 | XP за демо-сессию |
| `DAILY_TASK_XP` | object | `{schulte: 100, nback: 150...}` | XP за ежедневные задания |
| `STREAK_XP_MULTIPLIER` | number | 1.25 | Множитель XP за стрик > 7 |
| `DUES_ELO_K_FACTOR` | number | 32 | K-factor для дуэлей |
| `ONBOARDING_DEMO_MODULE` | string | `SCHULTE` | Модуль для демо |
| `MAINTENANCE_MODE` | boolean | false | Глобальный maintenance |

#### Редактирование
- **Inline-edit** в таблице → `PATCH /api/admin/config` → `ConfigService.reload()` → event `config:updated` → все подключённые клиенты получают новый конфиг через Socket.io

---

### 9. 🔧 Система (System)

#### Build Info
| Поле | Значение |
|---|---|
| Version | `package.json` version |
| Git Commit | `git rev-parse HEAD` (short) |
| Build Time | ISO timestamp |
| Node Version | `process.version` |
| Platform | `process.platform` / `process.arch` |

#### DB Stats (PostgreSQL)
| Таблица | Ряды | Размер | Индексы |
|---|---|---|---|
| `User` | N | X MB | 5 |
| `GameSession` | N | X MB | 4 |
| `Duel` | N | X MB | 3 |
| `Feedback` | N | X MB | 2 |
| `Idea` / `IdeaVote` | N | X MB | 2 |
| `AdminAuditLog` | N | X MB | 1 |

**Slow Queries**: Top 10 по `pg_stat_statements` (если включено)

#### Redis / Cache
| Метрика | Значение |
|---|---|
| Hit Rate | `keyspace_hits / (hits + misses)` |
| Memory Used | `used_memory_human` |
| Connected Clients | `connected_clients` |
| Expired Keys | `expired_keys` |

#### Socket.io
| Метрика | Значение |
|---|---|
| Connected Clients | `io.engine.clientsCount` |
| Rooms | `io.sockets.adapter.rooms.size` |
| Messages/sec (last 1m) | Custom counter |

#### Logs
- **Last 100 Errors**: Structured logs (level=error) + Sentry link
- **Search**: по message, userId, moduleId, traceId
- **Export**: JSON Lines для ELK

#### Maintenance Mode
- **Toggle** → `MAINTENANCE_MODE = true`
- **Effect**: Все не-ADMIN получают 503 + кастомная страница с сообщением и ETA
- **Whitelist**: IP-адреса (CIDR) для доступа во время обслуживания

---

## API (Admin Routes)

```typescript
// Все требуют Authorization: Bearer <admin_jwt>

// Users
GET    /api/admin/users?page=1&limit=50&search=&role=&active=&sort=-createdAt
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id { isActive, role, rating, level, streakDays }
POST   /api/admin/users/:id/export-gdpr
POST   /api/admin/users/:id/ban { reason, durationDays }
POST   /api/admin/users/:id/unban

// Trainers
GET    /api/admin/trainers
PATCH  /api/admin/trainers/:moduleId { enabled, maintenance, config, normative }

// Duels
GET    /api/admin/duels?status=&moduleId=&page=
POST   /api/admin/duels/:id/force-finish { winnerId }
POST   /api/admin/duels/:id/cancel

// Feedback
GET    /api/admin/feedback?type=&status=&page=
PATCH  /api/admin/feedback/:id { status, adminReply }

// Ideas
GET    /api/admin/ideas?status=&tag=&page=
PATCH  /api/admin/ideas/:id { status, adminComment, tags }
POST   /api/admin/ideas/:id/github-issue  // создаёт Issue в GitHub

// Config
GET    /api/admin/config
PATCH  /api/admin/config { key: value }

// Analytics
GET    /api/admin/analytics/retention?days=30
GET    /api/admin/analytics/modules
GET    /api/admin/analytics/duels
GET    /api/admin/analytics/exports
GET    /api/admin/analytics/errors

// System
GET    /api/admin/system/build-info
GET    /api/admin/system/db-stats
GET    /api/admin/system/redis-stats
GET    /api/admin/system/socket-stats
GET    /api/admin/system/logs?level=error&limit=100
POST   /api/admin/system/maintenance { enabled: true, message, eta, whitelistIps }
```

---

## Страница на сайте

| Страница | URL | Компонент | Auth |
|---|---|---|---|
| **Админ-панель** | https://kognitika.ru/admin | `AdminPanel` | ADMIN |

---

## Компоненты и файлы

| Путь | Назначение |
|---|---|
| `src/components/AdminPanel.tsx` | Основной контейнер (Tabs, Layout) |
| `src/components/admin/*` | Вкладки: UsersTable, TrainersTable, DuelsTable, FeedbackTable, IdeasTable, AnalyticsDashboard, ConfigEditor, SystemInfo |
| `src/hooks/useAdmin.ts` | Состояние, API вызовы, права доступа |
| `src/server/routes/admin.ts` | REST API (все `/api/admin/*`) |
| `src/server/middleware/requireAdmin.ts` | Middleware проверки роли |
| `src/server/services/admin-audit.ts` | Логирование действий админа |
| `src/server/services/admin-config.ts` | Hot-reload конфига, валидация |
| `src/lib/admin-config.ts` | Схема конфига (Zod), дефолты, типы |
