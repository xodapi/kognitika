# Brain ID — Анонимная идентичность

**Маршрут**: `/auth/brain` (инициализация) · `/auth/restore` (восстановление) · **Хранилище**: PostgreSQL (Prisma) · **Токен**: JWT (365 дней)

---

## Архитектура

Brain ID — это **privacy-first** идентификация. Никаких email, паролей, телефонных номеров. Пользователь получает уникальный токен (`brainId`) и сгенерированный псевдоним.

| Поле | Источник | Назначение |
|---|---|---|
| `brainId` | `crypto.randomUUID()` | Первичный ключ пользователя (UUID v4) |
| `pseudonym` | Детерминированная генерация из `brainId` | Отображаемое имя в лидербордах |
| `name` | = `pseudonym` | Поле `name` в БД |
| `email` | `null` | Отключено для публичных пользователей |
| `password` | `null` | Отключено (legacy гейтовано) |
| `experience` | `100` (welcome bonus) | Стартовый XP |
| `role` | `USER` | Роль |

---

## Инициализация сессии (`POST /api/auth/brain`)

```typescript
// Серверный код (src/server/routes/auth.ts)
const brainId = generateBrainId();        // crypto.randomUUID()
const pseudonym = generatePseudonym(brainId); // детерминированно из brainId

const user = await prisma.user.create({
  data: {
    brainId,
    pseudonym,
    name: pseudonym,
    email: null,
    experience: 100,
    role: 'USER',
    xpEvents: { create: { amount: 100, reason: 'Welcome Bonus' } }
  }
});

const token = signBrainToken(user); // JWT с brainId, role, identity: 'brain'
res.json({ token, brainId: user.brainId, pseudonym: user.pseudonym, user: serializeBrainUser(user) });
```

### Генерация псевдонима (`generatePseudonym`)

```typescript
const ADJECTIVES = ['Silent','Swift','Bright','Deep','Cold','Warm','Quick','Calm', ...]; // 32
const NOUNS = ['Falcon','Phoenix','Wolf','Hawk','Lion','Eagle','Tiger','Bear', ...]; // 32

function generatePseudonym(brainId: string): string {
  let hash = 0;
  for (let i = 0; i < brainId.length; i++) {
    hash = ((hash << 5) - hash) + brainId.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const adj = ADJECTIVES[absHash % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(absHash / ADJECTIVES.length) % NOUNS.length];
  const num = 1000 + (absHash % 9000);
  return `${adj}-${noun}-${num}`;
}
```

**Важно**: Один и тот же `brainId` **всегда** даёт один и тот же псевдоним. Это позволяет восстанавливать отображаемое имя без хранения его отдельно.

---

## Восстановление сессии (`POST /api/auth/restore`)

```json
// Request
{ "brainId": "550e8400-e29b-41d4-a716-446655440000" }

// Response (если найден)
{ 
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "brainId": "550e8400-e29b-41d4-a716-446655440000",
  "pseudonym": "Swift-Falcon-3847",
  "user": { "id": "...", "name": "Swift-Falcon-3847", "brainId": "...", "level": 3, ... }
}

// Response (если не найден) — 404
{ "error": "Session not found. Please check your Brain ID." }
```

---

## JWT Токен

```typescript
function signBrainToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      brainId: user.brainId,
      identity: 'brain',           // маркер: это Brain ID сессия
    },
    JWT_SECRET,
    { expiresIn: '365d' }
  );
}
```

**Payload**:
```json
{
  "id": "clx...",
  "role": "USER",
  "brainId": "550e8400-e29b-41d4-a716-446655440000",
  "identity": "brain",
  "iat": 1700000000,
  "exp": 1731536000
}
```

---

## Privacy Guard (Middleware)

Все API-ответы проходят через `privacyGuard` middleware (`src/server/middleware/privacy.ts`):

- Вырезает `brainId` из тела ответа (кроме эндпоинтов auth/profile)
- Маскирует email/tokens/hashes в логах (`safeError`, `createSafeLogger`)
- Удаляет точные таймстемпы активности из экспортов
- `safe_for_external_llm: true` в JSON-экспорте

---

## Legacy Email (отгейтовано)

Эндпоинты `/register`, `/login`, `/magic-link`, `/verify-magic` возвращают **410 Gone**:

```json
{
  "error": "Email authentication is disabled for public users. Use Brain ID.",
  "code": "email_auth_disabled"
}
```

