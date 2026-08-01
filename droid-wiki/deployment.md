# Deployment

Kognitika uses three GitHub Actions workflows for continuous integration, production deployment, and Android builds. Direct edits to production server files are forbidden outside documented emergency hotfixes.

## CI workflow

File: `.github/workflows/ci.yml`

Runs on every push to `main`, `master`, or `codex/**` branches, and on every pull request.

Steps:
1. Checkout the repository.
2. Set up pnpm 10.22.0 and Node.js 22.
3. Start a PostgreSQL 15 service container.
4. Install dependencies with `pnpm install --frozen-lockfile`.
5. Run `cargo test` for the Rust WASM core at `crates/kognitika-core/`.
6. Run TypeScript lint with `pnpm lint`.
7. Run Vitest unit tests with `pnpm test`.
8. Run `pnpm validate` (same as test).
9. Build the frontend with `pnpm build`.
10. Check bundle size with `pnpm check:bundle`.
11. Install Playwright browsers and run E2E tests with `pnpm test:e2e`.

## Deploy workflow

File: `.github/workflows/deploy.yml`

Runs on every push to `main` (or manually via `workflow_dispatch`).

The workflow has two jobs:

**Verify** -- runs the same checks as the CI workflow (lint, test, build, Rust tests).

**Deploy** -- runs after verify passes, in the `production` environment:

1. Prepares an SSH connection to the deploy host using secrets (`KOGNITIKA_DEPLOY_HOST`, `KOGNITIKA_DEPLOY_PORT`, `KOGNITIKA_DEPLOY_SSH_KEY`).
2. On the server, the deploy script:
   - Creates a timestamped backup of the current `dist/` directory.
   - Pulls the latest `main` branch with `git pull --ff-only`.
   - Verifies the checked-out commit matches the expected SHA.
   - Restores cached `dist/assets` to preserve immutable asset URLs.
   - Runs `pnpm install --frozen-lockfile`.
   - Configures nginx for `kognitika.ru` with TLS via certbot.
   - Inserts or updates the production `.env` file with the correct `APP_URL`, `FRONTEND_URL`, and `CORS_ORIGIN` values.
   - Runs Prisma migrations with `pnpm exec prisma migrate deploy`.
   - Builds the frontend with `BUILD_HASH=<sha> pnpm build`.
   - Exports and deploys the mobile web version.
   - Restarts the `kognitika` systemd service.
   - Polls `/api/health` up to 30 times (2-second intervals) until the new build responds.
   - Verifies the health check response contains the expected `buildId`.

## Android build workflow

File: `.github/workflows/android.yml`

Runs on pushes to `main` affecting Capacitor-related paths, on pull requests, and manually with optional `release` flag.

Jobs:

**Debug** -- builds an unsigned debug APK:
1. Checks out the repository.
2. Sets up pnpm, Node.js 22, and Java 21 (Temurin).
3. Installs dependencies, builds the frontend, synchronizes Capacitor.
4. Runs Android unit tests.
5. Assembles the debug APK.
6. Uploads the APK as a build artifact (retained for 14 days).

**GitHub Release** -- runs after debug on push to `main`:
1. Downloads the debug APK artifact.
2. Deletes the existing `android-latest` release and tag.
3. Creates a new `android-latest` release with the APK attached.

**Release** -- runs only when `workflow_dispatch` is triggered with `release=true`:
1. Decodes the Android keystore from a base64 secret.
2. Signs and assembles a release App Bundle (AAB).
3. Uploads the AAB as a build artifact (retained for 30 days) for Play Console upload.

## Canonical deploy flow

Normal production changes follow this sequence:

```
local changes -> git commit -> git push -> GitHub PR -> merge to main -> GitHub Actions deploy
```

The server updates itself through the repository-first flow. Do not edit files under `/opt/kognitika/` or `/opt/kognitika/dist/` directly during normal work.

## Health check

```bash
curl https://kognitika.ru/api/health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2026-07-29T12:00:00.000Z",
  "buildId": "abc1234"
}
```

The `buildId` should match the short commit hash of the deployed version.

## Docker

For local full-stack deployment:

```bash
docker compose up --build
```

- App container: port 3006
- PostgreSQL container: port 5432 (user: `admin`, password: `adminpassword`, database: `cognitika`)

The Dockerfile is at the project root and uses `tsx` to run the Express server. The `docker-compose.yml` defines both services and a health check for the database.
