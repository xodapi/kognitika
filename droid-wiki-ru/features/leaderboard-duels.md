# Рейтинг лидеров (Leaderboard) и Дуэли

**Маршруты**: `/leaderboard` (рейтинг), `/duels` (дуэли) · **Real-time**: Socket.io · **Домен**: Социальное сравнение + Соревновательная мотивация

---

## Рейтинг лидеров (Leaderboard)

### Назначение
Публичная таблица рейтинга пользователей для **социального сравнения** (Festinger, 1954) и **внешней мотивации**. Пользователи видят своё положение и топ-N других.

### Как работает
| Элемент | Реализация |
|---|---|
| **Метрика рейтинга** | `User.rating` (начинается с 1000, Elo-like) |
| **Сортировка** | По убыванию `rating`, затем по `experience` |
| **Обновление** | После каждой завершённой сессии + дуэли |
| **Псевдоним** | `User.pseudonym` (Brain ID-based, детерминированный) |
| **Пагинация** | Топ-50 на странице, кнопка «Загрузить ещё» |

### API
```typescript
// GET /api/leaderboard?page=1&limit=50
// Response
{
  "entries": [
    { "rank": 1, "pseudonym": "Swift-Falcon-7421", "rating": 1847, "level": 12, "experience": 45230 },
    { "rank": 2, "pseudonym": "Bright-Phoenix-3847", "rating": 1792, "level": 11, "experience": 38910 }
  ],
  "userRank": 42,        // ранг текущего пользователя (если авторизован)
  "totalUsers": 1247
}
```

### Рейтинговая формула (Elo-adapted)
```
Новый рейтинг = Старый + K × (Фактический результат - Ожидаемый результат)

K = 32 (новые) → 16 (erfahrung > 1000) → 8 (rating > 2000)
Ожидаемый результат = 1 / (1 + 10^((opponent_rating - my_rating) / 400))
```
- **Победа в дуэли**: +12–24 рейтинга
- **Поражение в дуэли**: -8–16 рейтинга
- **Соло-сессия** (бест-скор): +1–5 рейтинга (бонусы за streak, точность)

---

## Дуэли (Real-time PvP)

### Назначение
**Синхронные когнитивные битвы** в реальном времени через Socket.io. Два игрока одновременно проходят один и тот же модуль — побеждает лучший результат.

### Поддерживаемые модули
| Модуль | Идентификатор | Особенности дуэли |
|---|---|---|
| Таблицы Шульте | `SCHULTE` | 5×5, классика, 60с лимит |
| Эффект Струпа | `STROOP` | 45 сек, счёт правильных |
| N-Back | `N_BACK` | 15 раундов, d-prime |
| Ментальная арифметика | `MENTAL_MATH` | Уровень 1, 20 вопросов |
| Таблица Алфавит | `ALPHABET_TABLE` | Balanced preset |

### Жизненный цикл дуэли
```
1. CREATE     → POST /api/duels/create { moduleId }
   → сервер создаёт Duel{id, status: "waiting", creatorId, moduleId, seed}
   
2. JOIN       → Socket.io "duel:join" { duelId }
   → второй игрок подключается, статус → "ready", генерируется общий seed
   
3. START      → Socket.io "duel:start" { seed, grid, timeLimit }
   → оба клиента стартуют одновременно (server-authoritative time)
   
4. PLAY       → клиенты шлют "duel:action" { cellId, reactionMs }
   → сервер валидирует (evidence-based), обновляет прогресс
   
5. FINISH     → Socket.io "duel:finish" { winnerId, scores, ratingDelta }
   → рейтинг обновляется, создаётся GameSession для каждого
   
6. REMATCH    → кнопка «Реванш» → новый seed, тот же соперник
```

### Socket.io события
| Событие | Направление | Payload |
|---|---|---|
| `duel:create` | Client → Server | `{ moduleId: "SCHULTE" }` |
| `duel:join` | Client → Server | `{ duelId: "uuid" }` |
| `duel:state` | Server → Clients | `{ status, players: [{id, pseudonym, progress}], seed }` |
| `duel:action` | Client → Server | `{ cellId, reactionMs, tMs }` |
| `duel:progress` | Server → Clients | `{ playerId, progress: 0..1, score }` |
| `duel:finish` | Server → Clients | `{ winnerId, scores, ratingDelta, reason }` |
| `duel:rematch` | Client → Server | `{ duelId }` |
| `duel:cancel` | Client → Server | `{ duelId }` |

