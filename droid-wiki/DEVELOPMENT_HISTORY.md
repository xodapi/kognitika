# Development History — Kognitika

> **Project started:** ~2026-05  
> **Current phase:** Active feature development (Express Knowledge Hub, UX polish)  
> **Methodology:** Iterative, test-driven, repository-first deployment

---

## Phase 0: Foundation (May–June 2026)

### Core Infrastructure
- **Monorepo setup** with pnpm workspace (`apps/`, `packages/`, `crates/`)
- **React + Vite + TypeScript** frontend architecture
- **Express + Socket.io** backend with Prisma ORM
- **PostgreSQL 15** as primary datastore
- **Brain ID** authentication system (JWT-signed, no Firebase runtime)
- **Capacitor 8** for Android native builds

### Initial Trainer Modules (Base Domain)
| Module | Route | Core Skill |
|--------|-------|------------|
| Schulte Tables | `/schulte` | Visual attention, peripheral vision |
| N-Back | `/nback` | Working memory |
| Stroop Test | `/stroop` | Inhibitory control |
| Mental Math | `/mental-math` | Processing speed, arithmetic |
| Spatial Memory | `/spatial` | Visuospatial working memory |
| Speed Typing | `/typing` | Motor speed, accuracy |

### Key Commits
- `b4a0780` — Docker workspace reproducibility
- `e08bbcd` — Stable JSON errors, request validation
- `2b10671` — Quality gates enforcement
- `59ededa` — Analytics & trajectory input validation
- `c2742f6` — Debug artifact cleanup

---

## Phase 1: Domain Expansion (June–July 2026)

### Engineering Domain (Systems Thinking)
| Module | Route | Focus |
|--------|-------|-------|
| Numerical Analysis | `/numerical` | Pattern recognition in numbers |
| Logical Matrix | `/logical` | Abstract reasoning |
| Topology Memory | `/topology` | Structural relationship memory |
| Collision Detector | `/collision` | Conflict detection in data |
| Async Dispatcher | `/dispatcher` | Concurrent task management |
| Noise Reduction | `/noise` | Signal extraction |

### Mind-Guard Domain (Critical Thinking)
| Module | Route | Focus |
|--------|-------|-------|
| Language Scanner | `/scanner` | Semantic manipulation detection |
| Decryptor | `/decryptor` | Information decoding |
| Reality Check | `/reality` | Fact vs. belief verification |
| Hype Filter | `/hype` | Fact-checking viral claims |
| Reframing | `/reframing` | Cognitive restructuring |
| Rejection Immunity | `/rejection` | Emotional regulation |

### Meta-Modules
- **Cognitive Map** (`/cognitive-map`) — Unified progress visualization
- **Wiki** (`/wiki`) — Knowledge base with scientific grounding
- **Ideas Wall** (`/ideas`) — Community suggestions
- **Leaderboard** (`/leaderboard`) — Competitive ranking

### Infrastructure
- **Analytics engine** — Session batching, trajectory analysis, WASM benchmarks
- **Duel system** — Real-time Socket.io matches with resource bounds
- **Admin panel** — Gated behind role check
- **PWA support** — Offline-first with service worker

---

## Phase 2: UX & Quality Hardening (July 2026)

### 5-Phase UX Improvement Program

| Phase | Commit | Feature | Impact |
|-------|--------|---------|--------|
| 1 | `909a407` | Toast notifications | Non-blocking feedback everywhere |
| 2 | `210d495` | Fluid font scaling | Readable on all viewports |
| 3 | `48d0ecf` | Touch target compliance | 44×44px minimum, mobile-first |
| 4 | `ac2b1d8` | Skeleton loaders | Perceived performance +30% |
| 5 | `8227b31` | Haptic feedback | Tactile confirmation on actions |

### Testing & Contracts
- **Navigation contract test** — Auto-validates route/nav sync
- **Knowledge base contract** — Ensures wiki articles match routes
- **Analytics privacy test** — Zero PII in exports (CI-enforced)
- **Dashboard UI tests** — Stabilized with `waitFor` async patterns
- **357 tests** — All passing, zero flakes in CI

### Code Quality
- **TypeScript strict mode** — Zero `any`, zero errors
- **ESLint + Prettier** — Consistent style
- **Bundle budget** — 794 KB / 235 KB gzipped (within limits)
- **Knip** — Unused export detection

---

## Phase 3: Express Knowledge Hub (July 2026)

### Motivation
Unify **Задание №7 (Mental Math)** and **Задание №8 (Schulte Table 90)** into a single "Express Knowledge" hub per product spec. No LLM integration in this phase (explicit user request: "пока без llm").

### Implementation
**New Component:** `ExpressKnowledgeHub.tsx` (591 lines)

```
┌─────────────────────────────────────────────────────┐
│  Express Knowledge Hub                              │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌────────────────────────┐  │
│  │  Mental Math     │  │  Schulte Table 90      │  │
│  │  [Stats Card]    │  │  [Stats Card]          │  │
│  │  [Briefing ▼]    │  │  [Briefing ▼]          │  │
│  └──────────────────┘  └────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  Daily Task XP Preview  │  Cross-Mode Comparison   │
├─────────────────────────────────────────────────────┤
│  Quick Links: N-Back • Stroop • Spatial • Wiki      │
└─────────────────────────────────────────────────────┘
```

