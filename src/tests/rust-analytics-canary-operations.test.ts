import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const readRepoFile = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('Rust analytics canary operational boundary', () => {
  it('keeps the sidecar internal-only and default rollout disabled in Compose', () => {
    const compose = readRepoFile('docker-compose.yml');
    const sidecarBlock = compose.slice(compose.indexOf('  analytics-sidecar:'), compose.indexOf('  app:'));

    expect(sidecarBlock).toContain('dockerfile: crates/kognitika-analytics-sidecar/Dockerfile');
    expect(sidecarBlock).not.toMatch(/^\s+ports:/m);
    const sidecarConfig = sidecarBlock
      .split(/\r?\n/)
      .filter((line) => !line.trimStart().startsWith('#'))
      .join('\n');
    expect(sidecarConfig).not.toMatch(/database_url|postgres_|jwt_secret|token|secret|volumes:/i);
    expect(compose).toContain('RUST_ANALYTICS_SIDECAR_URL=http://analytics-sidecar:3010');
    expect(compose).toContain('RUST_ANALYTICS_SIDECAR_ROLLOUT_PERCENT=${RUST_ANALYTICS_SIDECAR_ROLLOUT_PERCENT:-0}');
  });

  it('documents explicit preflight, thresholds, and configuration-only rollback', () => {
    const runbook = readRepoFile('docs/rust-analytics-canary-runbook.md');

    for (const required of [
      'RUST_ANALYTICS_SIDECAR_ROLLOUT_PERCENT=0',
      'RUST_ANALYTICS_SIDECAR_ROLLOUT_PERCENT=1',
      'at least 100',
      'at most 1%',
      'at most 2%',
      'at most 60 seconds',
      'database credentials',
      'TypeScript output remains authoritative',
    ]) {
      expect(runbook).toContain(required);
    }
  });
});
