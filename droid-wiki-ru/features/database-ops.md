# Database Operations (Prisma + PostgreSQL)

**ORM**: Prisma 5.x · **DB**: PostgreSQL 16 · **Pool**: PgBouncer (transaction mode) · **Migrations**: `prisma migrate deploy`

---

## Schema Overview

### Core Models

```prisma
// prisma/schema.prisma

model User {
  id            String    @id @default(cuid())
  brainId       String    @unique @db.Uuid
  pseudonym     String    @unique
  email         String?   @unique
  passwordHash  String?   // Legacy, nullable
  role          Role      @default(USER)
  level         Int       @default(1)
  experience    Int       @default(0)
  rating        Int       @default(1000)
  streakDays    Int       @default(0)
  lastPlayedAt  DateTime?
  preferences   Json      @default("{}")
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      GameSession[]
  duels         Duel[]    @relation("DuelCreator")
  duelOpponent  Duel[]    @relation("DuelOpponent")
  feedback      Feedback[]
  ideas         Idea[]
  votes         IdeaVote[]
  exports       AnalyticsExportLog[]

  @@index([role])
  @@index([lastPlayedAt])
  @@index([rating])
}

model GameSession {
  id           String   @id @default(cuid())
  userId       String
  gameType     GameType
  startedAt    DateTime @default(now())
  completedAt  DateTime?
  score        Int?
  accuracy     Float?
  durationMs   Int?
  metadata     Json     @default("{}")
  events       Json     @default("[]") // Raw events for analysis

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, gameType])
  @@index([startedAt])
  @@index([userId, startedAt])
}

model Duel {
  id             String     @id @default(cuid())
  creatorId      String
  opponentId     String?
  moduleId       String
  status         DuelStatus @default(WAITING)
  seed           String     // Deterministic seed
  config         Json       @default("{}")
  creatorScore   Int?
  opponentScore  Int?
  winnerId       String?
  startedAt      DateTime?
  finishedAt     DateTime?
  createdAt      DateTime   @default(now())

  creator        User       @relation("DuelCreator", fields: [creatorId], references: [id])
  opponent       User       @relation("DuelOpponent", fields: [opponentId], references: [id])
  actions        DuelAction[]

  @@index([status, moduleId])
  @@index([creatorId, status])
  @@index([opponentId, status])
}

model DuelAction {
  id        String   @id @default(cuid())
  duelId    String
  userId    String
  t         Int      // Client timestamp
  cellId    Int
  reaction  Int      // ms
  createdAt DateTime @default(now())

  duel      Duel     @relation(fields: [duelId], references: [id], onDelete: Cascade)

  @@index([duelId, createdAt])
}

model Feedback {
  id          String        @id @default(cuid())
  trackingNum String        @unique
  userId      String
  type        FeedbackType
  title       String
  description String
  status      FeedbackStatus @default(OPEN)
  adminReply  String?
  repliedAt   DateTime?
  repliedBy   String?
  metadata    Json          @default("{}")
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  user        User          @relation(fields: [userId], references: [id])

  @@index([status, createdAt])
  @@index([userId, createdAt])
}

model Idea {
  id          String     @id @default(cuid())
  userId      String
  title       String
  description String
  status      IdeaStatus @default(OPEN)
  tags        String[]
  voteCount   Int        @default(0)
  adminComment String?
  githubIssue String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  user        User       @relation(fields: [userId], references: [id])
  votes       IdeaVote[]

  @@index([status, voteCount])
  @@index([userId, createdAt])
}

model IdeaVote {
  id      String @id @default(cuid())
  ideaId  String
  userId  String
  value   Int    // 1 or -1
  createdAt DateTime @default(now())

  idea    Idea   @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  user    User   @relation(fields: [userId], references: [id])

  @@unique([ideaId, userId])
}

model AnalyticsExportLog {
  id            String   @id @default(cuid())
  userId        String
  modules       String[]
  sessionCount  Int
  format        String
  fileSize      Int
  createdAt     DateTime @default(now())

  user          User     @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
}

model AdminAuditLog {
  id        String   @id @default(cuid())
  adminId   String
  action    String
  targetType String?
  targetId  String?
  before    Json?
  after     Json?
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())

  @@index([adminId, createdAt])
  @@index([targetType, targetId])
}

enum Role { USER ADMIN }
enum GameType { SCHULTE STROOP NBACK MENTAL_MATH TYPING ALPHABET_TABLE SPATIAL STROOP_ALPHABET LUSCHER ... }
enum DuelStatus { WAITING READY PLAYING FINISHED CANCELLED }
enum FeedbackType { BUG IMPROVEMENT IDEA OTHER }
enum FeedbackStatus { OPEN IN_REVIEW NEEDS_INFO RESOLVED REJECTED }
enum IdeaStatus { OPEN PLANNED IN_PROGRESS IMPLEMENTED REJECTED }
```

