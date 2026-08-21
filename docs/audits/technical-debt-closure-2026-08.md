# Technical Debt Closure Report, August 2026

## Scope

This report closes current implementation and documentation debt. Future
product initiatives, including portable identity, wearable integrations, WASM
promotion, and Rust runtime authority, remain explicitly deferred until their
separate product, security, and deployment gates are approved.

## Closed items

- Privacy notice is a canonical, non-navigable system route. It is excluded
  from training knowledge-base requirements and has route, accessibility, and
  external-inventory-link regression coverage.
- The durable analytics inventory is explicit: 19 registered game-save
  modules are the canonical adopter set. Collector-only and presentation-only
  modules are not represented as pending durable adopters.
- Analytics outbox retention is bounded to 100 completed rows per cycle.
  Shutdown stops the worker before deferring Prisma disconnect until active
  HTTP requests drain, within the existing grace window.
- Protected outbox operational responses have aggregate-only privacy
  contracts, rollout readiness, freshness, expiry, and `schemaVersion: 1`.
- The checked-in Russian Wiki API reference accurately states that
  `/api/docs` and `/api/docs.json` are not live.

## Evidence

- Privacy navigation and knowledge-base contracts: 15/15 passed.
- Analytics registry, collector delivery, and game-save contracts: 73/73
  passed.
- Analytics outbox, shutdown, admin, sidecar, and canary contracts: 41/41
  passed.
- TypeScript typecheck, Prisma generation, and production Vite build passed.
- The full local suite passed 663 tests; its two remaining failures preceded
  privacy-route integration and were resolved by the route-contract work.
- GitHub CI and Android were green through commit `830418e`. Each subsequent
  commit requires its own remote CI confirmation after publication.

## External closure conditions

- Factory Wiki remote publication requires authenticated Wiki access. The
  checked-in `droid-wiki-ru` source is current, but remote publication must be
  confirmed by its owning workflow.
- Production-only privacy, retention, deletion, infrastructure, and legal
  claims remain owner-dependent as documented in
  `privacy-data-processing-inventory.md`; they are not claimed closed by
  source review alone.
