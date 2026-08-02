# ADR: Rust/PostgreSQL migration authority

- **Status:** Accepted, current implementation boundary
- **Date:** 2026-08-02
- **Issue:** #166
- **Decision ID:** `rust-postgresql-migration-authority`
- **Machine-readable policy:** `contracts/rust-postgresql-migration-authority.json`

## Context

Kognitika is evaluating a gradual Node/Prisma to Rust migration while retaining
one PostgreSQL database. A database schema must have exactly one production DDL
owner at every point. Rust analytics (`kognitika-core`) is currently a
computation boundary, not a persistence boundary. A future Axum analytics
sidecar is likewise not authorized to connect to PostgreSQL directly.

The repository's existing Prisma migration and deployment preflight logic is
outside this ADR's write set. This ADR specifies the contract that future Rust
work must satisfy without changing those shared operations.

## Decision

1. **Prisma is the only current production DDL owner for `public`.** Prisma's
   `_prisma_migrations` history remains authoritative.
2. **Rust is read-only at the database boundary.** `kognitika-core` and any
   future Axum analytics sidecar are required not to receive `DATABASE_URL` or
   PostgreSQL credentials, execute DDL or SQLx migrations, or write product
   data. Any input they process is passed through an owning Node service. This
   policy does not itself inspect a container or environment manifest, so it is
   not runtime enforcement of those requirements.
3. **Prisma and SQLx must never migrate the same schema concurrently.** SQLx
   migrations are forbidden for production `public` while Prisma owns it.
4. **An ownership transfer is a separate, reviewed PR.** It must explicitly
   designate the next DDL owner and provide schema compatibility validation,
   rollback rehearsal, least-privilege review, and privacy-safe observability
   evidence. This ADR neither implements nor authorizes a transfer.
5. **Rollback always restores Node/Prisma authority.** Each present and planned
   phase must leave the Node/Prisma path deployable and able to remain the DDL
   owner after rollback.

## Phases

| Phase | Status | DDL owner | Rust DB access | Rollback |
| --- | --- | --- | --- | --- |
| Current Prisma authority | Current | Prisma | Forbidden | Node/Prisma remains authoritative |
| Rust read-only/shadow | Planned | Prisma | Forbidden, Node-mediated inputs only | Disable Rust path; retain Node/Prisma |
| Bounded Rust write owner | Not authorized | Prisma until a separate transfer PR is approved | Forbidden | Retain or restore Node/Prisma |
| Explicit full transfer | Not implemented | Prisma until separately approved | Forbidden | Restore Node/Prisma per reviewed plan |

The latter two names describe future decision points, not permissions. Their
presence does not allow Rust writes, database credentials, migrations, or a
second migration engine.

## PostgreSQL compatibility and reader contract

Before any approved transfer, the policy applies to all supported database
states: fresh, legacy production-like, and fully migrated. In every state,
Node/Prisma remains operational, Rust reader access is Node-mediated only, and
rollback restores Node/Prisma authority.

A Rust reader contract must version and validate, before consuming a schema:

- nullable versus required fields;
- PostgreSQL enum values;
- required indexes for its query shapes;
- foreign-key relationships and delete behavior;
- idempotency keys and uniqueness constraints;
- transaction boundaries and retry/rollback behavior.

This policy deliberately does not duplicate or alter the shared Prisma schema
or migration baseline files.

## Least privilege and privacy-safe observability

- A dedicated Node/Prisma migration principal is required before a future
  ownership transfer. This ADR does not assert that one has been provisioned or
  verified in the current environment. Rust components are required not to
  receive `DATABASE_URL` or database credentials; container/environment
  manifest validation must enforce this before a Rust service deployment.
- Rust component logs, metrics, traces, fixtures, and contract reports must not
  contain raw Brain ID, secrets, tokens, or raw private telemetry.
- Observability should use phase identifiers, component names, outcome classes,
  and approved aggregate counters. It must not use payload logging as a
  migration diagnostic.

## Consequences

- Rust adoption can proceed for deterministic computation and Node-mediated
  read/shadow paths without introducing a second production DDL authority.
- A future transfer has an explicit review boundary rather than becoming an
  accidental consequence of adding SQLx or an Axum service.
- The standalone Vitest contract test validates this policy without modifying
  current Prisma preflight, migration, or deploy surfaces.
