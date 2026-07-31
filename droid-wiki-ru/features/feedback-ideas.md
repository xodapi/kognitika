# Обратная связь (Feedback) и Стена идей (Ideas Wall)

**Маршруты**: `/feedback` (модалка) · `/ideas` (IdeasWall) · **Компоненты**: `FeedbackModal`, `IdeasWall` · **Домен**: Пользовательский ввод · Модерация · Прозрачность

---

## Обратная связь (Feedback)

### Назначение
Канал связи **пользователь → команда** без email. Работает через Brain ID (анонимно, но трассируемо).

### Типы обращений (`FeedbackType`)
| Тип | Иконка | Назначение | SLA ответа |
|---|---|---|---|
| `IDEA` | 💡 | Предложение новой фичи / улучшение | 14 дней |
| `BUG` | 🐛 | Ошибка, баг, краш | 7 дней (critical: 48ч) |
| `IMPROVEMENT` | ⚙️ | Улучшение UX, баланса, контента | 14 дней |
| `OTHER` | 📝 | Вопрос, благодарность, жалоба | 14 дней |

### Flow пользователя
1. **Открыть**: кнопка «Обратная связь» в хедере / профиле / после сессии → `FeedbackModal`
2. **Выбрать тип** → заполнить текст (макс 2000 символов)
3. **Отправить** → `POST /api/feedback`
4. **Получить трекинг-номер**: `FB-2026-001234` (показывается в модалке)
4. **Проверить статус**: ввести трекинг-номер на `/feedback/status` или в модалке

### API

```typescript
// POST /api/feedback
// Body: { type: "BUG" | "IDEA" | "IMPROVEMENT" | "OTHER", content: string }
// Auth: Bearer JWT (Brain ID)
{
  "trackingNum": "FB-2026-001234",
  "status": "OPEN",
  "createdAt": "2026-07-29T14:30:00.000Z"
}
```

```typescript
// GET /api/feedback/status?trackingNum=FB-2026-001234
// Public (без auth)
{
  "trackingNum": "FB-2026-001234",
  "type": "BUG",
  "status": "IN_REVIEW",
  "adminReply": "Воспроизвели, фикс в следующем релизе",
  "updatedAt": "2026-07-29T16:00:00.000Z"
}
```

### Статусы (`FeedbackStatus`)
| Статус | Описание | Следующий |
|---|---|---|
| `OPEN` | Новый, не прочитан админом | `IN_REVIEW` |
| `IN_REVIEW` | Админ взял в работу / пишет ответ | `RESOLVED` / `NEEDS_INFO` |
| `NEEDS_INFO` | Нужен уточняющий вопрос пользователю | `OPEN` (после ответа) |
| `RESOLVED` | Исправлено / реализовано / ответ дан | — |
| `REJECTED` | Не баг / не в скоупе / дубликат | — |

### Админка (`AdminPanel` → вкладка Feedback)
- Таблица с фильтрами по типу, статусу, дате
- Массовые действия: назначить, закрыть, отклонить
- Встроенный редактор ответа (Markdown)
- Связь с `GameSession` (если отправлено после игры — видно moduleId, sessionId)

### Privacy
- **Нет email** — только Brain ID (UUID) + псевдоним
- **Tracking number** не содержит Brain ID (отдельный ID в БД)
- **Admins видят** псевдоним + Brain ID (для контекста), но не IP / UserAgent
- **Экспорт** в JSON не включает feedback (приватность)

---

## Стена идей (Ideas Wall)

### Назначение
Публичный 백лог идей: пользователи предлагают → голосуют → команда реализует. **Transparency by default**.

### Flow
1. **Предложить идею** (на `/ideas` → «Предложить»):
   - Заголовок (макс 100 символов)
   - Описание (макс 1500 символов)
   - Теги (опционально): `trainer`, `ui`, `analytics`, `mobile`, `social`, `meta`
2. **Голосовать**: 1 голос на идею на пользователя (`IdeaVote` unique constraint)
3. **Комментарии** (планируется): тред под идеей
4. **Статусы идеи** (`IdeaStatus`):
   | Статус | Бейдж | Описание |
   |---|---|---|
   | `OPEN` | 🟢 | Сбор голосов |
   | `PLANNED` | 🔵 | В ближайшем спринте / дорожной карте |
   | `IN_PROGRESS` | 🟣 | В разработке (PR открыт) |
   | `IMPLEMENTED` | ✅ | В проде (ссылка на релиз/коммит) |
   | `REJECTED` | ❌ | Не в скоупе / дубликат / технически невозможно |

