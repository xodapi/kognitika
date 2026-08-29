# Agent brief: #158 production Prisma migration baseline verification

GitHub Issue: <https://github.com/xodapi/kognitika/issues/158>

## Goal

Produce a reviewable, read-only verification that the committed migration
baseline safeguards correctly recognize the recovered production lineage,
including analytics migrations. This is an evidence and contract task, not a
new migration or production repair task.

## Assigned worktree

- Path: `C:\project\kognitika-agent-158`
- Branch: `agent/158-baseline-verification`
- Base: `main`

## Allowed write set

- `docs/agent-briefs/issue-158-migration-baseline-verification.md` (append the report)
- A new narrowly scoped test only if it demonstrates a missing, reproducible
  baseline-guard case.
- A new narrowly scoped documentation clarification only if test evidence shows
  the existing runbook is ambiguous.

## Explicitly forbidden

- `prisma/schema.prisma`, `prisma/migrations/**`, production environment files,
  database backups, or migration history.
- Any production SSH, deploy, database connection, `prisma migrate deploy`,
  `prisma migrate resolve`, `db push`, reset, or clean-rebuild action.
- `src/tests/production-db-governance.test.ts`, owned by #220.

## Required checks

```powershell
& 'C:\Program Files\nodejs\node.exe' .\node_modules\vitest\vitest.mjs run --no-file-parallelism src/tests/migration-baseline-state.test.ts src/tests/production-db-governance.test.ts
& 'C:\Program Files\nodejs\node.exe' .\node_modules\typescript\bin\tsc --project tsconfig.tests.json --noEmit
git diff --check
```

## Acceptance criteria

1. Document whether #158 is fully implemented by existing commits and evidence.
2. If a gap is found, prove it with one local regression test before changing
   the guard or docs.
3. If no gap is found, submit a docs-only evidence report and recommend closing
   or relabelling the issue.
4. Append the required `## Report` below, then open a separate PR.

## Report

Status: [planned]  
Branch: `agent/158-baseline-verification`  
Commit: `none`  
Files changed: none  
Checks: not run  
Production/server touched: no  
Secrets or user data added: no  
Blockers or dependencies: none

## Report

Status: [WARNING]
Branch: `agent/158-baseline-verification`
Commit: `none`
Files changed: `docs/agent-briefs/issue-158-migration-baseline-verification.md` only
Checks:
- `pwd` completed: working directory was `C:\project\kognitika-agent-158`.
- `git branch --show-current` completed: branch was `agent/158-baseline-verification`.
- `git status --short` completed before any work: clean output.
- `git remote -v` completed: `origin` was `https://github.com/xodapi/kognitika.git` for fetch and push.
- `& 'C:\Program Files\nodejs\node.exe' .\node_modules\vitest\vitest.mjs run --no-file-parallelism src/tests/migration-baseline-state.test.ts src/tests/production-db-governance.test.ts` failed before tests could run because `C:\project\kognitika-agent-158\node_modules\vitest\vitest.mjs` was unavailable (`MODULE_NOT_FOUND`).
- `& 'C:\Program Files\nodejs\node.exe' .\node_modules\typescript\bin\tsc --project tsconfig.tests.json --noEmit` was not run because the required local TypeScript binary was unavailable.
- `git diff --check` was not run after the user instructed to append this report and return immediately.
Production/server touched: no
Secrets or user data added: no
Blockers or dependencies: Required Vitest and TypeScript binaries were unavailable because `node_modules` was initially absent. Attempts to install dependencies were stopped at user request; no further `pnpm`/`npm`/`bun` commands were run after that instruction.
Read-only source evidence:
- `src/tests/migration-baseline-state.test.ts` already verifies the exact observed rolled-back-plus-applied baseline fingerprint, rejects missing/extra/unfinished/unapproved migration history, accepts full migrated history including `20260803022000_add_analytics_outbox` and `20260804000000_add_completed_session_analytics_jobs`, and rejects a history that stops before those analytics migrations.
- `scripts/migration-baseline-state.mjs` defines `MIGRATION_ORDER` including the production analytics migrations and only returns `compatible` for the complete approved successful sequence, optionally with the single retained rolled-back baseline audit record.
- `docs/database-migration-baseline.md` documents that post-deploy verification requires the complete successful sequence including analytics outbox and completed-session analytics job migrations, and that other rolled-back record layouts fail closed.
- `src/tests/production-db-governance.test.ts` verifies the production deploy path runs `node scripts/check-migration-baseline.mjs` before production build/restart steps and keeps production DDL in the manual protected DB-migration workflow.
Recommendation: Existing source evidence indicates #158 is implemented by committed baseline guard/tests/docs and should be closed or relabelled as verification-blocked only because local dependency binaries were unavailable in this worktree.
