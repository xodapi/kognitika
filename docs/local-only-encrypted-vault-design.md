# Local-only mode and encrypted IndexedDB vault design

**Status:** proposed, requires product and security approval before implementation.
**Tracking:** [#226](https://github.com/xodapi/kognitika/issues/226)
**Related:** [#78](https://github.com/xodapi/kognitika/issues/78) covers encrypted export/import and is not duplicated here.

## Scope and non-goals

This design defines a browser-local, offline-capable product mode. It does not
authorize cryptographic implementation, automatic cloud synchronization, server
migration, or storage of existing access tokens in IndexedDB.

Existing web identity data remains in `localStorage` until a separately reviewed
migration is implemented. It must not be copied into this vault as an
intermediate migration step. Native secure-storage behavior remains unchanged.

## Local-only product semantics

| Area | Local-only behavior |
| --- | --- |
| Identity | A device-local pseudonymous profile is created. It is not a server account and has no access token. |
| Results and progress | Stored only in the encrypted vault on the current browser profile. |
| Dashboard | Shows only locally stored results and clearly labels them as device-local. |
| Retention and deletion | Data is retained until the user deletes the local profile, clears browser site data, or uses a future user-initiated export/import flow. |
| Restore | No recovery is possible without the unlock material or a future encrypted export created under #78. |
| Feature limits | No account recovery, cross-device continuity, server leaderboards, server-backed social features, or automatic synchronization. |
| Network boundary | Training must remain usable without a server session. Telemetry and synchronization default to off. |

The UI must present these limitations before profile creation and before any
destructive local-data action.

## Threat model and required mitigations

| Threat | Boundary and required mitigation |
| --- | --- |
| XSS | Encryption cannot protect a vault while malicious script runs in an unlocked origin. Preserve CSP/XSS defenses, keep plaintext only in memory for the shortest possible time, lock on inactivity, and do not claim XSS-proof storage. |
| Device compromise | Treat an unlocked browser profile as compromised. Require an explicit lock operation, optionally support a user-supplied passphrase, and document that OS/browser compromise is outside the vault's protection. |
| Shared device | Do not auto-unlock on browser start. Provide visible lock state, inactivity locking, and profile deletion. Do not use a browser-stored persistent unlock secret. |
| Lost recovery material | There is no password reset for local-only data. Require an explicit acknowledgement during passphrase setup and direct users to the separately designed encrypted export flow in #78. |
| Sync compromise | Sync is absent by default. A future opt-in sync protocol requires a separate threat model, transport/data-minimization review, revocation, conflict handling, and an immediate kill switch. |
| Export theft | Export is not part of this implementation. #78 must make it user-initiated, encrypted, previewed, versioned, and free of raw browser-storage dumps. |
| Corrupt or evicted storage | Authenticate every encrypted record, validate schemas after decrypting, preserve a recoverable pre-migration snapshot, and present reset/restore choices without silently discarding valid data. |

## Vault format

Use a dedicated IndexedDB database named `kognitika-local-vault`, versioned
independently from the application. The database contains no access token, JWT,
server user record, or raw browser-storage backup.

| Store | Key | Encrypted payload | Purpose |
| --- | --- | --- | --- |
| `meta` | `vault` | No | Format version, KDF parameters, wrapped data-key metadata, creation/update timestamps and non-sensitive lock configuration. |
| `profile` | local profile ID | Yes | Pseudonymous local profile and user-selected preferences. |
| `sessions` | opaque session ID | Yes | Local training session summaries and progress data. |
| `settings` | setting name | Yes | Local-only preferences and consent choices. |
| `migration-journal` | migration ID | Yes | Idempotent migration state and rollback marker. |

The `meta` record may identify a format but must not contain a Brain ID, token,
email, user name, raw session data, passphrase, or data-encryption key.

Each encrypted record is an envelope:

```text
{
  version: 1,
  algorithm: "AES-GCM-256",
  keyId: "<opaque random identifier>",
  nonce: "<unique random bytes>",
  ciphertext: "<authenticated encrypted bytes>"
}
```

Record metadata is authenticated as additional data and includes the vault
format version, store name, and record key. Nonces must be generated randomly
for every encryption under a key and never reused.

## Key hierarchy and lock state

1. Generate a random 256-bit data-encryption key (DEK) when creating a local
   vault.
2. When passphrase protection is enabled, derive a key-encryption key (KEK)
   from a user passphrase using a reviewed memory-hard KDF. Persist only the
   KDF algorithm, version, salt, and work parameters in `meta`.
3. Wrap the DEK with the KEK and persist only the wrapped DEK. The passphrase
   and KEK exist only in memory while unlocked.
4. Encrypt every payload with the DEK using Web Crypto AES-GCM.
5. Locking clears the DEK, KEK, decrypted caches, and pending plaintext from
   memory. It does not delete encrypted records.

The concrete KDF choice and parameters require cryptographic review, browser
compatibility testing, and an upgrade plan before code is written. The
implementation must use the browser Web Crypto API, reject unavailable required
primitives, and never invent cryptographic primitives or fall back to plaintext.

## Migration and rollback

No migration runs automatically on application upgrade.

1. Detect legacy browser identity only to explain that account-backed data is
   separate. Never import its token, user object, or Brain ID into IndexedDB.
2. Ask the user to choose either the existing account-backed mode or a new
   local-only profile. The choice is explicit and reversible at the product
   level, but data is not silently merged.
3. Before a format migration, create a journal record and retain old encrypted
   records until the new schema validates.
4. Migrate in idempotent batches. On interruption, resume from the journal or
   retain the prior format. Do not delete the source before verified readback.
5. On failure, lock the vault and expose safe choices: retry, reset the local
   vault, or restore a future #78 export. Never expose ciphertext, keys, or
   raw records in logs or error messages.

Rollback means deploying a client that can still read the prior supported vault
version or restoring the retained pre-migration encrypted records. It does not
mean recovering a forgotten passphrase.

## Future opt-in synchronization boundary

Local-only data remains authoritative unless a user separately opts into sync.
That flow must disclose recipient, purpose, categories, retention, conflict
behavior, revocation, and deletion behavior. It must transmit only the
minimum encrypted/versioned records required by the selected feature, exclude
access tokens and raw browser storage, and include an operator-controlled
kill switch that immediately stops new sync attempts.

## Required implementation tests

- Encrypt/decrypt round trips and authentication-failure rejection.
- Unique nonce generation and no plaintext records in IndexedDB.
- Lock clears in-memory key material and requires explicit unlock.
- Corrupt, unknown-version, and interrupted-migration recovery behavior.
- No token, JWT, Brain ID, or server user record is copied from browser
  `localStorage` to the vault.
- Local-only mode functions with network requests disabled.
- Delete/reset removes all vault stores and does not affect account-backed
  browser storage unless the user separately requests that action.
- Migration rollback/readback tests for every supported format version.

## Approval gates

Before implementation, a product owner and security reviewer must approve the
threat model, local-only limitations, KDF selection/parameters, migration UX,
and test plan. Any subsequent synchronization or export work remains separately
gated by #78 and its own review.
