# Kognitika

Private MVP for cognitive training and adaptive analytics.

## Project Status

Current status: MVP / technical stabilization.

The project is under active development. Build reproducibility, frontend/API contracts, analytics boundaries, and security hardening are being stabilized before new product features are added.

## Tech Stack

- React + Vite + TypeScript
- Express + Socket.io
- Prisma + PostgreSQL
- Firebase client integration for selected applet flows
- Vitest
- Rust/WASM analytics layer: experimental / under stabilization

## Run Locally

Prerequisites:

- Node.js 22
- pnpm 10.22.0
- PostgreSQL

Install dependencies:

```bash
pnpm install
```

Create local environment file:

```bash
cp .env.example .env
```

Start the app:

```bash
pnpm dev
```

Default local port: `3006`.

## Environment Variables

See `.env.example`.

Do not commit real secrets. Use local `.env` files or deployment secrets.

## Scripts

- `pnpm dev` - start the full-stack development server
- `pnpm lint` - run TypeScript checks
- `pnpm test` - run the full Vitest suite
- `pnpm validate` - run the core training-engine gate
- `pnpm build` - generate Prisma client and build the frontend
- `pnpm start` - start the server

## Current Stabilization Priorities

1. Restore reproducible toolchain and CI gate.
2. Fix frontend/API contract mismatches.
3. Harden game-save and duel trust boundaries.
4. Persist feedback through one clear storage path.
5. Resolve analytics/WASM strategy and event contracts.
6. Split EventBus core from browser/server side effects.

Tracking issue: https://github.com/xodapi/kognitika/issues/10

## Testing

Before merging changes, run:

```bash
pnpm lint
pnpm test
pnpm validate
pnpm build
```

CI runs the same gates on push and pull requests.

## License

Private repository. License is not defined for public distribution.
