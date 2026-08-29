# Agent brief: #220 protected ADMIN recovery workflow

GitHub Issue: <https://github.com/xodapi/kognitika/issues/220>

## Goal

Review and harden the existing, manual, schema-guarded ADMIN recovery workflow
without broadening its authority. The normal case must remain dry-run. The only
supported write is the explicitly approved creation of one recovery admin after
all schema and review gates pass.

## Assigned worktree

- Path: `C:\project\kognitika-agent-220`
- Branch: `agent/220-admin-recovery-contract`
- Base: `main`

## Immediate action required

Do not make further edits in the shared `C:\project\kognitika` worktree.
`src/tests/production-db-governance.test.ts` is currently modified there.
Recreate or transfer only that narrow test patch into the assigned worktree,
then leave the shared worktree untouched for the coordinator.

## Allowed write set

- `.github/workflows/production-admin-recovery.yml`
- `docs/production-admin-recovery-runbook.md`
- `src/tests/production-db-governance.test.ts`
- `docs/agent-briefs/issue-220-admin-recovery.md` (append the report)

## Explicitly forbidden

- Prisma schema or migrations, deployment workflow, general auth code, server
  code, environment files, secrets, backups, and database data.
- Any production SSH, live recovery invocation, database mutation, or deploy.
- Files owned by #158, including migration baseline scripts and tests.

## Required checks

```powershell
& 'C:\Program Files\nodejs\node.exe' .\node_modules\vitest\vitest.mjs run --no-file-parallelism src/tests/production-db-governance.test.ts
& 'C:\Program Files\nodejs\node.exe' .\node_modules\typescript\bin\tsc --project tsconfig.tests.json --noEmit
git diff --check
```

## Acceptance criteria

1. Recovery workflow is manual, production-environment approved, serialized
   with other protected DB work, and dry-run by default.
2. The workflow accepts a repository-bound Issue or PR URL and does not expose
   database URLs, credentials, Brain IDs, user rows, JWTs, or generated
   recovery credentials in workflow output or artifacts.
3. Schema guards execute before credential generation or the supported write.
4. Tests encode every newly relied-upon security gate.
5. Append the required `## Report` below, then open a separate PR.

## Report

Status: [planned]
Branch: `agent/220-admin-recovery-contract`
Commit: `none`
Files changed: none
Checks: not run
Production/server touched: no
Secrets or user data added: no
Blockers or dependencies: shared worktree patch must be recreated in assigned worktree

## Report

Status: [implemented][verified]
Branch: `agent/220-admin-recovery-contract`
Commits: `6e0f0f1`, `11e7c1c`, `3e1a7e5`
Files changed: `.github/workflows/production-admin-recovery.yml`, `docs/production-admin-recovery-runbook.md`, `src/tests/production-db-governance.test.ts`, `docs/agent-briefs/issue-220-admin-recovery.md`
Checks: `& 'C:\Program Files\nodejs\node.exe' .\node_modules\vitest\vitest.mjs run --no-file-parallelism src/tests/production-db-governance.test.ts` - passed, 11 tests; `& 'C:\Program Files\nodejs\node.exe' .\node_modules\typescript\bin\tsc --project tsconfig.tests.json --noEmit` - passed; `git diff --check` - passed
Production/server touched: no
Secrets or user data added: no
Blockers or dependencies: none; local dependency install and Prisma Client generation were needed only to run checks in this fresh worktree. Coordinator additionally tightened repository-bound review URL validation and suppressed database-client write errors before the final verification.
