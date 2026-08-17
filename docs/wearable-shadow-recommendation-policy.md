# Wearable-informed recommendation shadow policy

**Status:** shadow-only contract for [#151](https://github.com/xodapi/kognitika/issues/151). It does not expose a user-visible recommendation, alter a plan, connect a device, persist telemetry, or change TypeScript analytics authority.

## Safety boundary

The policy accepts the versioned aggregate-only `PhysiologicalSessionSummary`
from #149 plus bounded cognitive accuracy, fatigue, duration, and an explicit
local opt-in. It rejects no input itself because schema validation happens at
the contract boundary.

Wearable input alone cannot change the baseline cognitive outcome. A usable
summary can only corroborate an existing cognitive fatigue outcome in shadow
metrics. Missing, revoked, stale, low-quality, or conflicting input produces
the identical cognitive-only outcome.

## Outcomes and reason codes

The bounded non-medical outcomes are `keep`, `soften_next_block`,
`pause_suggested`, `recovery_suggested`, and `increase_next_block`. They are
policy labels, not diagnoses, health alerts, emergency guidance, or automatic
interventions.

Aggregate-only reason codes are emitted for cognitive baseline, cognitive
accuracy/fatigue, unavailable/low-quality/stale/conflicting wearable input,
and corroborated cognitive fatigue. No identity, device identifier, raw
telemetry, session payload, or measurement value is included in the result.

## Exposure, limits, and rollback

- The implementation mode is fixed to `shadow`.
- A future user-visible rollout must be recommendation-only, opt-in, and
  reversible, with a 30-minute recommendation cooldown.
- The production switch remains disabled by default. Rollback is immediate:
  disable wearable shadow evaluation and retain the cognitive-only policy.
- Before exposure, record aggregate outcome-difference rate, fallback rate,
  low-quality/stale rate, opt-in rate, and false-positive/false-negative
  review results from synthetic fixtures. Do not log raw measurements.

No medical, mental-health, or automatic difficulty claim is authorized by this
policy.
