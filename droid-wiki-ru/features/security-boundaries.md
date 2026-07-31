# Границы безопасности (Security Boundaries)

**Политика**: `SECURITY.md` · **Тесты**: 8 privacy/security contracts · **Модель угроз**: Privacy-first, zero-PII архитектура

---

## Security Boundaries (Enforced by Tests)

| Граница | Тест | Описание |
|---|---|---|
| **Brain ID Auth** | `app-identity-privacy` | Публичная аутентификация только через Brain ID. Email/password — legacy, явно отгейтованы (410 Gone). |
| **JWT Verification** | `admin-route-privacy` | ADMIN роль проверяется серверно; не доверяется полю в JWT. |
| **CORS Allowlist** | `cors-config` | `CORS_ORIGIN` — comma-separated allowlist. Wildcard требует `CORS_ALLOW_DEV_WILDCARD=true`, только dev. Продакшн без allowlist = fail-closed. |
| **Analytics Export Privacy** | `analytics-export-privacy` | `/api/analytics/export`: нет сырого Brain ID, email, токенов, хэшей, UUID сессий, точных таймстемпов. `privacy.safe_for_external_llm: true`. |
| **Socket.io Trust** | `socket-duels` | Аутентификация сокетов, серверная проверка членства в матче, клетки на основе evidence. |
| **Privacy Guard Middleware** | `privacy-sanitizers` | `privacyGuard` middleware + сериализаторы в `src/server/middleware/privacy.ts` вырезают PII из всех API-ответов. |
| **Logging Privacy** | `logging-privacy` | `safeError` / `createSafeLogger` в `src/lib/safe-logger.ts` маскируют Brain ID, email, токены, хэши в логах. |
| **Legacy Email Audit** | `legacy-email-audit` | Публичный UI Brain ID-only; email/password контролы не рендерятся. |
| **AnalyzeSession PII Guard** | `analyze-session-core` | Rust/TS: вход сканируется на `SENSITIVE_KEYS` до десериализации. Ошибка `SensitiveField`. |

---

## Детали границ

### 1. Brain ID Auth Boundary
```typescript
// src/server/routes/auth.ts
router.post('/register', emailAuthDisabled);  // 410 Gone
router.post('/login', emailAuthDisabled);     // 410 Gone
router.post('/magic-link', emailAuthDisabled);
router.post('/verify-magic', emailAuthDisabled);

// Только Brain ID:
router.post('/brain', createBrainSession);    // POST /api/auth/brain
router.post('/restore', restoreBrainSession); // POST /api/auth/restore
```

**Тест**: `app-identity-privacy.test.tsx` — проверяет, что `/register`, `/login`, `/magic-link`, `/verify-magic` возвращают 410 с кодом `email_auth_disabled`.

---

### 2. JWT Role Verification
```typescript
// src/server/middleware/requireAdmin.ts
export async function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);

  // НЕ доверяем decoded.role
  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  req.user = user;
  next();
}
```

**Тест**: `admin-route-privacy.test.tsx` — создаёт JWT с `role: 'ADMIN'` но пользователь в БД `role: 'USER'` → 403.

---

### 3. CORS Allowlist
```typescript
// src/server/middleware/cors.ts
const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || [];
const allowDevWildcard = process.env.CORS_ALLOW_DEV_WILDCARD === 'true';

if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
  throw new Error('CORS_ORIGIN required in production');
}
```

**Тест**: `cors-config.test.ts` — проверяет: production без allowlist = ошибка запуска; dev с wildcard работает только при флаге.

---

### 4. Analytics Export Privacy
```typescript
// src/server/routes/analytics.ts
export function createPrivacySafeAnalyticsExport(sessions, historyTruncated) {
  // ... агрегация ...
  return {
    format: 'Kognitika Privacy-Safe Cognitive Analytics',
    version: '2.0',
    privacy: {
      personal_identifiers_included: false,
      raw_session_data_included: false,
      exact_activity_timestamps_included: false,
      safe_for_external_llm: true
    },
    // ... modules, aggregate ...
  };
}
```

**Тест**: `analytics-export-privacy.test.ts` — парсит весь JSON экспорта, проверяет отсутствие:
- `brainId` (любой вложенности)
- `email`
- `token` / `jwt` / `authorization` / `bearer`
- `password` / `hash`
- `sessionId` (UUID)
- `createdAt` / `updatedAt` (точные таймстемпы)
- `raw_session_data_included: true`

---

