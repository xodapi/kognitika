# Cognitive Platform Integration Guide (v1.0)

This document describes the technical architecture and integration process for the "Cognitika" platform, intended for other AI agents and developers.

## 1. Tech Stack
- **Frontend**: React (Vite) + Tailwind CSS + Motion (`motion/react`).
- **Backend (Real-time)**: Express + Socket.io.
- **Backend (Storage)**: Prisma + PostgreSQL for runtime product data.
- **Database Architecture**: PostgreSQL for runtime product data. Firebase is not part of the runtime architecture.

## 2. Firebase Status
Firebase was removed from the runtime architecture because the product uses Brain ID, Prisma, and PostgreSQL as the active identity and data path.
Do not reintroduce Firebase Auth, Firestore rules, or Firebase client configuration unless a new issue explicitly defines a product need, privacy review, deploy owner, and rollback plan.

## 3. Server Configuration (Full-Stack)
- **Port**: 3006 by default. Keep `server.ts`, `.env.example`, Dockerfile, `docker-compose.yml`, README, and deployment configuration aligned if this changes.
- **Socket.io**: Used for the "Cognitive Flow" real-time chat.
- **Production-ready**: The `server.ts` handles both API routes and static serving of the Vite build.

## 4. Development Workflow
1. Declare new environment variables in `.env.example`.
2. Keep Prisma schema, API contracts, tests, README, and deployment configuration aligned.
3. Use repository-first deploy flow; direct production patches are forbidden outside documented emergency hotfixes.

## 5. Mandatory Agent Start Checklist

Before making any repository, server, or GitHub change, every agent MUST run and inspect:

1. `pwd` - confirm the working directory is the local repository: `C:\project\kognitika`.
2. `git branch --show-current` - confirm the current branch is intended for the task.
3. `git status --short` - confirm there are no unrelated or unknown local changes.
4. `git remote -v` - confirm `origin` points to `https://github.com/xodapi/kognitika.git`.

If any check shows `/opt/kognitika`, `ssh stroy`, a dirty unrelated worktree, or an unexpected remote/branch, stop and report `[WARNING]` before proceeding.

## 6. Canonical Deploy Flow

Normal production changes MUST follow the repository-first flow:

```text
local changes
  -> git commit
  -> git push / GitHub PR
  -> merge or approved branch
  -> server: git pull
  -> pnpm install --frozen-lockfile
  -> pnpm build
  -> restart service
  -> verify /api/health and external HTTPS smoke
```

Direct edits to `/opt/kognitika/*`, `/opt/kognitika/dist/*`, or other production files are forbidden during normal work.

Emergency hotfix exception:

- Allowed only when production is actively broken and the coordinator explicitly approves it.
- Make a timestamped backup before touching production files.
- Record the exact files changed and commands used.
- Immediately reproduce the fix in git, commit it, push it, and deploy again through the canonical flow.
- Report the temporary server patch as `[WARNING]` until git and production are back in sync.

## 7. Agent Write-Set Isolation

Every agent must keep a clear write set:

- Touch only files required for the assigned task.
- Do not revert, rewrite, or reformat files owned by another active agent unless the coordinator explicitly approves it.
- If a required file has unrelated local changes, inspect them and work with them; do not discard them.
- If the task requires overlapping edits, report the overlap and wait for coordination.
- Generated artifacts, screenshots, logs, and test outputs must not be committed unless they are explicitly part of the deliverable.

## 8. Required Status Report Format

Final reports and GitHub issue comments must use explicit status markers:

- `[implemented][verified]` - code/docs/config changed and the relevant verification was run successfully.
- `[implemented][unverified]` - implementation exists but verification could not be completed; explain why.
- `[planned]` - not implemented yet; include concrete next acceptance criteria.
- `[WARNING]` - risk, production drift, direct server patch, missing verification, secret/PII risk, or cross-agent conflict.

Each report must include:

- branch name and commit hash when a commit was created;
- files or areas changed;
- verification commands and results;
- whether production/server was touched;
- confirmation that no real user data, secrets, tokens, raw Brain ID, or private telemetry were added.
