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
