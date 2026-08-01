# Implementation Plan: Swagger/OpenAPI Documentation (Issue #138)

> **Issue:** #138 — `[P3][API] Добавить Swagger/OpenAPI документацию (автогенерация)`
> **Priority:** P3 (nice to have)
> **Estimated effort:** 4–6 hours
> **Auditor:** [to be assigned]

---

## 1. Objective

Add auto-generated OpenAPI 3.0 documentation for all 13 API routes under `/api/*` with:
- **Swagger UI** at `GET /api/docs`
- **JSON schema** at `GET /api/docs.json`
- **JSDoc annotations** on all route handlers

---

## 2. Current State

| Component | Status |
|-----------|--------|
| `swagger-jsdoc` / `swagger-ui-express` | ❌ Not installed |
| `/api/docs` route | ❌ Not implemented |
| `/api/docs.json` route | ❌ Not implemented |
| JSDoc on route handlers | ❌ Missing (13 route files) |
| README link | ✅ Updated to Issue #138 (planned) |

**Routes to document (13):**
1. `/api/auth` — authRoutes
2. `/api/game` — gameRoutes
3. `/api/admin` — adminRoutes
4. `/api/chat` — chatRoutes
5. `/api/leaderboard` — leaderboardRoutes
6. `/api/analytics` — analyticsRoutes (+ practice-flow, daily-trajectory)
7. `/api/dashboard` — dashboardRoutes
8. `/api/client-error` — observabilityRoutes
9. `/api/ideas` — ideasRoutes
10. `/api/feedback` — feedbackRoutes
11. `/api/neurotrainer` — neurotrainerRoutes
12. `/api/health` — inline in server.ts
13. `/api/me` — inline in server.ts

---

## 3. Implementation Steps

### Step 1: Install Dependencies (15 min)

```bash
pnpm add swagger-jsdoc swagger-ui-express
pnpm add -D @types/swagger-jsdoc @types/swagger-ui-express
```

**Verify:** `pnpm lint` passes, no type errors.

---

### Step 2: Create Swagger Config Module (30 min)

**New file:** `src/server/config/swagger.ts`

```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Kognitika API',
      version: '1.0.0',
      description: 'Cognitive training platform API — Brain ID auth, trainers, duels, analytics',
      contact: { name: 'Kognitika Team', url: 'https://github.com/xodapi/kognitika' },
      license: { name: 'Proprietary' },
    },
    servers: [
      { url: 'https://kognitika.ru', description: 'Production' },
      { url: 'http://localhost:3006', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Brain ID JWT token (Authorization: Bearer <token>)',
        },
      },
      schemas: {
        // Shared schemas will be referenced via $ref
        Error: { type: 'object', properties: { error: { type: 'string' } } },
        HealthResponse: { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string', format: 'date-time' }, buildId: { type: 'string' } } },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & Brain ID registration' },
      { name: 'Game', description: 'Trainer sessions & results' },
      { name: 'Admin', description: 'Admin panel (requires ADMIN role)' },
      { name: 'Chat', description: 'Real-time chat / Socket.io' },
      { name: 'Leaderboard', description: 'Rankings & ratings' },
      { name: 'Analytics', description: 'Session analytics, practice flow, trajectories' },
      { name: 'Dashboard', description: 'User dashboard data' },
      { name: 'Observability', description: 'Client error reporting' },
      { name: 'Ideas', description: 'Community suggestions' },
      { name: 'Feedback', description: 'User feedback submissions' },
      { name: 'Neurotrainer', description: 'Neurotrainer analysis & generation' },
      { name: 'Health', description: 'Health check & build info' },
    ],
  },
  apis: ['./src/server/routes/*.ts', './server.ts'], // JSDoc source files
};

export const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  // Swagger UI
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Kognitika API Docs',
    swaggerOptions: { persistAuthorization: true },
  }));

  // Raw JSON schema
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
```

---

### Step 3: Integrate in `server.ts` (10 min)

