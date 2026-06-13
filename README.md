# Kognitika

Private MVP for cognitive training, Brain ID identity, adaptive analytics, and real-time duel mechanics.

## Status

Current status: MVP / technical stabilization.

The main engineering priority is production risk reduction: boot recovery, storage contracts, privacy-safe identity, API consistency, test coverage, and deploy reproducibility come before new product features.

Tracking roadmap: https://github.com/xodapi/kognitika/issues/10

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS + Motion (`motion/react`)
- Express + Socket.io
- Prisma + PostgreSQL
- Firebase Auth/Firestore rules for selected applet and security-rule flows
- Vitest + Playwright
- JS analytics worker with a WASM-ready boundary for future hot paths

## Requirements

- Node.js 22
- pnpm 10.22.0
- PostgreSQL 15+
- Java 21 for local Firebase Firestore emulator tests

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

Optional integrations include Telegram, SMTP, and legacy email channels. Public auth is Brain ID-first; legacy email features must remain explicitly gated.

Never commit real secrets, tokens, raw Brain IDs, production telemetry, or user data.

## Scripts

- `pnpm dev` - start the Express/Vite development server
- `pnpm start` - start the Express server
- `pnpm lint` - generate Prisma client and run TypeScript checks
- `pnpm test` - run the Vitest suite
- `pnpm validate` - run the core validation suite
- `pnpm build` - generate Prisma client and build the frontend
- `pnpm test:e2e` - run Playwright E2E tests
- `pnpm check:firebase:rules` - statically verify Firebase rules config
- `pnpm test:firestore:rules` - run Firestore emulator rules tests

`pnpm test:firestore:rules` needs Java and the Firebase emulator. In CI this is configured automatically.

## Validation

Before opening or merging a production-risk change, run:

```bash
pnpm lint
pnpm test
pnpm build
```

For Firebase rules or feedback/privacy work, also run:

```bash
pnpm check:firebase:rules
pnpm test:firestore:rules
```

For navigation or post-game flow work, run:

```bash
pnpm test:e2e
```

Known non-blocking local warnings currently include Recharts zero-size container warnings in jsdom and React `act(...)` warnings in existing dashboard tests. Treat new failures as blockers.

## Runtime Contracts

- Canonical port: `3006`.
- Public feedback submissions use the Prisma-backed `/api/feedback` route as the runtime source of truth.
- Firestore feedback schema is a privacy/rules contract, not the public UI submission path.
- Public identity is Brain ID-first; do not expose raw Brain ID, email, token, or password hashes in UI/API responses.
- Client analytics `ClickEvent` uses `{ cellId, reactionTimeMs }`.
- Direct production file patches are forbidden outside documented emergency hotfixes.

## Deploy

Normal deploy flow:

```text
local branch -> commit -> push -> PR -> merge to main -> GitHub Actions deploy
```

The server should update through the repository-first flow. Do not edit `/opt/kognitika/*` or `/opt/kognitika/dist/*` directly during normal work.

Production health check:

```bash
curl https://kognitika.syntog.ru/api/health
```

The response includes `buildId`, which should match the deployed commit short hash.

## CI

GitHub Actions run:

- TypeScript lint
- Vitest tests
- Firebase rules static check
- Firestore emulator rules tests
- build
- Playwright E2E
- deploy to the production server on `main`

Firebase active-rules deployment requires the repository secret `FIREBASE_SERVICE_ACCOUNT_JSON`. Without it, emulator verification can pass while active Firebase deployment is skipped with a warning.

## Docker

Build and run app + database:

```bash
docker compose up --build
```

The app container exposes `3006:3006`; PostgreSQL exposes `5432:5432`.

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

Private repository. License is not defined for public distribution.
