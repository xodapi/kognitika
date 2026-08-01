<div align="center">
  <br />
  <p>
    <sub>
      <a href="README.md">Русская версия</a>
    </sub>
  </p>
  <br />
  <h1>🧠 Kognitika</h1>
  <p><strong>React/Express platform for cognitive training — memory, attention, speed, and adaptive analytics</strong></p>
  <p>
    <a href="https://kognitika.ru" target="_blank">kognitika.ru</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff" alt="TypeScript" />
    <img src="https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Express-000?logo=express&logoColor=fff" alt="Express" />
    <img src="https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=fff" alt="Prisma" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=fff" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Socket.io-010101?logo=socket.io&logoColor=fff" alt="Socket.io" />
    <br />
    <img src="https://img.shields.io/badge/tests-357_passing-22c55e?logo=vitest&logoColor=fff" alt="Tests" />
    <img src="https://img.shields.io/badge/license-Proprietary-ff69b4" alt="License" />
    <img src="https://img.shields.io/github/last-commit/xodapi/kognitika?logo=git" alt="Last commit" />
  </p>
  <br />
</div>

> 🚀 **Live:** [kognitika.ru](https://kognitika.ru) | 📱 **Android APK:** [Latest Release](https://github.com/xodapi/kognitika/releases/tag/android-latest) | 📚 **Wiki:** [Project Wiki](https://github.com/xodapi/kognitika/wiki)

---

## ✨ Key Features

| Domain | Trainers | Focus |
|--------|----------|-------|
| **Base** | Schulte, N-Back, Stroop, Mental Math, Spatial, Typing | Attention, memory, speed |
| **Engineering** | Numerical, Logical, Topology, Collision, Dispatcher, Noise | Systems thinking |
| **Mind-Guard** | Scanner, Decryptor, Reality Check, Hype Filter, Reframing, Rejection | Critical thinking |
| **Meta** | Cognitive Map, Wiki, Leaderboard, Duels, Express Knowledge Hub | Progress, knowledge, competition |

- 🔐 **Brain ID** — Privacy-first auth (no Firebase, no email exposure)
- ⚡ **Real-time duels** — Socket.io with resource bounds
- 📊 **Cognitive analytics** — current JS/TypeScript pipeline, the Rust `kognitika-core`, and a shadow → canary → Rust-primary migration plan
- 📱 **Native Android** — Capacitor 8, rolling debug APK on every push
- ✅ **357 tests** — Vitest + Playwright E2E, navigation contracts

---

## 🛠 Quick Start (Development)

```bash
# Clone & install
git clone https://github.com/xodapi/kognitika.git
cd kognitika
pnpm install --frozen-lockfile

# Setup env & database
cp .env.example .env
# Edit .env with DATABASE_URL, JWT_SECRET
pnpm exec prisma migrate deploy

# Dev server (port 3006)
pnpm dev
```

---

## Quick navigation

| Area | Link |
|---|---|
| Architecture and design | [`ARCHITECTURE.md`](ARCHITECTURE.md), [`KOGNITIKA_CORE.md`](KOGNITIKA_CORE.md) |
| Wiki (tests, methodology, data export, security) | [github.com/xodapi/kognitika/wiki](https://github.com/xodapi/kognitika/wiki) |
| Scientific methodology of all 28 trainers | [Scientific methodology](https://github.com/xodapi/kognitika/wiki/Scientific-methodology) |
| Test reference (84 files, 357 tests) | [Testing reference](https://github.com/xodapi/kognitika/wiki/Testing-reference) |
| Data export for LLM analysis | [Data export](https://github.com/xodapi/kognitika/wiki/Data-export) |
| Security boundaries and vulnerability reporting | [`SECURITY.md`](SECURITY.md) |
| Agent development guide | [`AGENTS.md`](AGENTS.md) |
| Roadmap | [Issue #10](https://github.com/xodapi/kognitika/issues/10) |
| Rust analytics and backend migration | [Roadmap #139](https://github.com/xodapi/kognitika/issues/139), [Wiki page](https://github.com/xodapi/kognitika/wiki/rust-analytics-roadmap) |
| Knowledge base (in-app articles) | `src/lib/knowledge-base.ts` |
| Audit description for external reviewers | [`docs/AUDIT_BRIEF.md`](docs/AUDIT_BRIEF.md) |

## Status

Current status: MVP / technical stabilization.

The main engineering priority is production risk reduction: boot recovery, storage contracts, privacy-safe identity, API consistency, test coverage, and deploy reproducibility come before new product features.

Tracking roadmap: https://github.com/xodapi/kognitika/issues/10

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS + Motion (`motion/react`)
- Express + Socket.io
- Prisma + PostgreSQL
- Vitest + Playwright
- JS/TypeScript analytics runtime today; Rust `kognitika-core` already implements `AnalyzeSession`; the target path is native Rust/Axum analytics through shadow and canary rollout
- OpenAPI/Swagger is being planned in [#138](https://github.com/xodapi/kognitika/issues/138) as an implementation-neutral contract for current Express and future Rust endpoints

## Project structure

```
kognitika/
├── src/                         # Main application source
│   ├── components/              # React UI components (70+ trainers, modals, panels)
│   ├── hooks/                   # React hooks (use{Module}Engine pattern)
│   ├── lib/                     # Shared utilities, routes, knowledge base
│   ├── core/                    # EventBus, seeded generators, analytics engine
│   ├── server/                  # Express API, Socket.io, middleware, schemas
│   ├── client/                  # Analytics worker, event bus
│   ├── workers/                 # Web workers (analytics, session analysis)
│   ├── tests/                   # Vitest test suite (84 files, 357 tests)
│   ├── App.tsx                  # Root app with routing
│   └── main.tsx                 # Entry point
├── crates/
│   └── kognitika-core/          # Native + WASM AnalyzeSession core; foundation for incremental analytics migration
├── apps/
│   ├── capacitor/               # Android/iOS native build via Capacitor
│   └── mobile/                  # Mobile-specific configuration
├── prisma/                      # Database schema (12 models)
├── tests/                       # Playwright E2E specs
├── docs/                        # Architecture, identity, operations, audit docs
├── server.ts                    # Full-stack Express + Vite dev server entry
├── .github/workflows/           # CI (lint+test+build), Deploy, Android APK
├── SECURITY.md                  # Vulnerability reporting and security boundaries
├── AGENTS.md                    # Agent development guide with mandatory checklist
└── ARCHITECTURE.md              # Architectural source of truth
```

## Requirements

- Node.js 22
- pnpm 10.22.0
- PostgreSQL 15+

The canonical package manager is pnpm. Do not use npm or yarn lockfiles.

## Local Setup

Install dependencies:

```bash
pnpm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Start PostgreSQL with Docker Compose:

```bash
docker compose up -d db
```

Run Prisma setup:

```bash
pnpm prisma generate
pnpm prisma db push
```

Start the full-stack dev server:

```bash
pnpm dev
```

Default local URL: `http://localhost:3006`

## Environment

See `.env.example` for the full list. Required for normal local work:

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT=3006`
- `APP_URL=http://localhost:3006`
- `FRONTEND_URL=http://localhost:3006`
- `CORS_ORIGIN=http://localhost:3006`
- `CORS_ALLOW_DEV_WILDCARD=false`

`CORS_ORIGIN` accepts a comma-separated allowlist shared by Express and Socket.io. Wildcard CORS requires `CORS_ORIGIN=*` plus `CORS_ALLOW_DEV_WILDCARD=true` and is accepted only in development/test; production without an allowlist fails closed for browser cross-origin requests and logs a startup warning.

Optional integrations include Telegram, SMTP, and legacy email channels. Public auth is Brain ID-first; legacy email features must remain explicitly gated.

Never commit real secrets, tokens, raw Brain IDs, production telemetry, or user data.

## Scripts

- `pnpm dev` - start the Express/Vite development server
- `pnpm start` - start the Express server
- `pnpm lint` - generate Prisma client and run TypeScript checks
- `pnpm test` - run the Vitest suite
- `pnpm validate` - run the core validation suite
- `pnpm build` - generate Prisma client and build the frontend
- `pnpm test:e2e` - run Playwright E2E tests and let Playwright manage its production-style webServer
- `pnpm test:e2e:attached` - run Playwright against an already running local server; defaults to `http://127.0.0.1:3006` and is useful on Windows/proxy environments
- `pnpm clean` - remove only the local `dist` directory through a cross-platform Node helper

## Validation

Before opening or merging a production-risk change, run:

```bash
pnpm lint
pnpm test
pnpm build
```

For navigation or post-game flow work, run:

```bash
pnpm test:e2e
```

If local Playwright webServer readiness is affected by a desktop proxy, start the app separately and use the attached mode:

```bash
pnpm dev
pnpm test:e2e:attached
```

The attached mode sets `NO_PROXY` for localhost and uses `BASE_URL` if you need a non-default URL.

Known non-blocking local warnings currently include Recharts zero-size container warnings in jsdom and React `act(...)` warnings in existing dashboard tests. Treat new failures as blockers.

## Runtime Contracts

- Canonical port: `3006`.
- Public feedback submissions use the Prisma-backed `/api/feedback` route as the runtime source of truth; operator verification is documented in `docs/feedback-operations.md`.
- Public identity is Brain ID-first; do not expose raw Brain ID, email, token, or password hashes in UI/API responses.
- Brain ID storage/recovery boundaries are defined in `docs/brain-id-identity.md`.
- PWA/offline-first must remain disabled until `docs/pwa-offline-strategy.md` acceptance gates are met.
- Production analytics currently uses JS/TypeScript workers and server services; the lightweight `ClickEvent` contract and full-session `AnalyzeSession` contract are still distinct.
- Target Rust path: canonical events for every cognitive module → durable analytics jobs → internal Axum analyzer → shadow → canary → Rust-primary with a temporary TS fallback. Track it in [#139](https://github.com/xodapi/kognitika/issues/139).
- Browser WASM still requires the frame-budget gate in `docs/frame-budget-benchmark.md`; server-side native Rust is evaluated independently and does not require a React rewrite.
- OpenAPI issue [#138](https://github.com/xodapi/kognitika/issues/138) should define an implementation-neutral HTTP contract shared by Express and future Rust endpoints.
- Direct production file patches are forbidden outside documented emergency hotfixes.

## Deploy

Normal deploy flow:

```text
local branch -> commit -> push -> PR -> merge to main -> GitHub Actions deploy
```

The server should update through the repository-first flow. Do not edit `/opt/kognitika/*` or `/opt/kognitika/dist/*` directly during normal work.

Production health check:

```bash
curl https://kognitika.ru/api/health
```

The response includes `buildId`, which should match the deployed commit short hash. The deploy workflow reads the internal health-check port from the server `.env` `PORT` value and falls back to `3006`, so production-only port overrides do not break deploy verification.

## CI

GitHub Actions run:

- TypeScript lint
- Vitest tests
- build
- Playwright E2E
- deploy to the production server on `main`

## Docker

Build and run app + database:

```bash
docker compose up --build
```

The app container exposes `3006:3006`; PostgreSQL exposes `5432:5432`.

## Mobile (Android)

The latest debug APK is published automatically on every push to `main`:

- Download: [GitHub Releases → android-latest](https://github.com/xodapi/kognitika/releases/tag/android-latest)

Signed release App Bundles for Play Console are built manually via the
`Android Native Build` workflow (`workflow_dispatch` with `release=true`)
in the `android-release` environment.

## Issue Hygiene

Use clear title prefixes:

- `[P0]` production outage, active security risk, or data-loss risk
- `[P1]` high-priority stabilization or privacy/security hardening
- `[P2]` medium-priority cleanup, docs, or contract hygiene
- `[P3]` strategic horizon

Preferred labels:

- `area:boot`
- `area:security`
- `area:privacy`
- `area:identity`
- `area:storage`
- `area:api`
- `area:infra`
- `area:docs`

## License

Proprietary license — see [LICENSE](LICENSE). Access to the source is granted to team members, auditors, and contractors under NDA.

All rights reserved. See [SECURITY.md](SECURITY.md) for vulnerability reporting and security boundaries.

---

*Read in other languages: [Русский](README.md)*
