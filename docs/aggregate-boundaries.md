# Training Aggregate Boundaries

## Purpose

This document records the consistency decisions for the authoritative game-save transaction.
It prevents analytics, notifications, and UI transport concerns from silently becoming part
of the training lifecycle.

## Aggregates

### Training session aggregate

`GameSession` is the persistence root for one completed training run. Its invariants include:

- the session belongs to exactly one user;
- the stored score is computed server-side;
- completion is immutable after creation, except for explicitly authorized metadata updates;
- a client run is idempotent for a user;
- an attempt can link to at most one completed session.

`CompletedGameRepository.complete()` is the current transactional application boundary that
creates this aggregate and coordinates its required side effects.

### User progress aggregate

The user progress fields changed by completion, including experience, level, streak, and
last-played time, are a separate aggregate. The current transaction updates User and the
session together to guarantee that XP is not awarded without the authoritative session.

The transaction does not imply that all future user profile or analytics reads must be
strongly consistent. Those reads may use projections when product requirements permit.

### Attempt reservation

`GameAttempt` is a short-lived credential/reservation boundary. Its important transitions
are issued, reserved/consumed, and linked to a session. Reservation is atomic with completion
to prevent double awards under concurrent requests.

## Transaction guarantees

The current completion transaction guarantees:

| Operation | Consistency |
|---|---|
| Session creation and server score | Atomic |
| Attempt reservation and session link | Atomic |
| XP/streak update and XP event | Atomic |
| Completed analytics job metadata | Atomic when supplied |
| Analytics outbox metadata | Atomic when enabled |
| EventBus subscribers | Best effort after persistence |
| Rust/sidecar analysis | Asynchronous and non-authoritative |
| Leaderboard/profile/export reads | Eventually reflect committed state |

## Explicit non-members

These are not children of the Training session aggregate:

- Analytics trend calculations and summaries;
- Rust sidecar state;
- Telegram notifications;
- Socket.io rooms and Cognitive Flow messages;
- browser-local event recorder state;
- leaderboard and profile read projections.

They consume published identifiers or aggregate data through adapters and must not block or
roll back authoritative training completion.

## Future change rules

1. Add a domain-language test when changing an invariant or allowed lifecycle transition.
2. Keep transaction changes separate from analytics algorithm changes.
3. Use the outbox for durable asynchronous work; do not use the in-process EventBus as a queue.
4. Consider eventual consistency only after idempotency, retry, and reconciliation behavior
   is specified.
5. Do not split the transaction into a remote service call without a replacement consistency
   and recovery design.