```typescript
// Add import
import { setupSwagger } from './src/server/config/swagger.js';

// After route registration, before 404 handler
setupSwagger(app);
```

**Placement:** After all `app.use('/api/*', ...)` but before `app.use(apiNotFound)`.

---

### Step 4: Add JSDoc Annotations to Route Files (2–3 hours)

**Pattern for each route file** (`src/server/routes/*.ts`):

```typescript
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register new user with Brain ID
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pseudonym]
 *             properties:
 *               pseudonym:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 32
 *                 example: "cognitive_master"
 *     responses:
 *       '201':
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 brainId:
 *                   type: string
 *                   format: uuid
 *                   example: "00000000-0000-4000-8000-000000000488"
 *                 token:
 *                   type: string
 *                   description: JWT token for subsequent requests
 *       '400':
 *         $ref: '#/components/schemas/Error'
 *       '409':
 *         $ref: '#/components/schemas/Error'
 */
authRouter.post('/register', registerHandler);
```

**Files to annotate (13):**
| File | Routes | Est. time |
|------|--------|-----------|
| `auth.ts` | 4 (register, login, refresh, me) | 30 min |
| `game.ts` | 3 (start, complete, history) | 20 min |
| `admin.ts` | 5 (users, stats, moderation) | 25 min |
| `chat.ts` | 2 (messages, history) | 15 min |
| `leaderboard.ts` | 3 (global, friends, user) | 20 min |
| `analytics.ts` | 4 (export, session, trends) | 25 min |
| `dashboard.ts` | 3 (status, tasks, streak) | 20 min |
| `observability.ts` | 1 (client-error) | 10 min |
| `ideas.ts` | 3 (list, create, vote) | 15 min |
| `feedback.ts` | 2 (submit, status) | 15 min |
| `practice-flow.ts` | 2 (plan, complete) | 15 min |
| `daily-trajectory.ts` | 2 (get, compute) | 15 min |
| `neurotrainer.ts` | 3 (analyze, generate, status) | 20 min |
| `server.ts` (inline) | 2 (health, me) | 10 min |

**Shared schemas** — define in `swagger.ts` `components.schemas` and reference via `$ref`:
- `UserProfile`, `GameSession`, `LeaderboardEntry`, `AnalyticsExport`, `DailyTask`, `NeurotrainerRequest`, `NeurotrainerResponse`, etc.

---

### Step 5: Verify & Test (30 min)

```bash
# 1. Type check
pnpm lint

# 2. Build
pnpm build

# 3. Start dev server
pnpm dev

# 4. Test endpoints
curl http://localhost:3006/api/docs.json | jq .info.title
curl -s http://localhost:3006/api/docs | grep -c "swagger-ui"
```

**Manual verification checklist:**
- [ ] `GET /api/docs` → renders Swagger UI
- [ ] `GET /api/docs.json` → valid JSON, `openapi: "3.0.3"`
- [ ] All 13 route groups appear in sidebar
- [ ] `Authorize` button works (Bearer token)
- [ ] Example requests execute against dev server
- [ ] No console errors in browser devtools

---

### Step 6: Update README (5 min)