Email/password хранятся в БД (`nullable`) только для админских аккаунтов и миграций.

---

## Мобильное приложение

- `BrainIdScreen` — отображает Brain ID и QR-код для бэкапа
- Кнопка «Копировать» / «Сохранить в заметки»
- При переустановке: ввод Brain ID → `POST /auth/restore` → полный профиль восстановлен

---

## Безопасность

| Мера | Реализация |
|---|---|
| **Нет PII** | Brain ID — UUID, псевдоним — детерминированный хеш |
| **Нет email/password** | Публичная регистрация только через `/auth/brain` |
| **JWT role check** | ADMIN роль проверяется серверно, не доверяется полю в токене |
| **Rate limit** | 100 req/15min на IP (настройка `RATE_LIMIT_MAX`) |
| **CORS allowlist** | `CORS_ORIGIN` comma-separated, wildcard только в dev |
| **Export privacy** | `analytics-export-privacy.test.ts` верифицирует отсутствие PII |

---

## Барометр Люшера (Pre/Post Luscher)

Brain ID сессия интегрирована с **цветовым тестом Люшера** (Luscher Test), который предлагается **до и после** каждой когнитивной тренировки для оценки эмоционального состояния и уровня стресса.

### Как это работает

| Этап | Назначение | Данные |
|---|---|---|
| **Pre-Luscher** (до игры) | Базовая линия эмоционального состояния: уровень стресса, автономия, текущие потребности | Последовательность из 8 цветов |
| **Тренировка** | Когнитивная нагрузка (Stroop, N-Back, Schulte и др.) | — |
| **Post-Luscher** (после игры) | Дельта состояния: как тренировка повлияла на стресс, фокус, восстановление | Последовательность из 8 цветов |

### API интеграция

В компоненте тренировки (например `StroopTest.tsx`):

```typescript
const [useLuscher, setUseLuscher] = useState(false);
const [showPreLuscher, setShowPreLuscher] = useState(false);
const [preSequence, setPreSequence] = useState<number[] | null>(null);

const handleStartClick = () => {
  if (useLuscher) {
    setShowPreLuscher(true);  // Сначала показываем Luscher
  } else {
    startGame();
  }
};

// В LuscherTest.tsx onFinish={(seq) => { setPreSequence(seq); startGame(); }}
```

### Что сохраняется

Результат (последовательность из 8 цветов) сохраняется в `metadata.preSequence` / `metadata.postSequence` сессии и доступен в экспорте для LLM-анализа динамики эмоционального состояния.

### Интерпретация (базовые правила)

| Параметр | Норма | Что означает отклонение |
|---|---|---|
| **Позиция Синего (1)** | 1–2 | > 3 = дефицит привязанности, тревога |
| **Позиция Зелёного (2)** | 1–3 | > 4 = потеря контроля, неадаптивность |
| **Позиция Красного (3)** | 2–4 | 1 = гиперактивность/агрессия; 5+ = астения |
| **Позиция Жёлтого (4)** | 2–5 | 1 = импульсивность; 6+ = безнадежность |
| **Позиция Чёрного (7)** | 7–8 | 1–3 = отказ от реальности, негативизм |
| **Позиция Серого (8)** | 7–8 | Ранний = апатия, деперсонализация |

**Коэффициент стресса (Luscher Stress Index)**:
```
Stress = Σ |позиция_проход1 - позиция_проход2| для всех 8 цветов
Norm: 8–14.  >20 = высокий стресс, неадаптивность
```

**Автономия** (Luscher Autonomy Index): позиция Зелёного + позиция Красного. Норма 3–6.

---

## Пример использования (CLI)

```bash
# 1. Создать сессию
curl -X POST https://kognitika.ru/api/auth/brain
# {"token":"...","brainId":"550e8400...","pseudonym":"Bright-Phoenix-7241",...}

# 2. Сохранить brainId
export BRAIN_ID="550e8400-e29b-41d4-a716-446655440000"

# 3. Использовать токен для авторизованных запросов
curl -H "Authorization: Bearer $TOKEN" https://kognitika.ru/api/dashboard/status

# 4. Восстановить на другом устройстве
curl -X POST https://kognitika.ru/api/auth/restore \
  -H "Content-Type: application/json" \
  -d "{\"brainId\":\"$BRAIN_ID\"}"
```
