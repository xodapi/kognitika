# Privacy Data-Processing Inventory and Local-First Roadmap

**Status:** verified technical inventory, not legal advice and not a declaration of regulatory compliance.

This document records facts verified in the current Kognitika source and limited public-response inspection. It intentionally separates application behavior from infrastructure that requires an approved production audit.

## Verified current state

| Boundary | Current behavior | Data category | Default / retention | Open evidence |
| --- | --- | --- | --- | --- |
| Web browser identity | `localStorage` stores Brain ID cache, access token and user record through the identity vault. | Anonymous credential and session material, potentially personal data. | Persists until user/app cleanup. | Migration away from browser `localStorage` is planned in [#226](https://github.com/xodapi/kognitika/issues/226). |
| Native browser bridge | Capacitor uses secure storage and can migrate legacy browser identity. | Same identity material. | Platform-controlled secure storage. | Device backup and platform-key policy need review. |
| Per-tab practice flow | Session-scoped random identifier is used only when telemetry is explicitly enabled. | Route/module/timing/checkpoint event data. | Default-deny after the privacy control change. | Production configuration and endpoint behavior must be verified after deploy. |
| Application database | PostgreSQL stores Brain ID, pseudonym, game sessions/results/timing, XP/rating/streak data, and feedback/ideas that can contain free text. | Profile-linked product and potentially sensitive contextual data. | Server-side persistence remains current product behavior. | Retention/deletion owner and production DB identity require [#221](https://github.com/xodapi/kognitika/issues/221). |
| Practice-flow endpoint | When enabled, server holds up to 5,000 parsed events in process memory. It does not persist them through Prisma. | Aggregated flow telemetry. | Process lifetime / bounded in-memory store. | Default-deny control tracked in [#222](https://github.com/xodapi/kognitika/issues/222). |
| Cookies and third parties | Source search and public root response inspection found no observed `Set-Cookie`, Google Analytics, Yandex Metrika, Clarity, or active Sentry SDK integration. | No observed analytics cookie path. | Evidence is scoped to the inspected code/response. | All public hostnames, deployed assets and operational configuration still need audit. |
| Infrastructure | Nginx, hosting, DNS/CDN, backup systems and CI may process technical metadata such as source IP in access logs. | Technical/log data. | Not verified from source alone. | Fields, access, retention and deletion need [#221](https://github.com/xodapi/kognitika/issues/221). |

## Required claims discipline

Do **not** claim that Kognitika processes no personal data, stores no profile/progress, or is legally compliant until the current server-side model, technical logging, retention controls, deployment configuration and legal review have changed and been verified.

The absence of observed analytics cookies is not evidence that no data is processed.

## Phased local-first migration

### Phase A, data-minimization controls

- Ship practice-flow telemetry as default-deny and preserve training UX with no telemetry transmission.
- Audit production source of truth and technical log boundary.
- Document server persistence and create an explicit local-only product mode proposal.

**Gate:** No network telemetry occurs when disabled; configuration is declared and tested; operational owners have reviewed production defaults.

### Phase B, encrypted local vault

- Establish a threat model: XSS, device compromise, shared device, lost recovery material, export theft, sync compromise and corrupted storage.
- Define encrypted IndexedDB vault schema, key derivation, versioning, lock/unlock UX, migration and deletion semantics.
- Keep identity/tokens out of a replacement store unless its security boundary is explicitly reviewed.

**Gate:** Approved design and tests for migration/rollback, local-only profile/results semantics and recovery failure paths.

### Phase C, user-controlled recovery

- Deliver encrypted export/import using user-controlled recovery material.
- Link implementation to existing [#78](https://github.com/xodapi/kognitika/issues/78).
- Make export previewed, user initiated, schema-versioned and free of raw browser-storage dumps.

**Gate:** Security review, restore tests, clear loss-of-recovery UX and no identity material in logs/tests/docs.

### Phase D, optional sync

- Evaluate opt-in E2EE or personal-cloud/blind-sync architecture.
- Preserve local authority by default and define conflict, revocation, key rotation and multi-device recovery behavior.

**Gate:** Threat model, independent review, traffic/data-minimization review and an immediate sync kill switch.

### Phase E, optional AI export

- Allow LLM/BYOK export only after a user selects the data, sees a preview, receives purpose/recipient disclosure and confirms the transfer.
- Do not automatically transmit raw results, identity or free text to an LLM provider.

**Gate:** explicit consent record local to the user, redaction controls and provider/retention disclosure.

## Work tracking

- [#220](https://github.com/xodapi/kognitika/issues/220), schema-guarded production ADMIN recovery.
- [#221](https://github.com/xodapi/kognitika/issues/221), deployment and technical-data-boundary audit.
- [#222](https://github.com/xodapi/kognitika/issues/222), telemetry default-deny.
- [#226](https://github.com/xodapi/kognitika/issues/226), local-only mode and encrypted vault design.
- [#224](https://github.com/xodapi/kognitika/issues/224), ongoing inventory, retention and policy/legal review.
- [#78](https://github.com/xodapi/kognitika/issues/78), encrypted portable backup export/import.
