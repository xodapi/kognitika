# Kognitika Domain Language

This document defines the implementation vocabulary for the current cognitive-training
bounded contexts. It is a living contract for code, tests, API documentation, and product
discussions.

## Bounded contexts

### Training

Owns a user's training interaction and authoritative completion:

- starts and validates a `GameAttempt`;
- records a completed `TrainingSession`;
- calculates the server-authoritative `score`;
- awards XP and updates the user's streak;
- exposes progress and leaderboard projections.

The existing database/API names `GameSession` and `gameType` are compatibility names for
this context's `TrainingSession` and `trainerType`. Rename them only through an explicit
API/database migration.

### Analytics

Owns privacy-safe interpretation of completed training:

- `AnalyticsSession` is a read projection of completed training data;
- `moduleId` identifies the analytics/knowledge-base module;
- `CompletedSessionAnalyticsJob` is a versioned analysis input;
- `CognitiveTrend` and summary records are derived outputs.

Analytics must not own training completion, XP, authorization, or user identity. It receives
references and privacy-minimized projections from Training.

### Cognitive Flow and Operations

Owns real-time conversation, notifications, outbox delivery, and operational integrations.
It is not authoritative for training completion and must tolerate retries, duplicate events,
restart, and unavailable external services.

## Canonical terms

| Term | Meaning | Avoid |
|---|---|---|
| Training session | One completed trainer run recorded by Training | Treating it as an analytics result |
| GameSession | Compatibility/database name for a training session | Introducing a second meaning |
| Game attempt | Server-issued challenge and one-time completion credential | Calling it a session |
| Trainer type | Stable runtime identifier such as `SCHULTE` | Using `moduleId` for persistence identity |
| Analytics module | Knowledge-base/analytics grouping such as `schulte` | Assuming it equals one trainer type |
| Score | Server-authoritative numeric result used for XP and comparisons | Calling it a diagnosis or cognitive ability |
| Analytics summary | Derived aggregate record | Treating it as raw interaction history |
| Cognitive trend | Derived direction/aggregate view over summaries | Treating it as a medical assessment |

## Context translation rules

1. `gameType` may be translated to an analytics `moduleId` only through an explicit registry
   or mapping owned by Analytics.
2. Analytics DTOs must not include Brain ID, email, tokens, raw metadata, screenshots, device
   identifiers, or raw event payloads unless a separately approved contract requires it.
3. Training owns lifecycle and invariants; Analytics owns derivation and interpretation.
4. User identity is an authorization input at the application boundary, not an analytics
   metric.
5. New public trainers must also satisfy the knowledge-base contract in `AGENTS.md`.

## Naming migration policy

Do not perform a broad rename solely for consistency. New code should use the context terms
above where it does not break an existing API or persistence contract. Compatibility names
should be isolated at adapters, repositories, and DTO mappers.