```markdown
| API Reference (OpenAPI) | https://kognitika.ru/api/docs |
```
(Replace Issue #138 link with live URL)

---

## 4. Definition of Done

| Criterion | Verification |
|-----------|--------------|
| `swagger-jsdoc` + `swagger-ui-express` installed | `pnpm list swagger-jsdoc swagger-ui-express` |
| `src/server/config/swagger.ts` exists | File present, exports `setupSwagger` |
| `server.ts` calls `setupSwagger(app)` | Integrated before 404 handler |
| All 13 route files have JSDoc `@openapi` blocks | `rg "@openapi" src/server/routes/` → 13+ matches |
| Shared schemas defined in `components.schemas` | At least 10 reusable schemas |
| `GET /api/docs` returns HTML (Swagger UI) | `curl -s .../api/docs \| grep swagger-ui` |
| `GET /api/docs.json` returns valid OpenAPI 3.0 | `curl .../api/docs.json \| jq .openapi` |
| `pnpm lint` + `pnpm build` pass | CI green |
| README updated with live URL | Link points to `https://kognitika.ru/api/docs` |

---

## 5. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| JSDoc parsing fails on complex Zod schemas | Medium | High | Use simple inline schemas; reference shared components |
| Route handlers use dynamic paths (regex) | Low | Medium | Document static paths only; skip parametric complexity |
| Auth middleware blocks Swagger UI in prod | Low | High | Swagger UI is public; auth only for "Try it out" |
| TypeScript errors from `@types` packages | Low | Medium | Use `// @ts-expect-error` if needed; prefer `any` in config only |
| Large spec size (>1MB) | Low | Low | Enable `swaggerUi.setup(..., { spec: swaggerSpec, ... })` with `deepLinking: true` |

---

## 6. File Changes Summary

| File | Change Type |
|------|-------------|
| `package.json` / `pnpm-lock.yaml` | Added 4 deps |
| `src/server/config/swagger.ts` | **New** (config + setup) |
| `server.ts` | Added import + `setupSwagger(app)` call |
| `src/server/routes/auth.ts` | Added JSDoc blocks |
| `src/server/routes/game.ts` | Added JSDoc blocks |
| `src/server/routes/admin.ts` | Added JSDoc blocks |
| `src/server/routes/chat.ts` | Added JSDoc blocks |
| `src/server/routes/leaderboard.ts` | Added JSDoc blocks |
| `src/server/routes/analytics.ts` | Added JSDoc blocks |
| `src/server/routes/dashboard.ts` | Added JSDoc blocks |
| `src/server/routes/observability.ts` | Added JSDoc blocks |
| `src/server/routes/ideas.ts` | Added JSDoc blocks |
| `src/server/routes/feedback.ts` | Added JSDoc blocks |
| `src/server/routes/practice-flow.ts` | Added JSDoc blocks |
| `src/server/routes/daily-trajectory.ts` | Added JSDoc blocks |
| `src/server/routes/neurotrainer.ts` | Added JSDoc blocks |
| `README.md` / `README.en.md` | Updated API docs URL |

---

## 7. Timeline

| Phase | Duration | Can parallelize? |
|-------|----------|------------------|
| 1. Deps + Config | 45 min | No |
| 2. JSDoc annotations (13 files) | 2–3 hrs | **Yes** — each file independent |
| 3. Integration + Verify | 30 min | No |
| 4. README + Commit | 10 min | No |
| **Total** | **~4–5 hrs** | — |

**Parallelization note:** Steps 2a–2n (each route file) can be split across multiple agents since they only read shared schemas from `swagger.ts` and don't modify each other.

---

## 8. Audit Checklist (for reviewer)

- [ ] Dependencies locked in `pnpm-lock.yaml`
- [ ] No runtime errors in dev server startup
- [ ] Swagger UI loads without JS errors
- [ ] All 13 tag groups present in UI sidebar
- [ ] `Authorize` modal accepts Bearer token
- [ ] Example `GET /api/health` executes successfully
- [ ] `GET /api/docs.json` validates against OpenAPI 3.0 spec (use `swagger-codegen` or online validator)
- [ ] No sensitive data (secrets, real Brain IDs) in generated spec
- [ ] `pnpm test` still passes (no regressions)
- [ ] `pnpm build` succeeds
- [ ] README links updated to production URL

---

## 9. Post-Implementation (Future)

| Enhancement | Issue | Effort |
|-------------|-------|--------|
| Add request/response examples from test fixtures | — | 1 hr |
| Generate TypeScript client from spec (`openapi-typescript`) | — | 2 hrs |
| Add webhook/event documentation (Socket.io) | — | 1 hr |
| CI step: validate spec on every PR | — | 30 min |
| Host spec on dedicated subdomain (`api.kognitika.ru`) | — | 1 hr |

---

**Plan prepared by:** Droid Agent  
**Date:** 2026-08-01  
**For:** Audit review → Implementation assignment
