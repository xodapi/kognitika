# Feature Flags System

**Статус**: 🔄 **In Design** — подготовка к внедрению · **Инструмент**: Custom (Edge Config compatible) · **Интеграция**: Admin Panel + CI/CD

---

## Зачем нужен

| Проблема | Решение через флаги |
|---|---|
| **Risky deploy** | Отключить фичу мгновенно без редеплоя |
| **A/B тестирование** | 50/50 split, gradual rollout 10% → 100% |
| **Kill switch** | Отключить сломанную фичу за секунды |
| **Canary release** | Включить для internal users → beta → all |
| **Emergency hotfix** | Откатить одну фичу, не трогая остальной код |

---

## Архитектура

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Admin UI      │────►│  Config Store   │◄───►│  Clients        │
│  (/admin/flags) │     │  (Redis + JSON) │     │  (Browser/Server)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │  Webhook/Event  │
                        │  (Socket.io)    │
                        └─────────────────┘
```

### Storage

| Среда | Backend | TTL | Sync |
|---|---|---|---|
| **Production** | Redis (Upstash/Valkey) | 5 min cache | Real-time via Socket.io |
| **Staging** | Redis | 1 min | Real-time |
| **Development** | Local JSON file | — | Hot-reload |

---

## Flag Definition (TypeScript)

### `src/lib/feature-flags.ts`

```typescript
import { z } from 'zod';

export const FlagSchema = z.object({
  key: z.string().min(1).max(100),           // unique key: "trainer_schulte_new_generator"
  name: z.string().min(1).max(200),          // Human name: "New Schulte Generator"
  description: z.string().optional(),        // What it does
  enabled: z.boolean().default(false),       // Global on/off
  rollout: z.number().min(0).max(100).default(0), // Percentage 0-100
  targeting: z.array(z.object({              // Targeting rules (OR logic)
    attribute: z.enum(['userId', 'role', 'country', 'version', 'custom']),
    operator: z.enum(['equals', 'in', 'contains', 'gt', 'lt']),
    values: z.array(z.string()).min(1),
  })).default([]),
  variants: z.record(z.unknown()).optional(), // For multivariate: { control: {}, treatment: { newAlgo: true } }
  createdAt: z.number().int().default(() => Date.now()),
  updatedAt: z.number().int().default(() => Date.now()),
  createdBy: z.string().optional(),          // Admin userId
  tags: z.array(z.string()).default([]),     // ["trainer", "experiment", "risky"]
});

export type FeatureFlag = z.infer<typeof FlagSchema>;

// Flag evaluation result
export interface FlagEvaluation {
  enabled: boolean;
  variant?: string;
  payload?: Record<string, unknown>;
  reason: 'global_on' | 'global_off' | 'targeting_match' | 'rollout' | 'default_off';
}
```

---

## Client SDK (React)

### `src/hooks/useFeatureFlag.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import type { FeatureFlag, FlagEvaluation } from '../lib/feature-flags';

// Global cache
let flagsCache: Map<string, FlagEvaluation> = new Map();
let socket: Socket | null = null;

function initSocket() {
  if (socket || typeof window === 'undefined') return;
  socket = io('/flags', { auth: { token: getToken() } });
  socket.on('flag:update', (flag: FeatureFlag) => {
    flagsCache.set(flag.key, evaluateFlag(flag, getCurrentUser()));
    queryClient.invalidateQueries({ queryKey: ['flags'] });
  });
}

