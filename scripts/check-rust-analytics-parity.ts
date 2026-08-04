import { createGoldenV2Sessions, analyzeSession } from '../src/core/analyze-session/index.ts';
import { RustAnalyticsSidecarClient } from '../src/server/services/rust-analytics-sidecar.ts';

const baseUrl = process.env.RUST_ANALYTICS_SIDECAR_URL;
const explicitInternalParityRun = process.env.RUST_ANALYTICS_SIDECAR_PARITY_RUN === 'true';

if (!baseUrl || !explicitInternalParityRun) {
  console.error('Set RUST_ANALYTICS_SIDECAR_URL and RUST_ANALYTICS_SIDECAR_PARITY_RUN=true for an internal live sidecar parity check.');
  process.exitCode = 2;
} else {
  const client = new RustAnalyticsSidecarClient({ baseUrl, timeoutMs: 1_000, rolloutPercent: 100 });
  const fixtures = createGoldenV2Sessions();

  for (const fixture of fixtures) {
    await client.analyze(fixture, analyzeSession(fixture));
  }

  const metrics = client.getMetrics();
  if (metrics.mismatched > 0 || Object.values(metrics.failures).some(Boolean)) {
    console.error(JSON.stringify(metrics));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify(metrics));
  }
}