---

## Connection Pool (PgBouncer)

### `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: kognitika
      POSTGRES_USER: kognitika
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    command: >
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c work_mem=16MB
      -c maintenance_work_mem=256MB

  pgbouncer:
    image: edoburu/pgbouncer:latest
    environment:
      DATABASE_URL: postgres://kognitika:${DB_PASSWORD}@postgres:5432/kognitika
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 1000
      DEFAULT_POOL_SIZE: 25
      MIN_POOL_SIZE: 5
      RESERVE_POOL_SIZE: 5
      RESERVE_POOL_TIMEOUT: 5
    ports:
      - "6432:6432"
    depends_on:
      - postgres
```

### Prisma Config

```typescript
// prisma/client.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.DATABASE_URL_POOLED,
    },
  },
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Middleware: Soft delete for User
prisma.$use(async (params, next) => {
  if (params.model === 'User' && params.action === 'delete') {
    params.action = 'update';
    params.args = { where: params.args.where, data: { isActive: false } };
  }
  return next(params);
});

// Middleware: Query timing (dev)
if (process.env.NODE_ENV === 'development') {
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();
    if (after - before > 100) {
      console.warn(`[Prisma Slow] ${params.model}.${params.action} took ${after - before}ms`);
    }
    return result;
  });
}
```

---

## Migrations

### Workflow

```bash
# 1. Edit schema.prisma
# 2. Generate migration
pnpm prisma migrate dev --name add_duel_rematch_count

# 3. Review generated SQL in prisma/migrations/.../migration.sql
# 4. Commit migration file + schema.prisma
# 5. CI/CD runs: pnpm prisma migrate deploy
```

### Naming Convention

| Prefix | Meaning | Example |
|---|---|---|
| `add_` | New table/column | `add_duel_elo_history` |
| `rename_` | Rename | `rename_user_rating_to_elo` |
| `change_` | Type/constraint change | `change_session_metadata_to_jsonb` |
| `drop_` | Remove | `drop_legacy_email_fields` |
| `index_` | Add index | `index_session_user_game_type` |
| `data_` | Data migration | `data_backfill_user_streaks` |

### Production Deploy

```yaml
# .github/workflows/deploy.yml
- name: Run migrations
  run: |
    # Lock to prevent concurrent deploys
    flock -n /tmp/migrate.lock -c "
      pnpm prisma migrate deploy
    "
```

---

## Backup & Restore

### Automated Backup (Daily)

```bash
#!/bin/bash
# scripts/backup.sh

set -euo pipefail

DB_URL="${DATABASE_URL}"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILE="${BACKUP_DIR}/kognitika_${DATE}.dump"

# Create dump (custom format, compressed)
pg_dump --no-owner --no-privileges --format=custom --compress=9 \
  "${DB_URL}" > "${FILE}"

# Verify
pg_restore --list "${FILE}" | head -5

# Retention: keep 30 days
find "${BACKUP_DIR}" -name 'kognitika_*.dump' -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp "${FILE}" "s3://kognitika-backups/postgres/${DATE}/" --storage-class GLACIER

echo "Backup completed: ${FILE}"
```

### Point-in-Time Recovery (PITR)

```bash
# 1. Base backup
pg_basebackup -D /recovery -Ft -z -P -h localhost -U kognitika

# 2. WAL archiving (postgresql.conf)
# archive_mode = on
# archive_command = 'cp %p /wal_archive/%f'

