# Kognitika design contract

This document is the product-facing design contract for the Kognitika web
experience, with mobile as the binding layout. It describes the visual system
and interaction rules that future UI work must follow. It is a contract, not a
claim that all existing screens already conform to it.

## Product stance

Kognitika is a calm, privacy-aware wellness and cognitive-training product.
The interface should make the next action obvious, reduce cognitive load
before a timed task, and make stopping safe and easy. Russian is the primary
user-facing language in this application.

Training results describe performance in a task under particular conditions.
They must never be presented as a diagnosis, a measure of intelligence, a
medical conclusion, or a promise of cognitive improvement. Every relevant
briefing or result surface should retain a short limitation such as:
«Это wellness-тренировка, а не медицинская диагностика. На результат влияют
сон, стресс, устройство и знакомство с задачей».

## Visual language

- **Theme:** dark, focused, and quiet by default; use the existing theme
  tokens (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`,
  `primary`, `secondary`, `border`) rather than introducing one-off hex values.
  Light, matrix, and nature themes remain valid variants of the same semantic
  system.
- **Surfaces:** layered cards with a restrained border, modest blur, and
  primary glow only where it establishes hierarchy. Avoid decorative motion or
  gradients behind the active playfield.
- **Semantic color roles:**

  | Role | Existing token / intent | Rule |
  | --- | --- | --- |
  | Background | `background` | Page and low-attention areas |
  | Surface | `card`, `secondary` | Grouping and controls |
  | Content | `foreground` | Primary readable text |
  | Supporting content | `muted-foreground` | Secondary copy, never essential state alone |
  | Action/focus | `primary` | Start, selected navigation, focus ring |
  | Success | emerald semantic role | Completed / correct; pair with text or icon |
  | Caution | amber semantic role | Fatigue, pause, incomplete state |
  | Destructive | `destructive` | Stop, error, irreversible action |
  | Trainer accent | module-specific semantic accent | Decoration and orientation, not status alone |

  Do not use red/green or hue alone to communicate correctness, progress, or
  safety. Include a label, icon, shape, or accessible name. Text and controls
  must meet WCAG AA contrast; large display type must meet the applicable AA
  threshold.

- **Typography:** use the existing `font-sans` stack and Russian-capable
  fallback fonts. Body and actionable text are at least 14px on phone
  viewports. Use sentence case for explanatory Russian copy; reserve the
  existing uppercase, bold, and tracking treatment for short labels and
  status metadata. Avoid long all-caps headings and clipped text.
- **Spacing:** use an 8-point rhythm: 8, 16, 24, 32, 40, 48px as the preferred
  values. Tailwind `gap-2`, `gap-4`, `gap-6`, etc. are the normal expression.
  A 4px optical adjustment is allowed inside an icon control, but not as a
  substitute for layout rhythm.
- **Shape and density:** use the established rounded-xl through rounded-3xl
  language. Cards should have one clear heading, one supporting explanation,
  and one primary action. Preserve enough breathing room around timed content
  to prevent accidental taps.

## Component contract

Reusable components should preserve the following anatomy and states:

1. **Trainer card:** icon, Russian title, one-line purpose, category, optional
   level, and a visible «Старт» affordance. The whole card is actionable and
   has a clear focus state.
2. **Briefing:** task purpose, what to do, duration or item count, controls,
   safety/limitations note, and a single primary «Начать тренировку» action.
   Configuration controls must precede the action and remain usable at 320px.
3. **Play HUD:** current instruction/target, progress, timer or count, and a
   reachable stop action. The target and playfield must be visible in one
   glance when the trainer contract allows it.
4. **Playfield:** stable geometry, no accidental page zoom, no hidden
   horizontal overflow. Interactive cells/actions are at least 44px by 44px
   including their hit area.
5. **Result:** plain-language summary, accuracy/errors/time where meaningful,
   limitations note, «Повторить», «В меню», and a concrete next step. Never
   imply a clinical interpretation.
6. **Loading, empty, error, and disabled states:** explain what is happening,
   preserve layout, expose a recovery action, and do not rely on animation or
   color alone. A disabled action must explain why when the reason is not
   obvious.

### Required interaction states

Every interactive control must have default, hover (pointer devices only),
focus-visible, pressed, disabled, loading, and error/invalid states as
applicable. Focus must be visible against every theme. Touch feedback must not
depend on hover. Stop and destructive actions require clear wording and must
not be hidden behind a gesture.

## Navigation contract

- The primary mobile entry points are the existing header menu/drawer and the
  fixed bottom navigation. The drawer must close after navigation and expose a
  labelled close control.
- The bottom navigation is for the highest-frequency destinations only:
  overview, training, progress/profile, and the menu affordance as currently
  defined by `src/lib/route-config.tsx`. Do not add every trainer to the fixed
  bar.
- Deep links to public trainers remain routable. A user can return to the
  gallery without losing the meaning of the current result.
- Current route and selected navigation state must be conveyed by text and
  accessible state (`aria-current`, `aria-pressed`, or equivalent), not color
  alone.
- Navigation controls and modal close controls have a minimum 44px hit area.
  Fixed navigation must never cover content, the build footer, or a final
  action.

## Trainer journey

The canonical journey is:

`selection → briefing → start → play → result → next step`

- **Selection:** choose a module from the gallery; show what it trains without
  medical language.
- **Briefing:** orient the user before the timer starts. Configuration is
  optional, labelled, and thumb-reachable.
- **Start:** one obvious primary action; do not start a timed task from an
  incidental card tap.
- **Play:** keep target, progress, and stop reachable. Do not mount charts or
  unrelated navigation in the active task area.
- **Result:** use measured task vocabulary (accuracy, errors, time, completed
  items); acknowledge that conditions affect results.
- **Next step:** offer repeat, return to training, or one evidence-aligned
  recommendation. The user must be able to stop or leave without penalty.

The stable mobile testing hooks are part of this journey contract:
`data-testid="start-button"` where a briefing exists,
`data-testid="stop-button"` where early exit exists, and
`data-testid="playfield"` for the active task container. A trainer may declare
an explicit exception only with a reason in the mobile contract.

## Mobile accessibility and ergonomics

- Binding viewports are 320×700, 375×667, 390×844, and 430×932. No document
  horizontal overflow is allowed. A dense trainer may have a documented,
  user-scrollable inner exception only when the task cannot be represented
  otherwise.
- Every touch target is at least 44px on both axes (the repository's stricter
  floor). Separate adjacent targets by enough space to prevent mis-taps.
- Use the thumb zone: primary actions belong in the lower or central reachable
  area; do not require a stretch to the top corner for the next step or stop.
- Respect `env(safe-area-inset-*)`, `100dvh`, and the existing
  `--mobile-chrome-offset`. Content and fixed controls must remain clear of
  notches, home indicators, and the fixed bottom chrome.
- Preserve readable text at user zoom. Do not disable pinch zoom globally.
  Form fields need a correctly typed input, visible label, and keyboard-safe
  layout.
- Honor `prefers-reduced-motion: reduce`: remove decorative movement, parallax,
  scale/position entrance effects, and pulsing; keep state changes immediate
  and understandable. Do not encode task timing in an animation alone.
- Use semantic HTML, labelled icon-only buttons, keyboard operation, logical
  focus order, and status announcements for completion/errors. Do not expose
  Brain ID, raw identifiers, tokens, or private telemetry in UI copy or test
  fixtures.

## Do / don't

### Do

- Do reuse semantic theme tokens and the existing rounded-card visual language.
- Do write concise, reassuring Russian instructions before a timed task.
- Do show the next action and a safe exit at every trainer stage.
- Do validate the 320px binding case and at least one reduced-motion run.
- Do describe uncertainty and task limitations without diagnosing the user.
- Do keep analytics aggregated and privacy-preserving.

### Don't

- Don't edit `src/App.tsx` or trainer sources as part of a design-contract-only
  change.
- Don't add Firebase, raw Brain ID material, secrets, or user data.
- Don't use «улучшает мозг», «лечит», «диагностирует», «IQ», or equivalent
  medical/ability claims.
- Don't use a tiny icon-only stop control, hover-only affordance, or
  color-only status.
- Don't put essential controls below a chart, behind a fixed nav, or outside
  the thumb-reachable area.
- Don't introduce arbitrary breakpoints, spacing, colors, or font families
  without documenting why the existing system cannot express them.
- Don't claim a Playwright or accessibility check passed unless it was run and
  its result is recorded.

## Ownership and change gate

The contract is implemented incrementally. A UI change that alters a public
trainer, route, or mobile shell must update the relevant source, tests, and
documentation together. Before review, run the applicable Playwright mobile
specs at the binding viewport and record the exact command; a static design
proposal may instead record that those checks are pending.
