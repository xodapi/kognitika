# API Reference (OpenAPI 3.1)

**Spec**: `/api/docs` (Scalar UI) · **Source**: Zod schemas → `@asteasolutions/zod-to-openapi` · **CI**: `pnpm openapi:generate`

---

## Быстрый старт

```bash
# Генерация спеки (dev)
pnpm openapi:generate

# Просмотр в браузере
pnpm openapi:serve  # http://localhost:3006/api/docs

# Валидация
pnpm openapi:validate
```

---

## Архитектура генерации

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Zod Schemas    │────►│  zod-to-openapi  │────►│  OpenAPI 3.1    │
│  (src/lib/      │     │  (scripts/       │     │  (dist/openapi. │
│   schemas/)     │     │   generate.ts)   │     │   json)         │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │  Scalar /       │
                                                 │  Redocly UI     │
                                                 └─────────────────┘
```

---

## Источники схем (Single Source of Truth)

| Домен | Файл | Экспорты |
|---|---|---|
| **Auth** | `src/lib/schemas/auth.ts` | `BrainIdSchema`, `RestoreSchema`, `TokenResponse` |
| **Game** | `src/lib/schemas/game.ts` | `GameSessionSchema`, `SaveSessionInput`, `SessionResult` |
| **Analytics** | `src/lib/schemas/analytics.ts` | `ExportRequest`, `ExportResponse`, `ProfileResponse` |
| **Duels** | `src/lib/schemas/duels.ts` | `CreateDuelInput`, `JoinDuelInput`, `DuelAction`, `DuelState` |
| **Feedback** | `src/lib/schemas/feedback.ts` | `FeedbackInput`, `FeedbackResponse`, `TrackingNumber` |
| **Ideas** | `src/lib/schemas/ideas.ts` | `IdeaInput`, `VoteInput`, `IdeaStatus` |
| **SymbolChat** | `src/lib/schemas/symbolchat.ts` | `PostInput`, `ReactionInput`, `FeedQuery` |
| **Admin** | `src/lib/schemas/admin.ts` | `AdminUserUpdate`, `ConfigPatch`, `AuditLogEntry` |

---

## Пример схемы (Zod → OpenAPI)

### `src/lib/schemas/game.ts`
```typescript
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const GameSessionSchema = z.object({
  id: z.string().cuid().openapi({ example: 'clx123abc456' }),
  userId: z.string().cuid(),
  gameType: z.enum([
    'SCHULTE', 'STROOP', 'NBACK', 'MENTAL_MATH', 'TYPING',
    'ALPHABET_TABLE', 'SPATIAL', 'STROOP_ALPHABET', 'LUSCHER'
  ]).openapi({ description: 'Тип тренажёра' }),
  startedAt: z.number().int().positive().openapi({ example: 1700000000000 }),
  completedAt: z.number().int().positive().nullable(),
  score: z.number().int().nonnegative().nullable(),
  accuracy: z.number().min(0).max(1).nullable(),
  durationMs: z.number().int().positive().nullable(),
  metadata: z.record(z.unknown()).openapi({ description: 'Модуль-специфичные данные' }),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
}).openapi('GameSession');

export const SaveSessionInput = z.object({
  gameType: GameSessionSchema.shape.gameType,
  startedAt: GameSessionSchema.shape.startedAt,
  completedAt: GameSessionSchema.shape.completedAt,
  score: GameSessionSchema.shape.score,
  accuracy: GameSessionSchema.shape.accuracy,
  durationMs: GameSessionSchema.shape.durationMs,
  metadata: GameSessionSchema.shape.metadata,
}).openapi('SaveSessionInput');

export type GameSession = z.infer<typeof GameSessionSchema>;
export type SaveSessionInput = z.infer<typeof SaveSessionInput>;
```

---

## Генерация (`scripts/generate-openapi.ts`)

```typescript
import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { GameSessionSchema, SaveSessionInput } from '../src/lib/schemas/game';
import { BrainIdSchema, TokenResponse } from '../src/lib/schemas/auth';
// ... import all schemas