# 3. Recovery
# recovery.signal + restore_command = 'cp /wal_archive/%f %p'
# recovery_target_time = '2026-07-29 14:30:00'
```

### Restore Procedure

```bash
# 1. Stop app
systemctl stop kognitika

# 2. Drop & recreate DB
dropdb kognitika && createdb kognitika

# 3. Restore
pg_restore --clean --if-exists --no-owner --no-privileges -d kognitika backup.dump

# 4. Run migrations (in case schema changed)
pnpm prisma migrate deploy

# 5. Start app
systemctl start kognitika
```

---

## Performance & Indexing

### Key Indexes

| Table | Index | Purpose |
|---|---|---|
| `GameSession` | `(userId, gameType, startedAt DESC)` | User history per module |
| `GameSession` | `(userId, startedAt DESC)` | Dashboard recent sessions |
| `Duel` | `(status, moduleId)` | Matchmaking queue |
| `Duel` | `(opponentId, status)` | User's active duels |
| `Feedback` | `(status, createdAt DESC)` | Admin queue |
| `Idea` | `(status, voteCount DESC)` | Ideas wall ranking |
| `AdminAuditLog` | `(targetType, targetId)` | Entity history |

### Query Optimization

```typescript
// Bad: N+1
const sessions = await prisma.gameSession.findMany({ where: { userId } });
for (const s of sessions) {
  s.user = await prisma.user.findUnique({ where: { id: s.userId } });
}

// Good: include
const sessions = await prisma.gameSession.findMany({
  where: { userId },
  include: { user: { select: { pseudonym: true, rating: true } } },
});

// Good: batch with Promise.all (if separate)
const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
const userMap = new Map(users.map(u => [u.id, u]));
```

### Analyze Slow Queries

```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 slow queries
SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename IN ('GameSession', 'Duel', 'User')
  AND n_distinct > 100
ORDER BY n_distinct DESC;
```

---

## Seeding & Fixtures

### Development Seed

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  // Clean (dev only)
  if (process.env.NODE_ENV === 'development') {
    await prisma.duelAction.deleteMany();
    await prisma.duel.deleteMany();
    await prisma.gameSession.deleteMany();
    await prisma.feedback.deleteMany();
    await prisma.ideaVote.deleteMany();
    await prisma.idea.deleteMany();
    await prisma.analyticsExportLog.deleteMany();
    await prisma.adminAuditLog.deleteMany();
    await prisma.user.deleteMany();
  }

  // Create admin
  const admin = await prisma.user.create({
    data: {
      brainId: '00000000-0000-0000-0000-000000000001',
      pseudonym: 'Admin',
      role: 'ADMIN',
      level: 99,
      experience: 999999,
      rating: 2000,
    },
  });

  // Create 50 test users
  const users = await Promise.all(
    Array.from({ length: 50 }).map(() =>
      prisma.user.create({
        data: {
          brainId: faker.string.uuid(),
          pseudonym: faker.internet.userName() + '_' + faker.number.int({ min: 1000, max: 9999 }),
          level: faker.number.int({ min: 1, max: 50 }),
          experience: faker.number.int({ min: 0, max: 100000 }),
          rating: faker.number.int({ min: 800, max: 2000 }),
          streakDays: faker.number.int({ min: 0, max: 365 }),
          lastPlayedAt: faker.date.recent({ days: 30 }),
        },
      })
    )
  );

  // Create sessions for each user
  const gameTypes = ['SCHULTE', 'STROOP', 'NBACK', 'MENTAL_MATH', 'TYPING'];
  for (const user of users) {
    const sessionCount = faker.number.int({ min: 1, max: 100 });
    await Promise.all(
      Array.from({ length: sessionCount }).map(() =>
        prisma.gameSession.create({
          data: {
            userId: user.id,
            gameType: faker.helpers.arrayElement(gameTypes) as any,
            startedAt: faker.date.recent({ days: 90 }),
            completedAt: faker.date.recent({ days: 90 }),
            score: faker.number.int({ min: 0, max: 10000 }),
            accuracy: faker.number.float({ min: 0.3, max: 1.0, precision: 0.01 }),
            durationMs: faker.number.int({ min: 10000, max: 300000 }),
          },
        })
      )
    );
  }

  console.log('✅ Seed completed');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

```bash
pnpm prisma db seed
```

---

## Testing with Prisma

### Unit Tests (Vitest)

```typescript
// src/tests/prisma.test.ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'vitest-mock-extended';

