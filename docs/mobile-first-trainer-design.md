# Mobile-First Trainer Design Contract (test-first)

**Status:** design contract, not yet implemented.
**Basis:** `origin/main` at `49168ca`.
**Method:** test-first. Every change below lands as a failing test first, then the
implementation that makes it pass. No layout change is accepted without an
executable assertion.

This document is the shared brief for agents working the mobile track. It states
what is measured today, what is wrong, what the target contract is, and which
existing test must be deliberately rewritten rather than deleted.

## 1. Why this exists

Desktop layout puts trainer and analytics on one screen through a 3-column grid
(`lg:col-span-3 / 6 / 3`). On mobile those three columns collapse into a single
DOM-order column, so the same screen becomes a long scroll. The perceived
strength of the design does not survive the collapse.

This is not one component's problem. **13 trainers** use the same 3-column
pattern: `AlphabetTableTrainer`, `CognitiveTrashFilter`, `LogicalMatrix`,
`MentalMathTrainer`, `NBackTest`, `NumericalAnalysis`, `SchulteGrid`,
`SchulteTable90`, `SituationalJudgmentTest`, `SpatialConcealment`, `SpeedTyping`,
`StroopAlphabetTrainer`, `StroopTest`. Fixing one is not the deliverable; a
contract every trainer is tested against is.

## 2. What is already true (measured, do not redo)

Agents have previously mis-scoped this work by looking only at `src/tests`. The
mobile e2e suite lives in `tests/`.

| Fact | Evidence |
| --- | --- |
| Mobile e2e exists | `tests/schulte-mobile.spec.ts` (375x667, 390x844, 768x1024), `tests/mobile-shell-regression.spec.ts` (320x700, 390x844, 430x932) |
| The gate is real | `pnpm test:e2e` runs in `.github/workflows/ci.yml` and in `deploy.yml` before deploy |
| Font floor enforced | `schulte-mobile.spec.ts` asserts every visible element has computed `font-size >= 14px`, with no exclusions |
| Horizontal overflow guarded | `expectNoHorizontalOverflow` asserts `documentElement.scrollWidth - innerWidth <= 1` |
| Briefing touch floor enforced | `mobile-shell-regression.spec.ts` asserts the start button has `min-height: 48px` |
| Bottom nav does not collide | `<main>` uses `pb-32`, nav is `h-16` with `bottom: max(1.5rem, safe-area-inset-bottom + 0.75rem)`, and the build footer/nav overlap is asserted |
| `dvh` and safe areas handled | `index.css` uses `100dvh` minus `safe-area-inset-*`; viewport meta has `viewport-fit=cover` |
| A sticky-HUD precedent exists | `MentalMathTrainer.tsx:535` already uses `sticky top-3 z-20` |

**Only Schulte routes have mobile coverage.** The other 11 trainers listed above
have none.

## 3. Findings to fix

### M-A: target and playfield are separated on mobile

In `SchulteGrid`, mobile DOM order is: timer card, then the "current number" card
(`p-8`, `flex-1`, `text-6xl sm:text-8xl`), then the grid (`min-h-[400px]`), then
analytics, then the stop button.

During a timed test the user needs the target and the playfield in one glance.
On mobile a large card sits between them, pushing the grid down. Analytics and
"Завершить досрочно" land off-screen entirely.

### M-B: grid cells fall below the repo's own touch floor

`min-h-11` (44px) is used in 39 places as the touch standard. Schulte cells are
not held to it.

`<main>` has `px-4` (32px) and the grid container has `p-4` (32px), so available
width is `viewport - 64px`. Cell edge is `(available - 8 * (n - 1)) / n` at
`gap-2`.

The narrowest viewport in the existing suite is **320px**
(`mobile-shell-regression.spec.ts`), so that is the binding case, not 375px:

| Size | Cell at 320px | Cell at 375px | Cell at 390px |
| --- | --- | --- | --- |
| 3x3 | 80px | 98px | 103px |
| 4x4 | 58px | 72px | 75px |
| 5x5 | 45px | 56px | 58px |
| 6x6 | **36px** | 45px | 48px |
| 7x7 (Gorbov forces 7) | **30px** | **38px** | 40px |

At 320px everything above 5x5 breaks the floor. At 375px and 390px, 7x7 still
breaks it. The slider allows 3–7 and Gorbov-Schulte **forces** `size = 7`, so the
hardest and most error-sensitive mode always has the smallest targets.

This corrupts the metric, not just comfort: a share of `state.errors` becomes
finger-miss rather than attention lapse, and `errors` feeds scoring and adaptive
difficulty.

### M-C: document-level overflow check is blind to inner scroll

`SchulteTable90` renders `grid gap-1.5 w-full min-w-[494px]` inside a parent with
`overflow-x-auto`. At 375px the grid cannot fit, but the parent absorbs it, so
`documentElement.scrollWidth` stays clean and `expectNoHorizontalOverflow`
passes. The 1-90 table is horizontally scrollable inside its own frame.

That may be an acceptable deliberate choice for a 10-column table. It is not
acceptable that it is **untested and undeclared**: nothing asserts whether inner
scroll is intended here, and nothing prevents another trainer from acquiring it
by accident.

