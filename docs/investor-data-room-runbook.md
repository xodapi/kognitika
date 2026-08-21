# Request-Only Investor Data Room Runbook

**Tracking:** GitHub issue [#212](https://github.com/xodapi/kognitika/issues/212)

**Status:** repository workflow defined; no data-room provider, invite, or
investor document is configured by this repository.

## Operating rule

The data room is request-only. An investor lead may request materials, but the
request must never grant access automatically. An owner reviews the request,
approves an explicit scope, creates an invite through the approved private
provider, and records the expiry/revocation decision outside public GitHub
content.

Do not place credentials, invite URLs, investor personal data, private financial
documents, legal documents, production exports, raw Brain IDs, tokens, or
private telemetry in Git, GitHub issues, CI logs, or this runbook.

## Request and review record

The owner must record, in the approved private system:

- request identifier;
- recipient identity and organization;
- request date and reviewer;
- approved document scope and reason for access;
- invite creation date, expiry, and revocation status;
- follow-up owner and review outcome.

The public issue tracker may contain only a sanitized status such as
`request received`, `review pending`, or `approved scope recorded`.

## Initial approved-scope template

The reviewer may select only the materials needed for the request:

1. investor deck and non-confidential product summary;
2. verified metrics with source, measurement date, caveats, and owner;
3. roadmap and repository-backed technical due diligence;
4. financing or convertible-loan terms after legal review;
5. relevant legal, privacy, security, and operational diligence materials.

Every metric must include its provenance and must not imply production or
scientific validation beyond the cited evidence. Production database extracts,
user-level data, credentials, raw logs, and private telemetry are excluded by
default and require a separate approved process.

## Provider and access controls

Before sending an invite, the owner must verify that the selected provider
supports:

- invite-only access with no public indexing;
- per-recipient or per-group permissions;
- expiry and immediate revocation;
- access audit history;
- download/preview controls appropriate to the approved scope;
- export and deletion procedures.

If any control is unavailable, do not publish the data room link. Use a manual,
time-bounded transfer approved by the owner instead.

## Evidence and closure

Issue #212 can be marked complete only after the owner records the selected
provider, a sanitized request/review procedure, an approved initial scope, and
a revocation/expiry test. The repository itself does not prove that an external
provider or investor access policy has been configured.
