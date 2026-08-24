# Production latency monitor

`scripts/production-latency-monitor.mjs` measures `/`, `/api/health`, and the
hashed JavaScript or CSS asset referenced by the current index page.

It reports HTTP status, total time, time to response headers (the monitor's
TTFB approximation), byte count, build ID, and whether the configured
`HTTP(S)_PROXY` was used or bypassed by `NO_PROXY`.

Defaults:

- total latency threshold: 3 seconds;
- alert threshold: 3 consecutive breached checks;
- state file: the operating system temporary directory;
- no credentials, Brain ID, tokens, response bodies, or private telemetry are
  written to output or state.

Run a check:

```bash
BASE_URL=https://kognitika.ru node scripts/production-latency-monitor.mjs
```

For a recurring external scheduler, provide a persistent `stateFile` through
the script API or wrapper. A single slow check exits successfully; the process
exits with code `2` only after the consecutive breach threshold is reached.
Resetting the state is safe because it can only suppress an alert until the
threshold is reached again.