vi.mock('@/prisma/client', () => ({
  prisma: mockDeep<PrismaClient>(),
}));

import { prisma } from '@/prisma/client';

describe('UserService', () => {
  let prismaMock: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    prismaMock = prisma as DeepMockProxy<PrismaClient>;
  });

  it('creates user with brainId', async () => {
    const brainId = '550e8400-e29b-41d4-a716-446655440000';
    prismaMock.user.create.mockResolvedValue({
      id: 'clx123',
      brainId,
      pseudonym: 'Test-User-1234',
      // ... other fields
    });

    const user = await createUser(brainId);
    expect(user.brainId).toBe(brainId);
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ brainId }) })
    );
  });
});
```

### Integration Tests (Testcontainers)

```typescript
// src/tests/integration/db.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { PrismaClient } from '@prisma/client';

let container: StartedTestContainer;
let prisma: PrismaClient;

beforeAll(async () => {
  container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_DB: 'test',
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
    })
    .withExposedPorts(5432)
    .start();

  const url = `postgresql://test:test@localhost:${container.getMappedPort(5432)}/test`;
  process.env.DATABASE_URL = url;

  prisma = new PrismaClient();
  await prisma.$connect();
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await prisma.migrate.deploy();
});

afterAll(async () => {
  await prisma.$disconnect();
  await container.stop();
});

it('creates and queries user', async () => {
  const user = await prisma.user.create({
    data: { brainId: crypto.randomUUID(), pseudonym: 'Test' },
  });
  expect(user.id).toBeDefined();
});
```

---

## Monitoring

### Key Metrics

| Metric | Query | Alert Threshold |
|---|---|---|
| **Active connections** | `pg_stat_activity count` | > 80% of pool |
| **Long running queries** | `state = 'active' AND now() - query_start > 30s` | > 5 |
| **Deadlocks** | `pg_stat_database.deadlocks` | > 0/min |
| **Cache hit ratio** | `blks_hit / (blks_hit + blks_read)` | < 0.99 |
| **Table bloat** | `pgstattuple` | > 30% |
| **Replication lag** | `pg_wal_lsn_diff` | > 100MB |

### Grafana Dashboard Queries

```promql
# Connections
sum(pg_stat_activity_count{state="active"}) by (datname)

# Query duration p95
histogram_quantile(0.95, rate(pg_query_duration_seconds_bucket[5m]))

# Cache hit ratio
pg_blks_hit / (pg_blks_hit + pg_blks_read)

# Table size growth
rate(pg_table_size_bytes[1d])
```

---

## Troubleshooting

| Issue | Diagnosis | Fix |
|---|---|---|
| **P2003 Foreign key constraint** | Missing related record | Check `include`/`create` with relations |
| **P2025 Record not found** | Delete on non-existent | Use `findUniqueOrThrow` or handle gracefully |
| **P2034 Transaction timeout** | Long transaction | Split, add indexes, increase `idle_in_transaction_session_timeout` |
| **Pool exhausted** | Too many connections | Check for leaked connections, increase pool |
| **Migration fails** | Drift / conflict | `prisma migrate diff` → manual SQL fix → `prisma migrate resolve --applied` |
| **Slow query** | Missing index / bad plan | `EXPLAIN ANALYZE` → add index / rewrite |

---

## Files

| Path | Purpose |
|---|---|
| `prisma/schema.prisma` | Schema definition |
| `prisma/migrations/` | Migration history |
| `prisma/seed.ts` | Dev seed data |
| `prisma/client.ts` | PrismaClient singleton + middleware |
| `src/lib/db.ts` | Repository layer (optional) |
| `scripts/backup.sh` | Backup script |
| `.github/workflows/db-migrate.yml` | Migration deploy |
