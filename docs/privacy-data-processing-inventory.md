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

## Privacy review and operations worksheet

The following assignments are review targets, not claims that a controller,
processor, retention period, or legal basis has been approved. An **unassigned**
owner is an explicit release blocker for a flow that processes real user data.

| Flow | Product purpose | Proposed accountable owner | Legal/privacy question for review | Retention and deletion control | Evidence still required |
| --- | --- | --- | --- | --- | --- |
| Web browser identity | Keep a user session and Brain ID cache available in the browser. | Identity product owner, unassigned | What data category, basis, user notice, and browser-clearing guidance apply to the cached identity and token? | Browser storage persists until the user/app clears it; no server-side deletion claim follows from browser clearing. | Confirm production keys, session expiry, logout behavior, and deployed storage paths. |
| Native secure storage | Preserve the same identity material in a platform-backed keystore. | Mobile owner, unassigned | Which platform backup, device-transfer, and shared-device behaviors must be disclosed? | Platform-controlled; product must provide a clear/logout path and document limitations. | Review iOS/Android keystore, backup, and uninstall behavior on supported versions. |
| PostgreSQL profile, results, and progress | Provide account-backed training, dashboards, progression, and support operations. | Data product owner, unassigned | Identify controller/processor roles, purpose limitation, access model, retention schedule, deletion executor, and legal basis. | Retention and deletion are not verified; no time limit or erasure SLA may be represented as current behavior. | Read-only production schema, backup, job, and operational-access audit under #221. |
| Feedback and ideas free text | Receive user feedback and product suggestions. | Support/product owner, unassigned | Free text can contain unexpected sensitive or personal data. What notice, moderation access, retention, and deletion process applies? | Current application persistence is verified; retention/deletion process is not. | Review admin access, notification channels, backups, and deletion workflow. |
| Practice-flow telemetry | Measure optional training-flow behavior only when explicitly enabled. | Analytics owner, unassigned | Confirm default-deny state, consent wording, data minimization, destination, and whether any profiling rules apply. | Bounded in-process data is documented; deployed configuration and clearing behavior require verification. | Production configuration and endpoint behavior after deploy under #222. |
| Backups and infrastructure logs | Operate, secure, recover, and diagnose the service. | Infrastructure owner, unassigned | Identify hosting, DNS/CDN, Nginx, database, CI, and backup processors; determine IP/log categories, access, retention, deletion, and incident disclosure obligations. | Not verified from source. Application-level deletion does not imply removal from backups or infrastructure logs. | Production infrastructure and backup inventory under #221. |

## 152-FZ and privacy-counsel review checklist

Before publishing a privacy notice, retention policy, or compliance statement,
the designated privacy/legal reviewer must record answers, evidence locations,
review date, and responsible owner for the following:

1. Data categories and purposes for every flow in the worksheet, including
   whether free text or behavioral data creates heightened obligations.
2. Controller/processor roles, hosting and cross-border transfer facts, and
   applicable jurisdictional requirements, including 152-FZ where applicable.
3. The documented lawful basis or other legal condition for each purpose,
   together with consent and withdrawal requirements where relevant.
4. Retention schedules, backup retention, deletion/erasure execution, access
   control, auditability, and how a user can exercise applicable rights.
5. Security controls for browser storage, native keystores, PostgreSQL,
   operational access, secrets, incident response, and vendor access.
6. The final user-facing wording for local-only limitations, optional telemetry,
   export/import, optional synchronization, and any LLM/BYOK transfer.

Keep review records free of raw user data, tokens, Brain IDs, private telemetry,
backup payloads, credentials, and production log excerpts.

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
