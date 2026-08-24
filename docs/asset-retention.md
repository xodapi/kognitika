# Static asset retention policy

The production deploy keeps hashed files from the previous `dist` directory
so an in-flight browser can finish loading an older build. The retention guard
provides an auditable cleanup plan:

- `dist/index.html` references are always retained;
- files younger than 24 hours are retained;
- older, unreferenced files are reported as candidates;
- normal deploy runs `--dry-run` only and never deletes assets;
- deletion requires a separately reviewed `--apply` invocation;
- the guard fails closed if `dist/index.html` or `dist/assets` is missing.

Run locally:

```bash
node scripts/asset-retention-guard.mjs --root=dist --dry-run
node scripts/asset-retention-guard.mjs --root=dist --min-age-hours=48 --dry-run
```

Do not run `--apply` against production as part of the normal application
deploy. Before an approved cleanup, preserve the current `dist` backup and
verify that the active `index.html` and rollback build remain available.