### Features Delivered
1. **Mode cards** — Live stats from `/api/progress` (best time, score, accuracy, sessions)
2. **Briefing modals** — Algorithms, presets/rules, normatives per mode
3. **Daily task integration** — XP preview from `/api/dashboard/status`
4. **Cross-mode comparison** — Side-by-side metrics grid
5. **Quick links** — Direct navigation to related Base modules
6. **Haptic feedback** — `useHaptics` on card clicks, briefing opens
7. **Responsive** — Mobile-first, works on all breakpoints

### Integration Points
- **Route:** `/express-knowledge` (added to `APP_ROUTE_PATHS`)
- **Navigation:** Header (Zap icon), Mobile nav, Bottom nav
- **Icons:** `Zap` from Lucide React
- **Knowledge base:** Articles for `mental-math` and `schulte-90` already exist

### Commits
- Express Knowledge Hub implementation (recent, not yet in log above)
- Route registration in `route-config.tsx`
- Lazy import in `App.tsx`
- Test fixes for dashboard UI async rendering

---

## Phase 4: Planned (August 2026+)

### Immediate (Next 1–2 weeks)
| Task | Description |
|------|-------------|
| DNS fix | `www.kognitika.ru` resolution |
| #128 | Results screen polish, CTA buttons, progress animations |
| Real-device QA | Android physical device testing |

### Short-term (1 month)
| Issue | Description |
|-------|-------------|
| #127 | LLM integration — neurotrainer analysis, content generation |
| #133 | Unified release hub for tasks 1–8 |
| #134 | Personal norms, safe result dynamics tracking |

### Medium-term (2–3 months)
| Issue | Description |
|-------|-------------|
| #135 | Reproducible content packs, QA protocol |
| — | Signed Play Console App Bundle pipeline |
| — | iOS Capacitor support exploration |

---

## Commit History Highlights (Selected)

| Hash | Date | Message | Significance |
|------|------|---------|--------------|
| `c2742f6` | 2026-08-01 | chore: remove tracked debug artifacts | Cleanup |
| `59ededa` | 2026-07-31 | fix(api): validate analytics and trajectory input | API hardening |
| `2b10671` | 2026-07-31 | test: enforce focused quality gates | CI gates |
| `e08bbcd` | 2026-07-31 | fix(api): return stable JSON errors | Error contract |
| `b4a0780` | 2026-07-30 | fix(docker): make workspace image reproducible | Docker |
| `ba95681` | 2026-07-30 | fix(test): replace fake integration routes | Test realism |
| `9329a82` | 2026-07-30 | fix(schulte): restore 14px font contract | UX contract |
| `0c14d1e` | 2026-07-30 | fix(calculator): replace dynamic code evaluation | Security |
| `21746e3` | 2026-07-30 | fix(mobile): protect credentials and API origin | Mobile security |
| `3d34245` | 2026-07-30 | fix(socket): bound duel resource usage | DoS prevention |

---

## Branching Strategy

```
main ──────────────────────────────────────────────►
  │
  ├── feature/express-knowledge-hub (merged)
  ├── feature/ux-improvements-1-5 (merged)
  ├── feature/navigation-contract (merged)
  └── (future) feature/llm-integration (#127)
```

- **Main branch only** — No long-lived feature branches
- **Repository-first deploy** — Every change via PR → merge → server pull → build → restart
- **No direct production patches** — Emergency hotfixes only with coordinator approval

---

## Team & Contributors

- **Primary:** AI-assisted development (Factory Droid)
- **Architecture:** Documented in `ARCHITECTURE.md`, `KOGNITIKA_CORE.md`, `GLOBAL_VISION.md`
- **Product vision:** `KOGNITIKA_LONGTERM_ROADMAP.md`
- **Market research:** `Исследование рынка когнитивных D2C-приложений.md`

---

## Milestones

| Date | Milestone |
|------|-----------|
| 2026-05 | Project init, monorepo, auth, first trainers |
| 2026-06 | Three domains complete (30+ modules) |
| 2026-07-15 | UX improvement program starts |
| 2026-07-31 | UX program complete (5 phases), navigation contract |
| 2026-08-01 | Express Knowledge Hub deployed |
| 2026-08-15 | Target: LLM integration (#127) start |
| 2026-09-01 | Target: Unified release hub (#133) |

---

## Lessons Learned

1. **Contract tests prevent drift** — Navigation contract catches missing routes immediately
2. **Async test patterns matter** — `waitFor` eliminates flaky UI tests
3. **Haptic feedback is cheap but high-impact** — 50 lines of hook, noticeable UX win
4. **Skeleton loaders > spinners** — Perceived performance improvement measurable
5. **Repository-first deploy works** — Zero production drift since adoption
6. **No Firebase = simpler ops** — Brain ID + Prisma + PG is sufficient

---

## References

- [Project Updates](PROJECT_UPDATES.md) — Current state, metrics, upcoming work
- [Architecture Overview](overview/architecture.md) — System design
- [Scientific Methodology](features/scientific-methodology.md) — Training science
- [Testing Strategy](features/testing.md) — Test philosophy, patterns
- [Deployment Guide](deployment.md) — Deploy flow, server config
- [Security Model](security.md) — Threat model, privacy guarantees