const generator = new OpenApiGeneratorV31({
  components: {
    schemas: {
      GameSession: GameSessionSchema,
      SaveSessionInput: SaveSessionInput,
      BrainId: BrainIdSchema,
      TokenResponse,
      // ... all schemas
    },
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  info: {
    title: 'Kognitika API',
    version: '1.0.0',
    description: 'Cognitive training platform API',
    contact: { name: 'Kognitika Team', url: 'https://kognitika.ru' },
    license: { name: 'MIT' },
  },
  servers: [
    { url: 'https://kognitika.ru', description: 'Production' },
    { url: 'http://localhost:3006', description: 'Development' },
  ],
});

const spec = generator.generateDocument({
  paths: {
    '/api/auth/brain': {
      post: {
        summary: 'Create Brain ID session',
        operationId: 'createBrainSession',
        security: [],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/BrainId' } } },
        },
        responses: {
          '200': { description: 'Session created', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenResponse' } } } },
          '400': { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/auth/restore': {
      post: {
        summary: 'Restore session by Brain ID',
        operationId: 'restoreSession',
        security: [],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RestoreInput' } } },
        },
        responses: {
          '200': { description: 'Session restored', content: { 'application/json': { schema: { $ref: '#/components/schemas/TokenResponse' } } } },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/game/save': {
      post: {
        summary: 'Save game session',
        operationId: 'saveGameSession',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SaveSessionInput' } } },
        },
        responses: {
          '201': { description: 'Saved', content: { 'application/json': { schema: { $ref: '#/components/schemas/GameSession' } } } },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '422': { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    // ... all other endpoints
  },
  components: {
    responses: {
      BadRequest: { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      Unauthorized: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      NotFound: { description: 'Not Found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      ValidationError: { description: 'Validation Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
      TooManyRequests: { description: 'Rate Limited', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
    },
    schemas: {
      ErrorResponse: z.object({
        error: z.string(),
        code: z.string(),
        details: z.record(z.unknown()).optional(),
      }).openapi('ErrorResponse'),
      ValidationErrorResponse: z.object({
        error: z.literal('Validation Error'),
        code: z.literal('VALIDATION_ERROR'),
        issues: z.array(z.object({
          path: z.array(z.union([z.string(), z.number()])),
          message: z.string(),
        })),
      }).openapi('ValidationErrorResponse'),
    },
  },
});

// Write to file
import { writeFileSync } from 'fs';
writeFileSync('dist/openapi.json', JSON.stringify(spec, null, 2));
```

---

## CI Integration (`.github/workflows/openapi.yml`)

```yaml
name: OpenAPI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm openapi:generate
      - name: Validate spec
        run: npx @redocly/openapi-cli@latest lint dist/openapi.json
      - name: Upload spec
        uses: actions/upload-artifact@v4
        with:
          name: openapi-spec
          path: dist/openapi.json

  breaking-changes:
    needs: generate
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm openapi:generate
      - name: Check breaking changes
        run: |
          git show origin/main:dist/openapi.json > dist/openapi.main.json
          npx @redocly/openapi-cli@latest breaking dist/openapi.main.json dist/openapi.json
```

---

## UI: Scalar (Development)

### `vite.config.ts` (dev only)
```typescript
import { defineConfig } from 'vite';
import scalar from 'vite-plugin-scalar-api-reference';

export default defineConfig({
  plugins: [
    process.env.NODE_ENV === 'development' && scalar({
      routePrefix: '/api/docs',
      configuration: {
        spec: { url: '/api/openapi.json' },
        theme: 'kepler',
        layout: 'modern',
        defaultHttpClient: { targetKey: 'javascript', clientKey: 'fetch' },
        authentication: {
          preferredSecurityScheme: 'BearerAuth',
        },
      },
    }),
  ],
});
```

### Доступ
- **Dev**: http://localhost:3006/api/docs
- **Prod**: https://kognitika.ru/api/docs (защищено ADMIN)

---

## Endpoints Overview

| Группа | Base Path | Auth | Описание |
|---|---|---|---|
| **Auth** | `/api/auth` | ❌ / ✅ | Brain ID create/restore, JWT |
| **Game** | `/api/game` | ✅ | Save session, get history |
| **Analytics** | `/api/analytics` | ✅ | Export, profile, compare, summaries |
| **Duels** | `/api/duels` | ✅ | Create, join, history, leaderboard |
| **Feedback** | `/api/feedback` | ✅ | Submit, status, admin reply |
| **Ideas** | `/api/ideas` | ✅ | Create, vote, list, admin |
| **SymbolChat** | `/api/chat` | ✅ | Post, feed, react, stats |
| **Admin** | `/api/admin` | ✅ (ADMIN) | Users, config, analytics, audit |
| **Health** | `/api/health` | ❌ | Liveness/readiness |

---

## Type-Safe Client Generation

### `scripts/generate-client.ts`
```typescript
import { generateClient } from '@hey-api/openapi-ts';

await generateClient({
  input: 'dist/openapi.json',
  output: 'src/lib/api-client',
  client: 'fetch',
  schemas: {
    type: 'zod',
    parser: 'zod',
  },
  plugins: [
    '@hey-api/client-fetch',
    '@hey-api/schemas',
  ],
});
```

### Использование в коде
```typescript
// src/lib/api-client.ts (auto-generated)
import { createClient } from './api-client';

export const api = createClient({
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  headers: () => ({
    Authorization: `Bearer ${getToken()}`,
  }),
});

// Типизированный вызов
const session = await api.game.saveGameSession({
  body: { gameType: 'SCHULTE', startedAt: Date.now(), ... },
});
```

---

## Versioning & Deprecation

| Стратегия | Детали |
|---|---|
| **URL Versioning** | `/api/v1/...` (current) |
| **Header Versioning** | `Accept: application/vnd.kognitika.v1+json` |
| **Deprecation** | `Deprecation: true`, `Sunset: Sat, 01 Jan 2027 00:00:00 GMT`, `Link: <https://kognitika.ru/api/v2/...>; rel="successor-version"` |
| **Breaking Changes** | Только в новой версии (v2), v1 поддерживается 12 месяцев |

---

## Testing Contracts

### Contract Tests (Vitest)
```typescript
// src/tests/api-contract.test.ts
import { api } from '../lib/api-client';
import { SaveSessionInputSchema } from '../lib/schemas/game';

it('POST /api/game/save matches schema', async () => {
  const input = SaveSessionInputSchema.parse({
    gameType: 'SCHULTE',
    startedAt: Date.now() - 60000,
    completedAt: Date.now(),
    score: 25,
    accuracy: 1.0,
    durationMs: 60000,
    metadata: { gridSize: 5, seed: 'abc123' },
  });

  const res = await api.game.saveGameSession({ body: input });
  expect(res.status).toBe(201);

  // Response validation
  expect(GameSessionSchema.safeParse(res.data).success).toBe(true);
});
```

---

## Файлы

| Путь | Назначение |
|---|---|
| `src/lib/schemas/*.ts` | Zod схемы (source of truth) |
| `scripts/generate-openapi.ts` | Генерация OpenAPI 3.1 |
| `scripts/generate-client.ts` | Генерация TS клиента |
| `dist/openapi.json` | Сгенерированная спека (не в git) |
| `.github/workflows/openapi.yml` | CI: generate, lint, breaking changes |
| `vite.config.ts` | Scalar UI plugin (dev) |