### Античит (Server-authoritative)
- **Seed** генерируется сервером → одинаковые условия для обоих
- **Evidence-based validation**: сервер пересчитывает реакцию по `tMs` и `seed`
- **Rate limit**: макс 1 action / 50мс на сокет
- **Timeout**: 60с на ход → авто-поражение
- **Reconnect**: 10с grace period, затем forfeit

### UI (DuelsView.tsx → DuelLobby → DuelArena)
- **Лобби**: список открытых дуэлей + кнопка «Создать» + поиск по модулю
- **Арена**: сплит-скрин (свой прогресс слева, враг справа — только аватар + прогресс-бар)
- **HUD**: таймер, счёт, streak-подсветка
- **Пост-матч**: рейтинг-дельта, кнопка «Реванш», «В лобби»

---

## Архитектура (Backend)

### Prisma модели
```prisma
model Duel {
  id          String   @id @default(cuid())
  moduleId    String   // GameType enum
  status      String   // "waiting" | "ready" | "playing" | "finished" | "cancelled"
  creatorId   String
  opponentId  String?
  seed        String   // deterministic generation
  winnerId    String?
  creatorScore   Int?
  opponentScore  Int?
  ratingDelta    Int?   // elo change for winner
  createdAt   DateTime @default(now())
  startedAt   DateTime?
  finishedAt  DateTime?
  
  @@index([status])
  @@index([creatorId])
  @@index([opponentId])
}
```

### Серверные файлы
| Файл | Назначение |
|---|---|
| `src/server/socket/duels.ts` | Socket.io handlers (create, join, action, finish) |
| `src/server/routes/duels.ts` | REST: create, list, history, stats |
| `src/server/services/duel-engine.ts` | Валидация ходов, расчёт рейтинга, генерация seed |
| `src/server/routes/leaderboard.ts` | GET /api/leaderboard, рейтинг пользователя |

---

## Метрики и аналитика

### Экспорт дуэлей
В JSON-экспорте (`/api/analytics/export`):
```json
{
  "moduleId": "duels",
  "displayName": "Дуэли",
  "sessions": 34,
  "wins": 21,
  "losses": 13,
  "winRate": 61.8,
  "avgRatingDelta": 8.4,
  "favoriteModule": "SCHULTE",
  "trend": "improving"
}
```

### Дуэль-специфичные метрики
| Метрика | Норматив |
|---|---|
| **Win Rate** | > 55% (активные), > 60% (топ) |
| **Avg Rating Delta** | +5..+15 за победу |
| **Avg Duel Duration** | 45–90 сек (зависит от модуля) |
| **Rematch Rate** | > 40% = высокая вовлечённость |

---

## Научная база

| Концепция | Применение в дуэлях |
|---|---|
| **Social Facilitation** (Zajonc, 1965) | Присутствие соперника улучшает простые задачи (Stroop, Schulte) |
| **Evaluation Apprehension** | Ожидание оценки повышает арousal → лучше на автоматизированных задачах |
| **Flow State** (Csikszentmihalyi) | Баланс вызов/навык → дуэль подбирает соперника по рейтингу |
| **Self-Determination Theory** | Компетентность (победа), автономность (выбор модуля), связанность (реванш) |

---

## Пример использования (CLI)

```bash
# 1. Создать дуэль (нужен JWT)
curl -X POST https://kognitika.ru/api/duels/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"moduleId":"SCHULTE"}'
# {"duelId":"abc123","status":"waiting","seed":"xyz789"}

# 2. В лобби — другой игрок присоединяется через UI

# 3. История дуэлей
curl -H "Authorization: Bearer $TOKEN" https://kognitika.ru/api/duels/history
# [{"id":"...","module":"SCHULTE","result":"win","ratingDelta":+18,"opponent":"Bright-Phoenix-3847","createdAt":"2026-07-29T..."}]

# 4. Рейтинг
curl https://kognitika.ru/api/leaderboard
# {"entries":[{"rank":1,"pseudonym":"Swift-Falcon-7421","rating":1847}],"userRank":42}
```

---

## Страницы на сайте

| Страница | URL | Компонент |
|---|---|---|
| **Рейтинг лидеров** | https://kognitika.ru/leaderboard | `LeaderboardView` |
| **Лобби дуэлей** | https://kognitika.ru/duels | `DuelsView` → `DuelLobby` |
| **Арена дуэли** | https://kognitika.ru/duels/[duelId] | `DuelArena` |
