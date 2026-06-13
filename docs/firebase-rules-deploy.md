# Firebase Rules Deploy Gate

This repository treats `firestore.rules` as privacy-sensitive infrastructure. Rules changes must not be considered live until the active Firebase release is deployed and verified.

## Local Checks

Run these before opening or merging a rules PR:

```bash
pnpm check:firebase:rules
```

The Firestore emulator requires Java 11+. Local machines only need to run the static gate above; emulator verification runs in GitHub Actions with Java 21.

## CI Emulator Checks

The CI-only emulator test is:

```bash
pnpm test:firestore:rules
```

It uses only synthetic users and synthetic feedback documents. It verifies:

- non-admin users cannot list feedback;
- admin access uses the `admin` custom claim;
- feedback creation does not require email or `email_verified`;
- feedback documents cannot contain raw email, token, or raw Brain ID fields.

## GitHub Secret

Configure this repository secret before expecting automatic Firebase rules deploys:

```text
FIREBASE_SERVICE_ACCOUNT_JSON
```

It must contain a service-account JSON for Firebase project `gen-lang-client-0338318402` with permission to deploy Firebase Security Rules.

## Deploy Flow

Normal deploy path:

```bash
pnpm check:firebase:rules
pnpm exec firebase deploy --only firestore:rules --project gen-lang-client-0338318402 --non-interactive
```

After deploy, record in the GitHub issue or deploy log:

- commit SHA;
- workflow URL or terminal command used;
- UTC timestamp;
- `firestore.rules` SHA-256 printed by `pnpm check:firebase:rules`.

If `FIREBASE_SERVICE_ACCOUNT_JSON` is missing, the GitHub workflow must report `[WARNING]` and the Firebase-side part of the issue remains unverified.
