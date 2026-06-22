# AnalyzeSession Golden Fixtures v2 And Batch Analytics Contract

Related issue: #110

## Summary

`AnalyzeSession` now has a second synthetic fixture layer for heavier
analytics scenarios and a server-side batch analytics contract. This keeps the
web runtime on the TypeScript fallback while preparing a safe path for
post-training analytics, cognitive ability curves, fatigue/engagement tracking,
and suspicious-pattern detection.

No production database migration is included in this step.

## Golden Fixtures v2

The v2 fixtures are deterministic and synthetic-only:

- `synthetic-v2-thousand-clicks`: 1,000 click/reaction events.
- `synthetic-v2-ten-thousand-mixed`: 10,000 mixed click/answer/checkpoint events.
- `synthetic-v2-irregular-reactions`: irregular reaction-time pattern.
- `synthetic-v2-fatigue-curve`: reaction time increases across the session.
- `synthetic-v2-suspicious-burst`: uniform sub-80ms high-accuracy burst.
- `synthetic-v2-abandoned-checkpoints`: short abandoned session with checkpoints.
- `synthetic-v2-recovery-after-fatigue`: reaction time improves after recovery.

Fixtures use seeded generation or deterministic formulas. They must not contain
real user data, raw Brain ID, tokens, emails, passwords, screenshots, raw
storage, or private telemetry.

## Server-Side Batch Contract

The server-side batch contract is represented by:

- `SessionAnalyticsJobSchema`
- `SessionAnalyticsSummaryRecordSchema`
- `createSessionAnalyticsSummary(job)`

Input is a completed or abandoned `AnalyzeSessionInput`. Output is a summary
record with:

- source session id;
- module/category;
- completion status;
- event and click counts;
- duration;
- p50/p95 reaction time;
- speed slope;
- accuracy;
- fatigue index;
- engagement index;
- suspicious-pattern score;
- recommendation signals.

## Privacy Boundary

The contract rejects identity and raw client-state material before analysis.
Blocked fields include identity, token, auth, email, password, raw storage,
localStorage, screenshots, and similar nested keys.

## Next Step

The next issue should persist these summary records behind an explicit storage
contract and use them to power the cognitive ability curve / daily trajectory.