### M-D: in-test analytics render off-screen and compete for attention

`ConcentrationCurve` renders in the right column during play and again on the
results screen. On mobile the in-play instance is below the fold: it animates and
recomputes where it cannot be seen, during an exercise whose whole purpose is
undistracted attention.

### M-E: stop control is unreachable without scrolling

"Завершить досрочно" is the last element of the third column. A user who needs to
abort mid-test must scroll past the grid and all analytics to do it.

### M-F: results screen buries the answer

`results-section` is `grid-cols-1 lg:grid-cols-2`, with `ConcentrationCurve` at
`h-[300px]`, stacked after `PostGameInsight` and `SchulteStats`. On mobile that
is roughly three screens of scroll, and the first question a user has ("better or
worse than last time?") is not answerable in the first screen.

## 4. Target contract

Assertions run across the full viewport matrix, and **320x700 is the binding
case**, not 375px. A change that passes at 390px and fails at 320px does not
satisfy this contract.

1. **Single-glance rule.** While a test is active, the primary target indicator
   and the top edge of the playfield are both fully within the viewport without
   scrolling.
2. **Touch floor.** Every interactive playfield element measures at least 44x44
   CSS px in its default mobile configuration, including the maximum grid size
   the mode permits.
3. **Abort reachability.** The stop/abort control is reachable without scrolling
   while a test is active.
4. **Attention isolation.** No decorative or analytical chart is mounted below
   the fold during active play on mobile.
5. **Declared inner scroll.** A playfield may scroll inside its own container
   only where this document names it explicitly. Everywhere else, inner
   `scrollWidth` must not exceed its container's client width.
6. **Results triage.** The primary verdict of a finished session is visible in
   the first mobile screen; secondary analytics may be behind tabs or disclosure.
7. **No regression of existing guarantees.** The 14px font floor, document-level
   overflow rule, 48px briefing button, and nav non-collision continue to hold.

### Declared inner-scroll exception

`SchulteTable90` (route `/schulte-90`) is permitted horizontal inner scroll,
because 10 columns at a 44px floor need 494px, which no target phone provides.
That number is not arbitrary: `10 * 44 + 9 * 6 = 494`, exactly the existing
`min-w-[494px]` with `gap-1.5`. So this trainer already encodes the 44px floor and
trades document width for it deliberately. The contract records that trade rather
than reversing it.
Its contract is instead: cells meet the 44px floor, and inner scroll is
discoverable. Any other trainer acquiring inner scroll is a defect.

## 5. Test that must be rewritten, not deleted

`tests/schulte-mobile.spec.ts` contains:

```ts
test('timer and errors HUD should be above grid', ...)
// expects positions.timerTop < positions.gridTop
```

This test **encodes the current defect as the expectation**. A sticky compact HUD
satisfies "above the grid" in the sticky sense but the assertion compares raw
`getBoundingClientRect().top` values in DOM flow, so it must be restated as the
single-glance rule of §4.1: target and playfield both in viewport, HUD not
displacing the playfield below the fold.

Rewriting it is in scope for M-3. Deleting it, or weakening it to always pass, is
not acceptable. Record the before/after assertion in the PR body.

## 6. Task decomposition

Each task is independently reviewable and states its own gate. Test-first: the
failing test lands in the same PR as the fix, and the PR body shows the test
failing before and passing after.

| Task | Scope | Depends on |
| --- | --- | --- |
| M-1 | Shared mobile contract harness in `tests/`: viewport matrix, touch-target probe, inner-overflow probe, single-glance probe. No product change. | — |
| M-2 | Enforce the 44px touch floor on Schulte cells across sizes 3–7, including forced-7 Gorbov. | M-1 |
| M-3 | Compact sticky in-play HUD for `SchulteGrid`; restate the HUD-above-grid test per §5. | M-1 |
| M-4 | Abort control reachable without scrolling; attention isolation during play. | M-3 |
| M-5 | Results triage for `SchulteGrid`: verdict first screen, secondary analytics behind tabs. | M-1 |
| M-6 | Roll the contract out to the remaining 11 trainers as a parameterized spec; fix what it catches. | M-2..M-5 |
| M-7 | Fix `docs/mobile-testing-guide.md` (it references `tests/mobile-schulte.spec.ts`; the real file is `tests/schulte-mobile.spec.ts`) and document the contract as the standard for new trainers. | M-6 |

M-1 is the blocker: without the shared harness every later task reinvents its own
measurement and the contract cannot be enforced uniformly.

## 7. Non-goals

- No visual redesign, palette, or motion rework. This is layout and reachability.
- No change to scoring, difficulty, or adaptive logic. M-B notes that touch
  misses pollute `errors`; correcting the metric itself is separate work.
- No native/Expo client work. See #102 and #150.
- No production or deployment change.

## 8. Verification commands

```bash
pnpm playwright install --with-deps chromium
pnpm test:e2e                                  # full gate, as CI runs it
pnpm exec playwright test tests/schulte-mobile.spec.ts --headed
pnpm test                                      # unit suite must stay green
pnpm lint && pnpm typecheck:tests
```
