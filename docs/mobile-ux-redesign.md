# Mobile UX redesign audit

**Scope:** repository-owned design contract and implementation plan only.
**Date:** 2026-08-22.
**Status:** static source audit; no runtime or Playwright assertions were run
for this document.

## Existing contracts found

The repository already has useful mobile foundations:

- `src/index.css` defines safe-area padding, `100dvh`, clipped document
  overflow, `--mobile-chrome-offset`, and `.play-grid-fit`.
- `src/App.tsx` has a mobile drawer, fixed bottom chrome, labelled menu
  controls, and safe-area-aware positioning.
- The rollout contract in `tests/mobile-trainer-rollout.spec.ts` covers 13
  trainers and declares where briefing, abort, playfield, and overflow clauses
  apply.
- `tests/mobile-contract.ts` defines 320/390/430 phone viewports, a 44px
  touch floor, single-glance geometry, reachability, chart placement, and
  overflow probes.
- Trainer sources expose stable `start-button`, `stop-button`, and `playfield`
  hooks where the rollout requires them. `docs/mobile-rollout-audit-2026-08-17.md`
  records that rollout as complete.
- `src/components/TrainingGallery.tsx` already uses a responsive card grid,
  48px domain controls, semantic Tailwind tokens, and Russian module copy.

These are implementation evidence, not a claim that the whole product has
passed the contract.

## Mobile pain points

The following are source-level risks and opportunities, not defects verified
by an executed browser run:

1. **Gallery density and hierarchy.** `TrainingGallery.tsx` presents domain
   tabs, a domain explanation, and a long module grid. At 320px, category and
   level metadata compete with title and purpose; the user may have to scan
   many cards before the next useful action is clear.
2. **Inconsistent trainer anatomy.** The 13-trainer rollout intentionally
   supports both briefed and auto-start experiences. The shared test hooks
   exist, but the source components use different card, HUD, result, and
   early-exit layouts. This increases orientation cost when switching modules.
3. **Playfield geometry is trainer-specific.** `SchulteGrid.tsx` and
   `SchulteTable90.tsx` have dense grids; other trainers use different
   controls. The existing probes prevent several regressions, but the
   contract needs one documented rule for the target, HUD, safe exit, and
   result transition.
4. **Fixed chrome collision risk.** `src/App.tsx` and `src/index.css` reserve
   mobile chrome and safe-area space, but every new result/recommendation or
   modal action must explicitly use those utilities. Long Russian labels can
   still make a fixed row or a bottom action feel crowded.
5. **Small metadata copy.** The current visual language uses 9–12px uppercase
   labels in cards and trainer HUDs. Some are useful as metadata, but any
   instruction or state that is essential to task completion must meet the
   14px mobile reading floor.
6. **Motion and attention.** `motion/react` entry and scale transitions are
   present in gallery and trainer surfaces. A reduced-motion contract is
   needed so decorative animation never competes with timed play or causes
   vestibular discomfort.
7. **Safety language drift.** Existing knowledge-base and trainer copy contain
   wellness disclaimers, but the gallery includes descriptions whose wording
   can sound clinical or causal. Copy needs one review gate: describe the
   task and observed metrics, never a medical outcome.
8. **Result-to-next-step consistency.** `CompletionRecommendation.tsx` provides
   a reusable path, while trainers also have bespoke completion views. A
   consistent result hierarchy will reduce the peak-end drop-off after a
   completed session.

## Implementation slices

### Slice 1 — Shared visual primitives and shell

**Files:** `DESIGN.md`, `src/index.css`, `src/App.tsx`,
`src/lib/route-config.tsx`, `tests/mobile-shell-regression.spec.ts`.

Define shared spacing/color/state utilities, reduced-motion CSS, and a single
documented bottom-chrome offset. Keep the current drawer and bottom navigation
semantics while making labels, focus, safe-area padding, and long Russian copy
stable at 320px. This slice may touch shell sources only in its implementation
PR; this contract slice does not touch them.

**Playwright acceptance criteria (pending):**

- At 320×700, 375×667, 390×844, and 430×932, the drawer opens and closes via
  labelled controls, navigation reaches its destination, and
  `document.documentElement.scrollWidth - innerWidth <= 1`.
