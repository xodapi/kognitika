# Production Startup Smoke Check

Run this check after a Kognitika deployment, host reboot, or systemd service recovery. It validates the repository-first runtime contract without printing environment values or user data.

## Canonical contract

- Kognitika listens on `127.0.0.1:3006` by default.
- Nginx proxies `kognitika.ru` to `127.0.0.1:3006`.
- The generated Prisma client must exist before `kognitika.service` starts.
- The production health endpoint is `https://kognitika.ru/api/health`.

The deployment workflow enforces the first three conditions by setting `PORT=3006` in the protected production environment, running `pnpm exec prisma generate` after dependency installation, and installing the committed Nginx configuration.

## Read-only verification

On the production host:

```bash
systemctl is-active kognitika nginx
ss -ltnp '( sport = :3006 )'
curl -fsS http://127.0.0.1:3006/api/health
curl -fsS https://kognitika.ru/api/health
```

Expected results:

- both services are `active`;
- Kognitika is listening only on the configured loopback port;
- both health responses return HTTP 200;
- each response includes the deployed short commit hash in `buildId`.

If any condition fails, do not run migrations, use `prisma db push`, edit `_prisma_migrations`, or make an unreviewed configuration change. Capture non-sensitive status and logs, restore service through the documented emergency procedure only with explicit approval, then reconcile the repair through a reviewed PR.
