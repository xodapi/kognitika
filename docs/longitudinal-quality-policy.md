# Longitudinal Data-Quality Policy

Related issue: #144

## Purpose and scope

This policy defines a narrow, identity-free quality and coverage gate for the
longitudinal read projection. The pure resolver in
`src/lib/longitudinal-quality-policy.ts` accepts only `completed`,
`eventCount`, `suspiciousPatternScore`, `accuracy`, `reactionMs`, and a
caller-supplied `maxSuspiciousPatternScore`. It returns only `eligible` and
one stable data-quality reason.

The production configuration is versioned as
`longitudinal-quality-policy-v1` and uses an inclusive maximum suspicious
pattern score of `1.0`. The numeric configuration is private and is never
returned by the API. It has no persistence, schema migration, backfill, UI, raw
identity, telemetry, diagnosis, fraud detection, effort assessment, clinical,
or cognitive interpretation behavior.

## Resolution order

`maxSuspiciousPatternScore` is required to be finite and in `[0, 1]`.
An invalid threshold is a caller configuration error and throws `RangeError`;
it is not converted into an eligibility reason. A score equal to a valid
threshold is eligible; only a greater score is excluded.

The resolver applies these deterministic reasons in order:

| Condition | Reason |
| --- | --- |
| `completed` is not exactly `true` | `not_completed` |
| `eventCount` is missing, non-integer, or not greater than zero | `missing_or_empty_event_count` |
| `suspiciousPatternScore` is missing, non-finite, or outside `[0, 1]` | `missing_or_invalid_suspicious_score` |
| Valid suspicious-pattern score is greater than policy threshold | `score_exceeds_policy` |
| `accuracy` is missing, non-finite, or outside `[0, 1]` | `missing_or_invalid_accuracy` |
| `reactionMs` is missing, non-finite, or less than zero | `missing_or_invalid_reaction_ms` |
| All checks pass | `eligible` |

These labels communicate input and policy eligibility only. In particular,
`score_exceeds_policy` does not assert suspicious behavior, fraud, intent,
effort, capability, cognitive state, health status, or any diagnosis.

## Privacy and limitations

The output intentionally has no IDs, timestamps, raw telemetry, measurements,
threshold value, or diagnostic fields. The resolver ignores extra runtime
properties and never returns them. Callers must not use this small outcome to
reconstruct or expose identity-bearing input.

This bounded slice does not establish historical coverage, validate source
collection, persist decisions, select a threshold, prove measurement
comparability, or support longitudinal conclusions. A later integration must
use a reviewed identity-free read model; document threshold governance and
versioning; apply retention and privacy review; define coverage aggregation;
validate scientific interpretation; and add repository/API integration only
after those contracts are approved.