### 5. Socket.io Trust (Duels)
```typescript
// src/server/socket/duels.ts
socket.on('duel:join', async ({ duelId }, callback) => {
  const userId = socket.user.id; // из JWT в handshake.auth
  const duel = await prisma.duel.findUnique({ where: { id: duelId } });

  // Серверная проверка членства
  if (duel.creatorId !== userId && duel.opponentId !== userId) {
    return callback({ error: 'Not a participant' });
  }
  // ...
});

socket.on('duel:action', ({ cellId, reactionMs, tMs }, callback) => {
  // Evidence-based validation: пересчёт по seed
  const expected = computeExpected(duel.seed, cellId);
  if (!expected) return callback({ error: 'Invalid cell' });
  // ...
});
```

**Тест**: `socket-duels.test.ts` — подключение без JWT, чужой duelId, фейковые actions → все отклонены.

---

### 6. Privacy Guard Middleware
```typescript
// src/server/middleware/privacy.ts
export function privacyGuard(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === 'object') {
      sanitizeResponse(body); // рекурсивно вырезает PII
    }
    return originalJson(body);
  };
  next();
}

function sanitizeResponse(obj) {
  const sensitiveKeys = ['brainId', 'email', 'token', 'password', 'hash', 'jwt', 'authorization'];
  for (const key of Object.keys(obj)) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitizeResponse(obj[key]);
    }
  }
}
```

**Тест**: `privacy-sanitizers.test.ts` — мокает ответы с PII на разных уровнях вложенности → проверяет удаление.

---

### 7. Logging Privacy
```typescript
// src/lib/safe-logger.ts
export function safeError(error) {
  if (!error) return 'unknown';
  const msg = error.message || String(error);
  return msg
    .replace(/[a-f0-9-]{36}/gi, '[UUID]')           // Brain ID / UUID
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+/gi, '[EMAIL]')
    .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi, '[JWT]')
    .replace(/\$2[aby]\$\d+\$[./A-Za-z0-9]{53}/gi, '[HASH]');
}

export function createSafeLogger(prefix) {
  return {
    info: (msg, meta) => console.log(`[${prefix}]`, msg, sanitize(meta)),
    error: (msg, meta) => console.error(`[${prefix}]`, msg, safeError(meta?.error)),
    warn: (msg, meta) => console.warn(`[${prefix}]`, msg, sanitize(meta)),
  };
}
```

**Тест**: `logging-privacy.test.ts` — проверяет маскирование в логах.

---

### 8. AnalyzeSession PII Guard (Rust + TS)
```rust
// crates/kognitika-core/src/lib.rs
const SENSITIVE_KEYS: [&str; 14] = [
    "authorization", "auth", "bearer", "brainid", "cookie",
    "email", "jwt", "localstorage", "password", "rawstorage",
    "refresh", "screenshot", "secret", "token"
];

pub fn parse_analyze_session_input(value: Value) -> Result<AnalyzeSessionInput, AnalyzeSessionError> {
    if has_sensitive_key(&value) {
        return Err(AnalyzeSessionError::SensitiveField);
    }
    // ... десериализация ...
}
```

**Тест**: `analyze-session-core.test.ts` (TS) + `lib.rs` (Rust mod tests) — payloads с `brainId`, `token`, `localStorage` в разных местах → `SensitiveField` error.

---

## Runtime Security Notes

| Мера | Статус |
|---|---|
| **Firebase полностью выведен** | ✅ (историческая причина: Brain ID + Prisma + PostgreSQL — активный путь) |
| **PWA/offline** | ⏸️ Отключено до acceptance gates в `docs/pwa-offline-strategy.md` |
| **Rust/WASM hot-path** | ⏸️ Не начинается без frame-budget gate в `docs/frame-budget-benchmark.md` |
| **Legacy email функции** | 🔒 Отгейтованы явно (410 Gone) |
| **Прямые правки на проде** | 🚫 Запрещены вне задокументированного hotfix-протокола (см. [Деплой](deployment.md#emergency-hotfix-protocol)) |
| **Secrets в коде** | 🚫 Никогда не коммитятся (`.env.example` для reference) |

---

## Vulnerability Reporting

> **Private repo**. Если найдена уязвимость — **не открывайте публичный Issue**. Сообщите приватно владельцу репозитория.

При отчёте укажите:
- Описание уязвимости
- Шаги воспроизведения (PoC предпочтительно)
- Затронутые компоненты (API, auth, storage, etc.)
- Потенциальное влияние

---

## Security Documentation

- `SECURITY.md` — политика ответственного раскрытия и security boundaries
- `docs/brain-id-identity.md` — границы хранения/восстановления Brain ID
- `docs/feedback-operations.md` — операторская верификация feedback
- `docs/privacy-model.md` — детальная модель приватности (data flow, retention, deletion)
