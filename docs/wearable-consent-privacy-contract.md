# Wearable consent and privacy contract

This document implements the contract foundation for issue #148. It is a local, versioned consent model only. It does **not** connect to Health Connect, HealthKit, a device SDK, Prisma, the network, or an analytics outbox.

## Explicit, granular consent

A valid `WearableConsentRecord` has contract version `1`, a status, a timestamp, and an explicit unique subset of these capabilities:

- `heart_rate`;
- `hrv_recovery`;
- `sleep_activity`;
- `signal_quality`.

Only a `granted` record may have capabilities, and it must have at least one. `denied` and `revoked` records have no capabilities. The default is `denied`.

The core trainer remains fully functional through the existing cognitive-only path if consent is denied, revoked, unavailable, or does not include a capability. No wearable state may degrade the core trainer.

## Privacy boundary

The contract rejects fields and nested keys that could carry:

- Brain ID, email, JWT/token/password, or other identity/authentication material;
- device serial/device ID, geolocation/location;
- raw samples, continuous telemetry, raw answers, free-text metadata, or screenshots.

The runtime contract contains no user ID, device ID, session ID, persistence, transport, or connector configuration. Consent is distinct from registration and identity state.

## Lifecycle and ownership

`grant`, `deny`, and `revoke` are local state transitions. Revocation immediately clears capability access. `export_requested` and `deletion_requested` are typed request boundaries only, not exports or deletion implementations.

No wearable data is persisted in this change. Any future persistence must separately define a data owner, retention period, deletion executor, export format, audit trail, rollback, and user-facing consent UX before connector or delivery work begins.

## Product safety

This contract makes no diagnosis, disease, intelligence, anxiety, medical, or automatic-difficulty claim. It creates no physiological interpretation and changes no training plan.

## Verification

`src/tests/wearable-consent.test.ts` uses synthetic fixtures to verify granular consent, denial/revocation fallback, versioning, privacy rejection, and export/deletion request boundaries.
