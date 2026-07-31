# Getting started

## Prerequisites

- Node.js 22
- pnpm 10.22.0 (the canonical package manager; do not use npm or yarn)
- Docker and Docker Compose (for PostgreSQL)
- Git

## Install dependencies

```bash
pnpm install
```

## Set up environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your local values. The minimum required variables:

```
DATABASE_URL="postgresql://admin:adminpassword@localhost:5432/cognitika?schema=public"
JWT_SECRET="your-random-secret-here"
PORT=3006
APP_URL="http://localhost:3006"
FRONTEND_URL="http://localhost:3006"
CORS_ORIGIN="http://localhost:3006"
CORS_ALLOW_DEV_WILDCARD="false"
```

## Start PostgreSQL with Docker Compose

```bash
docker compose up -d db
```

This starts a PostgreSQL 15 container on port 5432 with user `admin`, password `adminpassword`, and database `cognitika`.

## Set up the database schema

```bash
pnpm prisma generate
pnpm prisma db push
```

## Start the development server

```bash
pnpm dev
```

The server starts at `http://localhost:3006` with Vite dev middleware and hot module reloading.

## Run tests

```bash
pnpm test        # Vitest unit tests
pnpm test:e2e   # Playwright E2E tests
```

## Validate before committing

```bash
pnpm lint
pnpm test
pnpm build
```

## Build for production

```bash
pnpm build
```

This generates Prisma client and builds the frontend into the `dist/` directory.

## Docker (full stack)

```bash
docker compose up --build
```

This builds the app container and starts both the app (port 3006) and PostgreSQL (port 5432).

## Project structure

```
src/
  client/          # GraphQL fragments and client types
  components/      # React UI components
  core/            # EventBus, engine hooks, generators
    events/        # EventBus, schemas, event types
    trainers/      # Trainer-specific logic
    analyze-session/  # Session analytics pipeline
  hooks/           # React hooks (use{Module}Engine patterns)
  lib/             # Utility libraries (prisma, auth, knowledge-base, etc.)
  server/          # Express server
    config/        # CORS, server config
    middleware/    # Auth, privacy middleware
    realtime/     # Socket.io duel handlers
    routes/       # API route handlers
    services/     # Business logic services
    schemas/      # Zod validation schemas
  tests/           # Vitest test files (*.test.ts and *.test.tsx)
  workers/         # Analytics web worker
tests/             # Playwright E2E tests
prisma/
  schema.prisma    # Database schema
  migrations/      # Prisma migrations
```

## Available scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Start development server with Vite HMR |
| `pnpm build` | Generate Prisma client and build frontend |
| `pnpm start` | Start production server |
| `pnpm test` | Run Vitest test suite |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm test:e2e:attached` | Run Playwright against a running server |
| `pnpm lint` | TypeScript type check |
| `pnpm validate` | Run core validation (Vitest) |
| `pnpm clean` | Remove `dist/` directory |
| `pnpm check:bundle` | Check bundle size budget |
