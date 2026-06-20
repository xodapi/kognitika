import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const port = process.env.PORT || '3006';
const baseUrl = process.env.BASE_URL || `http://127.0.0.1:${port}`;
const healthUrl = `${baseUrl}/api/health`;
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
  PORT: port,
  BASE_URL: baseUrl,
  NODE_ENV: process.env.NODE_ENV || 'production',
  NO_PROXY: noProxy,
  no_proxy: noProxy,
};

let serverLog = '';
const server = spawn('pnpm', ['start'], {
  env,
  shell: process.platform === 'win32',
  stdio: ['ignore', 'pipe', 'pipe'],
});

server.stdout.setEncoding('utf8');
server.stderr.setEncoding('utf8');
server.stdout.on('data', (chunk) => {
  serverLog += chunk;
});
server.stderr.on('data', (chunk) => {
  serverLog += chunk;
});

const stopServer = async () => {
  if (server.exitCode !== null || server.signalCode) return;
  server.kill();
  await delay(250);
  if (server.exitCode === null && !server.signalCode) {
    server.kill('SIGKILL');
  }
};

const waitForHealth = async () => {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Local E2E server exited early with code ${server.exitCode}`);
    }

    try {
      const response = await fetch(healthUrl, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) {
        console.log(await response.text());
        return;
      }
    } catch {
      // Keep waiting until the server is ready or the timeout is reached.
    }

    console.log(`Waiting for local E2E server (${attempt}/60)...`);
    await delay(1_000);
  }

  throw new Error('Local E2E server did not become healthy');
};

try {
  await waitForHealth();

  const test = spawn('pnpm', ['test:e2e:attached'], {
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  const exitCode = await new Promise((resolve) => {
    test.on('exit', (code) => resolve(code ?? 1));
  });

  await stopServer();
  process.exit(exitCode);
} catch (error) {
  await stopServer();
  console.error(error instanceof Error ? error.message : error);
  if (serverLog.trim()) {
    console.error(serverLog);
  }
  process.exit(1);
}
