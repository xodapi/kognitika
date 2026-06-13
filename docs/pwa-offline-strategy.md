# PWA And Offline-First Strategy

## Status

Service Worker registration is intentionally disabled in production right now.

The current `public/sw.js` is a revocation worker: if an older browser profile still has a previous Service Worker, it clears caches, unregisters itself, and navigates open clients. `index.html` also unregisters existing Service Workers from the boot recovery layer.

Do not re-enable PWA/offline behavior until this document's acceptance gates are implemented and reviewed.

## Why This Exists

The previous white-screen failure class was caused by a fragile boot layer and stale browser state. Offline-first can be valuable, but a Service Worker is also a second deploy/runtime layer. It must be explicit, observable, and testable before it is allowed to control the app.

## Required Implementation Shape

Use Workbox or an equivalent explicit strategy layer. Do not add an opaque hand-written cache handler.

Required files before enablement:

- `src/pwa/workbox-strategy.ts` or equivalent route strategy config;
- Playwright offline/update specs;
- production header checks for `index.html`, `/sw.js`, and `/assets/*`;
- rollback/revocation notes.

## Cache Strategy

| Resource | Strategy | Notes |
| --- | --- | --- |
| `index.html` | network-first or no-store/revalidate | Never serve a stale shell over a newer build. |
| `/sw.js` | no-store/update-check | Browser must see updates immediately. |
| `/assets/*` | cache-first immutable | Only for hashed Vite assets. Keep old hashed bundles available for at least 24 hours after deploy. |
| API routes | network-only by default | Cache only after privacy/security review. |
| Auth, Brain ID, progress | network-only | No offline persistence until identity model and encryption are reviewed. |
| client-error telemetry | best-effort network-only | Never store raw errors containing private data offline. |

## Privacy Rules

- Do not cache tokens, raw Brain ID, localStorage dumps, or user progress payloads in Cache Storage.
- Do not include real user data in offline fixtures.
- Synthetic fixtures must use names like `BR-SYNTHETIC-...`.
- Offline identity export/import is a separate feature and must follow `docs/brain-id-identity.md`.

## Required E2E Tests Before Enablement

- App opens offline after one successful online visit.
- A new build updates without a white screen.
- An old cached app cannot override a newer HTML shell.
- `/sw.js` update or revocation removes a bad Service Worker.
- Dirty localStorage profile plus old caches still reaches recovery UI instead of a blank screen.

## Observability

Client error reports must include:

- `build_id`;
- `storage_schema_version`;
- `sw_controller`;
- `route`.

No raw Brain ID, token, email, or private storage values may be included.

## Rollback And Revocation

If PWA is enabled and causes production issues:

1. Deploy a revocation `/sw.js` that deletes all named caches and unregisters itself.
2. Keep `/sw.js` served with `Cache-Control: no-store`.
3. Keep `index.html` served with `Cache-Control: no-store`.
4. Verify a dirty profile with old caches and old Service Worker reaches the app or recovery UI.
5. Keep old hashed bundles available for at least 24 hours.

## Current Guardrail

Until Workbox strategy and offline/update E2E tests exist, the app must keep:

- no active Service Worker registration from React/Vite code;
- no manifest link enabled in `index.html`;
- revocation-only `public/sw.js`;
- E2E check that a fresh profile has zero Service Worker registrations.