export function useFeatureFlag(key: string): FlagEvaluation {
  initSocket();

  const { data: flags } = useQuery({
    queryKey: ['flags'],
    queryFn: () => fetch('/api/flags').then(r => r.json()),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Local evaluation (instant)
  const flag = flags?.find((f: FeatureFlag) => f.key === key);
  if (flag) return evaluateFlag(flag, getCurrentUser());

  return { enabled: false, reason: 'default_off' };
}

// Server-side evaluation (for SSR)
export async function evaluateFlagServer(key: string, user: User): Promise<FlagEvaluation> {
  const flag = await getFlagFromStore(key);
  return flag ? evaluateFlag(flag, user) : { enabled: false, reason: 'default_off' };
}
```

### Evaluation Logic

```typescript
// src/lib/flag-evaluation.ts
import { stableHash } from './hash';

export function evaluateFlag(flag: FeatureFlag, user: User | null): FlagEvaluation {
  // 1. Global kill switch
  if (!flag.enabled) return { enabled: false, reason: 'global_off' };

  // 2. Targeting rules (OR logic)
  if (flag.targeting.length > 0 && user) {
    for (const rule of flag.targeting) {
      if (matchRule(rule, user)) {
        const variant = pickVariant(flag.variants, user);
        return { enabled: true, variant: variant.key, payload: variant.payload, reason: 'targeting_match' };
      }
    }
  }

  // 3. Percentage rollout (deterministic by userId)
  if (flag.rollout > 0 && flag.rollout < 100 && user) {
    const hash = stableHash(`${flag.key}:${user.id}`);
    const bucket = hash % 100;
    if (bucket < flag.rollout) {
      const variant = pickVariant(flag.variants, user);
      return { enabled: true, variant: variant.key, payload: variant.payload, reason: 'rollout' };
    }
    return { enabled: false, reason: 'rollout' };
  }

  // 4. Full rollout
  if (flag.rollout === 100) {
    const variant = pickVariant(flag.variants, user);
    return { enabled: true, variant: variant.key, payload: variant.payload, reason: 'global_on' };
  }

  return { enabled: false, reason: 'default_off' };
}

function pickVariant(variants: Record<string, unknown> | undefined, user: User | null) {
  if (!variants || Object.keys(variants).length === 0) {
    return { key: 'default', payload: {} };
  }
  const keys = Object.keys(variants);
  if (user) {
    const hash = stableHash(`${user.id}:${keys.join(',')}`);
    return { key: keys[hash % keys.length], payload: variants[keys[hash % keys.length]] };
  }
  return { key: keys[0], payload: variants[keys[0]] };
}
```

---

## React Components

### `<FeatureFlag>` Component

```tsx
// src/components/FeatureFlag.tsx
interface Props {
  flag: string;
  children: React.ReactNode | ((evaluation: FlagEvaluation) => React.ReactNode);
  fallback?: React.ReactNode;
}

export function FeatureFlag({ flag, children, fallback = null }: Props) {
  const evaluation = useFeatureFlag(flag);

  if (typeof children === 'function') {
    return <>{children(evaluation)}</>;
  }

  return evaluation.enabled ? <>{children}</> : <>{fallback}</>;
}

// Usage
<FeatureFlag flag="trainer_schulte_new_generator">
  <NewSchulteGenerator />
</FeatureFlag>

<FeatureFlag
  flag="duel_elo_v2"
  fallback={<OldEloDisplay />}
>
  {({ variant }) => variant === 'treatment' ? <NewEloDisplay /> : <OldEloDisplay />}
</FeatureFlag>
```

### Hook for Imperative Use

```typescript
// src/hooks/useFeatureFlagActions.ts
export function useFeatureFlagActions() {
  const { queueSession } = useAnalyticsWorker();

  return {
    trackFlagExposure: (key: string, evaluation: FlagEvaluation) => {
      queueSession({
        type: 'flag_exposure',
        flagKey: key,
        enabled: evaluation.enabled,
        variant: evaluation.variant,
        reason: evaluation.reason,
      });
    },
  };
}
```

---

## Admin Panel (`/admin/flags`)

### UI Sections

| Section | Features |
|---|---|
| **List** | Search, filter by tag/status, bulk enable/disable |
| **Create/Edit** | Form: key, name, description, rollout %, targeting rules, variants |
| **History** | Audit log (who, when, what changed) |
| **Preview** | Test evaluation for specific user |
| **Rollout Wizard** | 10% → 25% → 50% → 100% with schedule |

### API (Admin)

```typescript
// GET /api/admin/flags
// POST /api/admin/flags
// PATCH /api/admin/flags/:key
// DELETE /api/admin/flags/:key
// POST /api/admin/flags/:key/rollout { percentage: 50 }
// POST /api/admin/flags/:key/targeting { rules: [...] }
// GET /api/admin/flags/:key/evaluate?userId=xxx
```

---

## Targeting Rules Examples

| Use Case | Rule |
|---|---|
| **Internal team** | `{ attribute: 'role', operator: 'equals', values: ['ADMIN', 'DEVELOPER'] }` |
| **Specific users** | `{ attribute: 'userId', operator: 'in', values: ['clx123', 'clx456'] }` |
| **Beta group** | `{ attribute: 'custom', operator: 'equals', values: ['beta_tester'] }` (user.metadata.beta = true) |
| **Country rollout** | `{ attribute: 'country', operator: 'in', values: ['RU', 'KZ', 'BY'] }` |
| **App version** | `{ attribute: 'version', operator: 'gt', values: ['1.5.0'] }` |
| **Experiment cohort** | `{ attribute: 'custom', operator: 'equals', values: ['exp_new_onboarding'] }` |

---

## Multivariate Testing (A/B/n)

```typescript
// Flag definition
{
  key: "daily_practice_algorithm",
  enabled: true,
  rollout: 100,
  variants: {
    control: { algorithm: "v1", weight: 30 },
    treatment_a: { algorithm: "v2_spaced_repetition", weight: 35 },
    treatment_b: { algorithm: "v2_adaptive_difficulty", weight: 35 }
  }
}

// Client evaluation
const { variant, payload } = useFeatureFlag('daily_practice_algorithm');
// variant: "treatment_a" | "treatment_b" | "control"
// payload: { algorithm: "v2_spaced_repetition" }
```

---

## Integration Points

### 1. Trainer Engines

```typescript
// src/hooks/useSchulteEngine.ts
const { variant, payload } = useFeatureFlag('trainer_schulte_generator_v2');

const generator = variant === 'treatment'
  ? new SchulteGeneratorV2(payload.newAlgorithmOptions)
  : new SchulteGeneratorV1();
```

### 2. Daily Practice

```typescript
// src/lib/daily-practice.ts
const { enabled, payload } = useFeatureFlag('daily_practice_algorithm');
if (enabled) {
  return createPlanV2(payload.algorithm);
}
return createPlanV1();
```

### 3. Duel Matchmaking

```typescript
// src/server/services/matchmaking.ts
const { enabled } = await evaluateFlagServer('duel_fast_matchmaking', user);
if (enabled) return fastMatchmaking(user);
return standardMatchmaking(user);
```

### 4. Server-Side Rendering (SSR)

```tsx
// src/app/trainer/schulte/page.tsx (Next.js style)
import { evaluateFlagServer } from '@/lib/flag-evaluation';

export default async function SchultePage({ params: { userId } }) {
  const flag = await evaluateFlagServer('trainer_schulte_new_generator', { id: userId });
  const Generator = flag.enabled ? SchulteGeneratorV2 : SchulteGeneratorV1;

  return <Generator {...flag.payload} />;
}
```

---

## CI/CD Integration

### GitHub Actions: Flag Validation

```yaml
# .github/workflows/flags.yml
name: Feature Flags Validation
on:
  pull_request:
    paths:
      - 'flags/**'
      - 'src/lib/feature-flags.ts'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm tsx scripts/validate-flags.ts
      - run: pnpm test src/tests/feature-flags.test.ts
```

### Deployment Gates

```yaml
# deploy.yml
jobs:
  deploy:
    steps:
      - name: Check critical flags
        run: |
          # Ensure risky flags are OFF by default
          pnpm tsx scripts/check-critical-flags.ts
      - name: Deploy
        run: ./deploy.sh
      - name: Post-deploy verification
        run: |
          # Verify flags synced to Redis
          pnpm tsx scripts/verify-flag-sync.ts
```

---

## Safety & Best Practices

| Правило | Описание |
|---|---|
| **Default OFF** | Новые флаги создаются с `enabled: false, rollout: 0` |
| **Naming convention** | `<domain>_<feature>_<variant>`: `trainer_schulte_generator_v2`, `duel_elo_v2`, `analytics_export_llm_v2` |
| **Documentation** | Каждый флаг → описание в `docs/feature-flags.md` + ссылка на тикет |
| **Expiration** | Флаги старше 90 дней без изменений → review/cleanup |
| **Critical flags** | `kill_switch_*` — требуют подтверждения 2 админов |
| **Audit** | Все изменения логируются в `AdminAuditLog` + Sentry breadcrumb |
| **Testing** | Unit-тесты для `evaluateFlag` с разными пользователями/ролл-аутами |

---

## Rollout Playbook

| Stage | Rollout | Duration | Metrics Watch |
|---|---|---|---|
| **Canary** | 1-5% (internal/beta) | 1-3 дня | Errors, latency, business metrics |
| **Early** | 10-25% | 3-7 дней | Same + user feedback |
| **Gradual** | 50% | 7-14 дней | Conversion, retention |
| **Full** | 100% | — | Stability confirmation |
| **Cleanup** | Remove flag | После 30 дней стабильности | Code cleanup PR |

---

## Metrics & Monitoring

| Metric | Query | Alert |
|---|---|---|
| **Flag evaluations/sec** | `rate(flag_evaluations_total[5m])` | — |
| **Flag error rate** | `rate(flag_errors_total[5m])` | > 1% |
| **Rollout distribution** | `flag_rollout_bucket{flag="..."}` | Visual check |
| **Variant distribution** | `flag_variant_total{flag="..."}` | Chi-square test for experiments |

---

## Файлы

| Путь | Назначение |
|---|---|
| `src/lib/feature-flags.ts` | Zod схемы, типы |
| `src/lib/flag-evaluation.ts` | Логика оценки (pure functions) |
| `src/lib/flag-store.ts` | Redis/JSON storage adapter |
| `src/hooks/useFeatureFlag.ts` | React hook + Socket.io sync |
| `src/components/FeatureFlag.tsx` | Declarative component |
| `src/server/routes/flags.ts` | Admin API |
| `src/server/socket/flags.ts` | Real-time updates |
| `src/components/admin/FlagsPanel.tsx` | Admin UI |
| `scripts/validate-flags.ts` | CI validation |
| `scripts/check-critical-flags.ts` | Deploy gate |
| `docs/feature-flags.md` | Flag registry (manual) |