### Алгоритм ранжирования (Ideas Wall)
```
Score = votes * 1.0 + (daysSinceCreated * -0.1) + (statusWeight)
statusWeight: IMPLEMENTED=100, IN_PROGRESS=50, PLANNED=20, OPEN=0, REJECTED=-50
```
Топ идеи всплывают, старые без активности тонут.

### API

```typescript
// GET /api/ideas?status=OPEN&sort=score&limit=50
// Public (для чтения стены)
{
  "ideas": [
    {
      "id": "clx...",
      "title": "Добавить режим 'Марафон' в Шульте",
      "description": "Серия из 5 таблиц подряд с накоплением усталости...",
      "tags": ["trainer", "schulte"],
      "status": "PLANNED",
      "votes": 47,
      "userVote": true,  // если авторизован
      "authorPseudonym": "Swift-Falcon-3847",
      "createdAt": "2026-07-15T...",
      "updatedAt": "2026-07-20T...",
      "adminComment": "Запланировано на v2.4 (август)"
    }
  ],
  "total": 124
}
```

```typescript
// POST /api/ideas (auth required)
{ "title": "...", "description": "...", "tags": ["trainer"] }
// 201 Created + idea object
```

```typescript
// POST /api/ideas/:id/vote (auth required)
// Toggle vote (POST again = remove)
{ "voted": true, "votes": 48 }
```

---

## Связь Feedback ↔ Ideas

| Ситуация | Автоматизация |
|---|---|
| Feedback type=IDEA + ≥10 голосов на Ideas Wall | Авто-создание Idea с автором Feedback |
| Admin меняет Idea статус → `IMPLEMENTED` | Уведомление голосовавших (Telegram/Email если включено) |
| Feedback type=BUG + статус=RESOLVED | Авто-закрытие связанных Ideas (если были) |

---

## Технические детали

### Prisma модели
```prisma
model Feedback {
  id           String        @id @default(cuid())
  userId       String
  type         FeedbackType  // IDEA, BUG, IMPROVEMENT, OTHER
  content      String
  trackingNum  String        @unique // FB-YYYY-NNNNNN
  status       FeedbackStatus @default(OPEN)
  adminReply   String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  user         User          @relation(fields: [userId], references: [id])
}

model Idea {
  id            String      @id @default(cuid())
  userId        String
  title         String
  description   String
  tags          String[]
  status        IdeaStatus  @default(OPEN)
  votes         Int         @default(0)
  adminComment  String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  user          User        @relation(fields: [userId], references: [id])
  ideaVotes     IdeaVote[]
}

model IdeaVote {
  id        String  @id @default(cuid())
  userId    String
  ideaId    String
  createdAt DateTime @default(now())
  user      User    @relation(fields: [userId], references: [id])
  idea      Idea    @relation(fields: [ideaId], references: [id])
  @@unique([userId, ideaId])
}
```

### Безопасность
- **Rate limit**: 5 feedback/день, 3 ideas/день, 20 votes/день на Brain ID
- **Content moderation**: простой profanity filter + admin review для PUBLIC контента (Ideas)
- **No PII**: Brain ID не экспонируется в публичном API Ideas/Feedback status

---

## Страницы на сайте

| Страница | URL | Компонент | Auth |
|---|---|---|---|
| **Стена идей** | https://kognitika.ru/ideas | `IdeasWall` | Optional (read) / Required (vote/create) |
| **Обратная связь** | https://kognitika.ru/feedback (модалка) | `FeedbackModal` | Required |
| **Статус обращения** | https://kognitika.ru/feedback/status | `FeedbackStatus` | Public (trackingNum) |
| **Админка: Feedback** | https://kognitika.ru/admin?tab=feedback | `AdminPanel` | ADMIN |
| **Админка: Ideas** | https://kognitika.ru/admin?tab=ideas | `AdminPanel` | ADMIN |

---

## Метрики (для аналитики команды)

| Метрика | Целевое значение |
|---|---|
| Feedback response time (median) | < 48ч для BUG, < 7 дней для остального |
| Idea → Implemented conversion | > 15% от OPEN за квартал |
| User participation (votes/MAU) | > 20% |
| Feedback satisfaction (post-resolve survey) | > 4.0 / 5.0 |
