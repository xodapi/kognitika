import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playwrightCli = path.join(repoRoot, 'node_modules', '@playwright', 'test', 'cli.js');
const localNoProxy = [
  '127.0.0.1',
  'localhost',
  '::1',
  ...(process.env.NO_PROXY || process.env.no_proxy || '').split(','),
]
  .map((value) => value.trim())
  .filter(Boolean);
const noProxy = [...new Set(localNoProxy)].join(',');

const env = {
  ...process.env,
  BASE_URL: process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || '3006'}`,
  NO_PROXY: noProxy,
  no_proxy: noProxy,
};

const result = spawnSync(
  process.execPath,
  [playwrightCli, 'test', ...process.argv.slice(2)],
  {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);
