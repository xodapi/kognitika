# Brain ID Identity Model

## Status

This document defines the current Brain ID storage and recovery contract and the future portable identity direction. It is a product/security contract, not a promise that QR or encrypted-file import is implemented today.

## Goals

- Keep public identity anonymous and Brain ID-first.
- Preserve identity continuity when app-state is reset.
- Keep raw Brain ID separate from generic app-state, analytics, logs, and telemetry.
- Prepare a future export/import path without binding identity to one browser profile or one domain-local storage implementation.

## Current Model

Brain ID is identity-bearing. Treat it like an anonymous credential, not like cache.

Server-side source of truth:

- `User.brainId`
- `User.pseudonym`
- training progress, ratings, streaks, and sessions linked to `User.id`

Browser storage:

- `kognitika:auth:token` stores the current access/session token.
- `kognitika:auth:refresh` is reserved for future refresh material.
- `kognitika:brainId` may cache Brain ID for recovery UX, but it belongs to the identity scope.
- app-state keys such as `kognitika:ui:*`, `kognitika:session:*`, and `kognitika:cache:*` are not identity.

Generic app-state cleanup must not delete identity keys. Identity reset is a separate flow and must warn that access to the anonymous profile can be lost if the user has not saved or restored the Brain ID.

## Recovery Contract

Current public auth surface:

- `POST /api/auth/brain` creates an anonymous Brain ID session.
- `POST /api/auth/restore` restores an anonymous session from a Brain ID.

Recovery screen and boot fallback language must distinguish:

- reset app-state: clears UI/session/cache state and preserves Brain ID/auth identity;
- reset identity: clears Brain ID/auth material and requires explicit confirmation.

The UI may tell users that progress is preserved only when it is actually linked to the server-side Brain ID/user record.

## Display Contract

Raw Brain ID must not be always visible in profile/dashboard surfaces. Public UI should:

- show pseudonym or a privacy-safe label by default;
- show a friendly status such as `Профиль защищен` or `Приватный режим`, not a legal-number badge near the user's name;
- display only a short masked Brain ID form unless the user explicitly reveals it;
- offer reveal/copy as a deliberate action with copy that reminds the user to store Brain ID in a private password manager or another protected place.

Legal/compliance details belong in help, documentation, or privacy screens. They should not be repeated next to the user identity on every profile view.

## Export Boundaries

There are two different export concepts:

- Analytics export: cognitive metrics/time-series for analysis. It must not include raw Brain ID, tokens, email, password hashes, or localStorage dumps.
- Identity export: future portable credential artifact for restoring access. This is not implemented yet.

Analytics export should use a non-portable label such as `Brain BR-SYNTH` or a pseudonym. It must not be sufficient to restore identity.

Future identity export/import requirements:

- user-initiated only;
- explicit warning and confirmation;
- encrypted at rest with a user-controlled passphrase or equivalent;
- QR/file payload versioned and schema-validated;
- no real production Brain IDs or tokens in tests, docs, fixtures, issue comments, or screenshots;
- import restores access to the same anonymous profile without exposing personal data in logs or telemetry.

Candidate recovery models for product review:

- manual Brain ID save: current baseline; simplest, but highest risk if the user loses or exposes the identifier;
- recovery phrase: familiar wallet-style UX; must be generated client-side, encrypted, and never logged;
- encrypted key file: better for desktop custody; requires clear backup guidance and import validation;
- QR transfer: useful for device handoff; must be short-lived or encrypted to avoid shoulder-surfing risk.

## Logging And Telemetry

Do not include raw Brain ID in:

- server logs;
- client-error telemetry;
- analytics events;
- admin/public API responses unless a reviewed endpoint explicitly requires identity restore;
- test snapshots or fixtures except synthetic values such as `BR-SYNTHETIC-...`.

Use `brainLabel`/`pseudonym` for display and admin context.

## Verification Checklist

- App-state reset preserves `IDENTITY_KEYS`.
- Identity reset is a separate explicit action.
- `/api/auth/brain` and `/api/auth/restore` return the Brain ID only to the active user flow.
- `/api/analytics/export` does not contain raw Brain ID or tokens.
- Tests and docs use synthetic IDs only.
