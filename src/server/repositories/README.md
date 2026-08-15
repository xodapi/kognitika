# Repository Pattern — Phase 1: Game Domain

This directory defines **domain repository interfaces** that abstract persistence operations from the application layer.

## Goal

Eliminate direct `import prisma from '../../lib/prisma.ts'` from routes and services, so that:

- Application logic depends on interfaces, not concrete infrastructure (DIP compliance)
- Unit tests can inject in-memory repositories without module mocking
- Switching from Prisma to another ORM/store requires changing only the infrastructure layer

## Current Implementation

### Interfaces

- **`GameSessionRepository`** — completed game sessions (findCompletedByUser, createCompleted, replaceMetadata)
- **`UserRepository`** — user progress, experience, leaderboard (findById, recordProgress, findTopByExperience)
- **`GameAttemptRepository`** — challenge-based attempt lifecycle (create, reserve, attachSession)
- **`AnalyticsSessionRepository`** — privacy-safe completed-session projections for analytics

### Prisma Implementations

Located in `src/server/infrastructure/prisma/`:

- `PrismaGameSessionRepository`
- `PrismaUserRepository`
- `PrismaGameAttemptRepository`
- `PrismaAnalyticsSessionRepository`

### Dependency Injection

`src/server/infrastructure/container.ts` provides:

```ts
import { getGameRepositories } from '../infrastructure/container.ts';

const repos = getGameRepositories();
const sessions = await repos.gameSessions.findCompletedByUser(userId);
```

For tests:

```ts
import { setGameRepositories, resetGameRepositories } from '../infrastructure/container.ts';

beforeEach(() => {
  setGameRepositories({
    gameAttempts: new InMemoryGameAttemptRepository(),
    gameSessions: new InMemoryGameSessionRepository(),
    users: new InMemoryUserRepository(),
  });
});

afterEach(() => {
  resetGameRepositories();
});
```

## Migration Status

### ✅ Phase 1 — Game Domain (Completed)

**Migrated:**
- `src/server/services/game-attempt.ts` — uses `repos.gameAttempts`
- `src/server/routes/game.ts` — endpoints `/progress`, `/leaderboard`, `/session/:id/metadata` use repositories

**Verification:**
- TypeScript typecheck: ✅ passed
- `src/tests/game-attempt.test.ts`: ✅ 1/1 passed
- `src/tests/game-route.test.ts`: ✅ 6/6 passed
- `src/tests/leaderboard-route.test.ts`: ✅ 5/5 passed
- `src/tests/game-save.test.ts`: ✅ 44/44 passed

### 🔄 Phase 2 — Game Save Transaction (Planned)

**Target:** `src/server/services/game-save.ts`

Current state: 273-line transaction script with 9 responsibilities. Needs:

1. Extract validators: `AttemptValidator`, `ReplayResolver`
2. Extract policies: `GameScorePolicy`, `StreakPolicy`
3. Inject repositories via constructor instead of direct Prisma import
4. Create `CompletedGameRepository` for the full transaction orchestration

See issue #256 for acceptance criteria.

### ✅ Phase 3 — Analytics Domain (Completed)

**Migrated:**
- `src/server/services/analytics/comparison.ts`
- `src/server/services/analytics/profile.ts`
- `src/server/services/analytics/export.ts`

The analytics services now depend on `AnalyticsSessionRepository`; Prisma access is isolated in
`PrismaAnalyticsSessionRepository`. The repository exposes bounded, aggregate-friendly queries
instead of database rows or Prisma types.

Summary persistence and trend queries remain behind their existing persistence service boundary
and are not part of this session projection repository.

### 🔄 Phase 4 — Leaderboard Sync (Planned)

**Target:** `src/server/routes/leaderboard.ts`

Sync endpoint currently uses raw Prisma aggregations. Extract into:

- `LeaderboardSyncService`
- `XpEventRepository`

### 🔄 Phase 5 — Test Repositories (Planned)

Create in-memory implementations:

- `InMemoryGameAttemptRepository`
- `InMemoryGameSessionRepository`
- `InMemoryUserRepository`

Update existing tests to use `setGameRepositories()` instead of vi.mock.

## Design Principles

1. **Interfaces define capabilities, not storage shape** — repository methods reflect use cases, not database tables.
2. **No Prisma types in interfaces** — use domain types; convert at the infrastructure boundary.
3. **Transaction abstraction is deferred** — Phase 1 repositories accept the global Prisma client; Phase 2 will add unit-of-work pattern.
4. **Backward compatibility preserved** — existing tests mock `../lib/prisma.ts` and continue working; migration to `setGameRepositories` is optional.

## References

- **Issue #257** — Repository pattern foundation
- **Issue #255** — Game route separation (depends on #257)
- **Issue #256** — Game-save refactoring (depends on #257)
- [Clean Architecture — The Dependency Rule](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [POEA — Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