- The fixed bottom navigation does not overlap the build footer or the final
  visible action.
- Keyboard focus is visible on menu, close, navigation, and theme controls.
- With `prefers-reduced-motion: reduce`, computed transitions/animations on
  shell decoration do not delay navigation or hide content.

### Slice 2 — Gallery selection

**Files:** `src/components/TrainingGallery.tsx`,
`src/lib/route-config.tsx`, `tests/gallery-ui.test.tsx`,
`tests/navigation-contract.test.ts`, and a new or extended
`tests/mobile-gallery.spec.ts`.

Make card hierarchy and selection thumb-friendly: title and purpose first,
metadata second, full-card action with a visible focus/pressed state. Keep
domain tabs at least 44px and ensure all labels wrap rather than clip.

**Playwright acceptance criteria (pending):**

- At 320px, each visible module card has a readable title, purpose, and
  accessible action name; no card text is clipped by horizontal overflow.
- Domain tabs are at least 44px in both dimensions and `aria-pressed` tracks
  the selected domain.
- Activating a card reaches the declared public route without starting a timed
  session before the briefing action.
- The gallery contains no medical or guaranteed-improvement claim in visible
  module copy.

### Slice 3 — Canonical trainer journey

**Files:** `src/components/SchulteGrid.tsx`,
`src/components/SchulteTable90.tsx`, `src/components/MentalMathTrainer.tsx`,
`src/components/AlphabetTableTrainer.tsx`, `src/components/StroopTest.tsx`,
`src/components/StroopAlphabetTrainer.tsx`,
`src/components/CompletionRecommendation.tsx`, plus the remaining trainer
components listed in `tests/mobile-trainer-rollout.spec.ts`.

Align the 13 rollout trainers to selection → briefing → start → play → result
→ next step. Preserve explicit auto-start exceptions, stable test IDs, and
trainer-specific mechanics. Keep stop available during play, and keep the
target/progress/playfield relationship visible without requiring a scroll when
the task geometry permits.

**Playwright acceptance criteria (pending):**

- For every rollout route and each declared viewport, the applicable
  `start-button`, `stop-button`, and `playfield` selectors resolve and are
  visible in the correct state.
- Every rendered playfield action and early-exit control is at least 44px;
  no declared non-exception playfield has horizontal inner scrolling.
- During play, target and playfield satisfy the single-glance probe where
  declared; no chart surface is mounted below the fold.
- Completing or stopping a trainer exposes a readable result/stop state with
  repeat, menu, and next-step actions. An incomplete attempt is not described
  as a result.
- At least one route is exercised with reduced motion and retains the same
  controls and state transitions.

### Slice 4 — Safety, privacy, and quality gate

**Files:** `src/lib/knowledge-base.ts`, trainer copy in the files above,
`tests/knowledge-base-contract.test.ts`,
`tests/app-identity-privacy.test.tsx`, `tests/logging-privacy.test.ts`,
`tests/mobile-trainer-rollout.spec.ts`.

Review visible copy and result labels for wellness-safe language. Keep raw
Brain ID, tokens, identifiers, and private telemetry out of UI and fixtures.
Update knowledge articles when public trainer copy or routes change.

**Playwright / test acceptance criteria (pending):**

- Result and briefing surfaces include a short limitations/safety note where
  applicable and contain no diagnosis, treatment, IQ, or guaranteed-outcome
  claim.
- Mobile UI does not expose raw Brain ID material by default.
- Existing knowledge-base route/article and privacy contracts remain green.
- The review record names the exact command and result; no test is called
  passed from inspection alone.

## Review checklist

- [ ] Verify source implementation at all four binding phone sizes.
- [ ] Verify 44px target measurements and no document overflow.
- [ ] Verify target, progress, stop, and next step are labelled in Russian.
- [ ] Verify reduced-motion behavior and visible keyboard focus.
- [ ] Verify safe-area and fixed-bottom-chrome clearance.
- [ ] Verify contrast and non-color state communication.
- [ ] Verify no medical claim, raw Brain ID, secret, user data, or private
  telemetry entered the change.
- [ ] Run only the relevant Playwright and contract tests; record exact
  commands and outcomes.
