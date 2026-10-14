# Protected database work coordination

These briefs isolate the two protected production-database workstreams. Each
agent owns its named brief and must append its report there on its own branch.

## Non-negotiable rules

1. Work only from the assigned Git worktree and branch, never from the shared
   `C:\project\kognitika` worktree.
2. Do not run production SSH, Prisma migration commands against production,
   `migrate resolve`, database resets, backup restores, or deployment workflows.
   Those actions remain coordinator-only and require separate explicit approval.
3. Do not modify another workstream's files. If a required file overlaps, stop
   and report the overlap in the assigned brief.
4. Keep commits scoped, run the specified local checks, and open a separate PR.
   Do not push directly to `main`.
5. Never include secrets, `DATABASE_URL`, Brain IDs, recovery credentials,
   user data, database rows, or raw telemetry in commits, reports, or logs.

## Reporting protocol

Each agent appends a `## Report` section to its own brief before handoff:

```md
## Report

Status: [implemented][verified] | [planned] | [WARNING]
Branch: `agent/...`
Commit: `<sha>` (or `none`)
Files changed: ...
Checks: `<command>` — result
Production/server touched: no
Secrets or user data added: no
Blockers or dependencies: ...
```

The agent then comments on its assigned GitHub Issue with only the status,
commit/PR link, and link to the report file. The coordinator reviews and
merges one workstream at a time.
