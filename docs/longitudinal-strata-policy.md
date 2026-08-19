# Longitudinal Version And Difficulty Strata Policy

Related issue: #144

## Purpose and scope

This policy defines the conservative eligibility boundary for a future
identity-free longitudinal read projection. The pure resolver in
`src/lib/longitudinal-strata.ts` returns an eligibility decision, a stable
reason, and (only when eligible) a stratum containing `moduleId`,
`moduleVersion`, the observed difficulty, and an explicitly configured label.
It has no persistence, API, repository, schema migration, backfill, UI, or
diagnostic behavior.

## Eligibility

Only a completed candidate with exactly one terminal `session_completed` event
is eligible. The terminal event must be last. The resolver recognizes the
canonical event formats `trial_started` and `trial_answered` as
difficulty-bearing trial events. Every such event must carry the same
non-empty difficulty string.

The `(moduleId, moduleVersion, difficulty)` combination must appear in an
explicit policy mapping. A module version is part of the stratum identity:
identical difficulty text in different versions is never pooled merely because
the text is equal. An unlisted module/version is excluded.

The current canonical event contract permits free-form optional difficulty per
trial event and has no canonical session-level difficulty field. Consequently,
this policy never manufactures one.

## Exclusions and boundaries

| Condition | Result |
| --- | --- |
| No trial events or any relevant trial without difficulty | `missing_difficulty` |
| More than one observed difficulty | `mixed_difficulty` |
| One observed difficulty absent from the explicit mapping | `unknown_difficulty` |
| No mapping for the module/version | `unsupported_module_version` |
| Missing/invalid envelope or event shape | `malformed` |
| No single final completed terminal event | `not_completed` |
| Terminal abandoned event | `abandoned` |

Excluded candidates have `stratum: null`; they are not assigned to a nearby
known stratum, normalized, guessed, or combined with one another.

`session_abandoned` is never eligible. A malformed candidate is only a
contract/eligibility failure. This resolver does not classify behavior as
suspicious, detect fraud, assess effort, infer cognitive state, or make any
clinical, performance, or diagnostic claim. Suspicious-pattern analysis, if
introduced, requires a separately reviewed contract and must not alter this
resolver's eligibility result.

## Privacy and limitations

The outcome deliberately contains no session ID, job ID, user ID, Brain ID,
email, token, timestamps, raw telemetry, or trial payload. Callers must pass
only synthetic or privacy-reviewed canonical jobs into a later projection and
must not join the returned outcome with identity-bearing data at this layer.

This bounded slice does not validate or persist canonical jobs, establish
historical coverage, prove comparability across versions, backfill prior
sessions, or create longitudinal metrics. A later implementation needs a
reviewed read model, an explicit mapping governance process, retention/privacy
review, and scientific validation before making longitudinal interpretations.
