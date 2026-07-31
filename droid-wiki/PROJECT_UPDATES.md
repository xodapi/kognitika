# Project Updates — Kognitika

> **Last updated:** 2026-08-01  
> **Commit:** c2742f6 (main)  
> **Status:** Active development, CI passing

---

## Current State Summary

| Metric | Value |
|--------|-------|
| **Trainer modules** | 30+ across 3 domains (Base, Engineering, Mind-Guard) |
| **Test coverage** | 357 tests across 84 files (Vitest) |
| **TypeScript** | Strict mode, zero errors |
| **Bundle size** | ~794 KB (gzipped: ~235 KB) — within budget |
| **CI status** | All checks passing |
| **Mobile** | Capacitor 8, rolling debug APK on every push |

---

## Recent Major Features (2026-07 to 2026-08)

### 1. Express Knowledge Hub (`/express-knowledge`)
**Commit:** Recent (unified entry for Задание №7 and Задание №8)  
**Status:** ✅ Deployed and tested

- **Unified entry point** for Mental Math (Быстрые вычисления) and Schulte Table 90 (Таблица 1-90)
- **Mode cards** with live stats from `/api/progress` (best time, score, accuracy, sessions)
- **Briefing modals** with algorithms, presets/rules, normatives for each mode
- **Daily task XP preview** from `/api/dashboard/status`
- **Cross-mode comparison grid** for side-by-side metrics
- **Quick links** to related Base modules (N-Back, Stroop, Spatial)
- **Haptic feedback** integration via `useHaptics` hook
- **Responsive design** with mobile-first navigation

**Files added/modified:**
- `src/components/ExpressKnowledgeHub.tsx` (new, 591 lines)
- `src/lib/route-config.tsx` — route registration, nav items
- `src/App.tsx` — lazy import and route
- `src/lib/routes.ts` — added `/express-knowledge` to `APP_ROUTE_PATHS`

### 2. UX Improvements (5 phases complete)
**Commits:** `909a407`, `210d495`, `48d0ecf`, `ac2b1d8`, `8227b31`

| Phase | Feature | Description |
|-------|---------|-------------|
| 1 | Toast notifications | Global toast system with `useToast` hook |
| 2 | Font scaling | Responsive typography with CSS clamp() |
| 3 | Touch targets | Minimum 44×44px touch targets across UI |
| 4 | Skeleton loaders | `DashboardSkeleton`, `TrainerSkeleton` components |
| 5 | Haptic feedback | `useHaptics` hook with vibration patterns |

### 3. Navigation Contract Enforcement
**Files:** `src/tests/navigation-contract.test.ts`, `src/lib/route-config.tsx`

- Automated test ensures `ROUTE_DEFINITIONS` ↔ `APP_ROUTE_PATHS` sync
- Header/mobile/bottom nav items validated against declared routes
- Custom render routes tracked in `CUSTOM_RENDER_ROUTES` set
- Prevents orphaned routes and missing navigation entries

### 4. Dashboard UI Test Stabilization
**File:** `src/tests/dashboard-ui.test.tsx`

- Fixed async rendering flakiness with `waitFor` for user name display
- All 4 dashboard tests now pass consistently
- Mocks properly isolated for `useAuth`, child components, and `fetch`

---

## API & Backend Status

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/progress` | ✅ | Returns per-trainer stats for hub |
| `/api/dashboard/status` | ✅ | Daily tasks, streak, XP |
| `/api/analytics/export` | ✅ | Privacy-verified (no PII) |
| `/api/health` | ✅ | Health check for deployment |
| Socket.io duels | ✅ | Real-time, resource-bounded |

---

## Test Suite Health

```
Test Files: 84 passed
Tests:      357 passed
TypeScript: 0 errors
Lint:       Clean
```

**Known pre-existing issue:** 1 integration test (`feedback-ideas-network`) requires running server — not a regression.

---

## Deployment Readiness

- ✅ `pnpm build` succeeds
- ✅ Docker image builds (`Dockerfile`, `docker-compose.yml`)
- ✅ Port 3006 aligned across `server.ts`, `.env.example`, Dockerfile
- ✅ Static serving of Vite build from `dist/`
- ✅ PostgreSQL + Prisma migrations ready
- ✅ Rolling debug APK on every push to main

---

## Upcoming Work (Planned)

| Issue | Title | Priority |
|-------|-------|----------|
| #127 | LLM integration for Express Knowledge (generation + analysis) | High |
| #128 | UI/UX polish for results screen, CTA, progress | Medium |
| #133 | Unified release hub for tasks 1–8 | Medium |
| #134 | Personal norms & safe result dynamics | Medium |
| #135 | Reproducible content packs & QA protocol | Low |
| — | `www.kognitika.ru` DNS fix | High |
| — | Local `vitest`/`tsc` PATH issue | Low |
| — | Real-device manual QA | Medium |

---

## Architecture Decisions (Recent)

1. **No Firebase in runtime** — Brain ID + Prisma + PostgreSQL only (per AGENTS.md)
2. **Repository-first deploy** — No direct production patches
3. **Event-driven frontend** — React + Vite + Motion, no Next.js
4. **pnpm workspace** — Monorepo with shared packages
5. **Vitest for testing** — No Jest, native ESM support

---

## Quick Links

- [Architecture Overview](overview/architecture.md)
- [Scientific Methodology](features/scientific-methodology.md)
- [Testing Strategy](features/testing.md)
- [Deployment Guide](deployment.md)
- [Security Model](security.md)
- [Configuration Reference](reference/configuration.md)
- [Data Models](reference/data-models.md)
