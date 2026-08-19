# Longitudinal Backfill and Recompute Contract (v1)

Related issue: #144
Machine-readable contract:
[`contracts/longitudinal-backfill-recompute-v1.json`](../contracts/longitudinal-backfill-recompute-v1.json)

## Purpose and status

This is a versioned, non-destructive contract for a future longitudinal
projection backfill or recompute. It defines the required boundaries before
any implementation is proposed. It does not create a migration, schema,
worker, API, UI, production action, or external write.

The contract covers derived longitudinal projections only. It must not be used
to repair, normalize, delete, or otherwise mutate source records.

## Authority and protected internal boundaries

Prisma remains the production DDL owner. Any future persistence change must be
reviewed as a Prisma schema and migration change. The only permitted writer is
the Node process using Prisma. Rust components are forbidden from database
access, DDL, migrations, and writes for this flow.

The recompute entry point is an internal protected boundary, not a public write
API. It must enforce authorization before accepting a request and must not
expose direct database-write capability to browser clients, integrations, or
untrusted callers. It must not mutate source data. Outbox purge is explicitly
outside this contract and must not be coupled to recompute, rollback, retry,
retention, or privacy deletion.

Inputs, output projections, logs, metrics, and audit records must exclude raw
identity (including Brain ID, user IDs, email, and device identifiers), raw
private telemetry, secrets, and tokens. Operational records may contain only
opaque request keys, opaque projection versions, and aggregate-only audit
fields. A future implementation must receive privacy review of its exact
aggregate input and output shape.

## Preconditions

Before a run can be accepted, all of the following are required:

1. An approved, versioned projection definition and deterministic source read
   boundary (for example, a declared snapshot or equivalent cutoff).
2. Prisma schema/migration review if persistence is needed; Prisma remains the
   sole DDL authority.
3. Privacy approval for aggregate-only reads, writes, observability, and audit
   data.
4. An approved retention policy for projection versions.
5. Storage and constraints for a unique request key and lease.
6. A transaction boundary that can atomically publish a fully completed
   projection version.

## Idempotency, lease, and publish protocol

Every request has a unique opaque request key. Retrying that key must reuse
the existing request and its result; it must not start a second recompute or
produce another projection version. A lease is required, with at most one
active holder for a request key. A worker may reclaim only an expired lease
according to the reviewed implementation rules.

The writer builds a new, versioned projection append-only. It may publish only
after the new projection is complete. Publishing the active-version pointer is
atomic with the completed-state transition so readers cannot observe a partial
projection as active.

## Immutability, rollback, retention, and deletion

Recompute always creates a new projection version; historical projection rows
are immutable and never overwritten. Rollback changes the active pointer to
an already existing, complete version. It does not delete projections or
rewrite historical rows.

Projection versions are retained until their approved retention-policy expiry.
The only exception is a valid privacy deletion request: it may remove affected
projection data and override append-only retention. That operation must leave
an auditable tombstone containing no raw identity or private telemetry. This
exception does not authorize source mutation or outbox purge.

## Explicit non-goals

This contract does not implement or authorize:

- a Prisma migration, database schema, worker, scheduler, API, UI, or
  production run;
- public write access or external writes;
- source-data repair, deletion, or mutation;
- outbox purge;
- a Rust database writer, database connection, DDL owner, or migration path;
- scientific interpretation of derived projections.

A future implementation must separately define the data model, authorization,
lease expiration handling, failure recovery, audit fields, retention duration,
privacy-deletion workflow, and production rollout plan while preserving this
contract.
