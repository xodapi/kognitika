import { readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

export const DEFAULT_TOTAL_THRESHOLD_MS = 3_000;
export const DEFAULT_CONSECUTIVE_LIMIT = 3;

function proxyMode(targetUrl, env = process.env) {
  const target = new URL(targetUrl);
  const noProxy = (env.NO_PROXY || env.no_proxy || '').split(',').map((value) => value.trim()).filter(Boolean);
  const bypassed = noProxy.some((entry) => entry === '*' || target.hostname === entry || target.hostname.endsWith(`.${entry}`));
  const proxy = env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy;
  return proxy && !bypassed ? 'proxy' : 'direct';
}

async function measure(url, fetchImpl = fetch, env = process.env) {
  const started = performance.now();
  const response = await fetchImpl(url, { redirect: 'manual' });
  const headersAt = performance.now();
  const body = await response.text();
  const finished = performance.now();
  return {
    url,
    status: response.status,
    totalMs: Math.round(finished - started),
    ttfbMs: Math.round(headersAt - started),
    bytes: Buffer.byteLength(body),
    proxy: proxyMode(url, env),
    body,
  };
}

export function findActiveAsset(html) {
  const match = html.match(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/);
  return match?.[1] ?? null;
}

export function updateConsecutiveState(previous, breached) {
  const consecutiveBreaches = breached ? (previous?.consecutiveBreaches ?? 0) + 1 : 0;
  return {
    consecutiveBreaches,
    alert: consecutiveBreaches >= DEFAULT_CONSECUTIVE_LIMIT,
  };
}

export async function runMonitor({
  baseUrl,
  thresholdMs = DEFAULT_TOTAL_THRESHOLD_MS,
  consecutiveLimit = DEFAULT_CONSECUTIVE_LIMIT,
  stateFile = path.join(os.tmpdir(), 'kognitika-production-latency-state.json'),
  fetchImpl = fetch,
  env = process.env,
}) {
  if (!baseUrl) throw new Error('baseUrl is required');
  const origin = baseUrl.replace(/\/+$/, '');
  const home = await measure(`${origin}/`, fetchImpl, env);
  const health = await measure(`${origin}/api/health`, fetchImpl, env);
  const activeAsset = findActiveAsset(home.body);
  const asset = activeAsset
    ? await measure(`${origin}${activeAsset}`, fetchImpl, env)
    : { url: null, status: 0, totalMs: 0, ttfbMs: 0, bytes: 0, proxy: home.proxy, body: '' };
  const measurements = [home, health, asset];
  const breached = measurements.some((measurement) => measurement.status < 200
    || measurement.status >= 400
    || measurement.totalMs > thresholdMs);
  const previous = await readState(stateFile);
  const state = updateConsecutiveState(previous, breached);
  state.alert = state.consecutiveBreaches >= consecutiveLimit;
  await writeFile(stateFile, JSON.stringify(state), 'utf8');
  return {
    measurements: measurements.map(({ body, ...measurement }) => measurement),
    buildId: parseBuildId(health.body),
    breached,
    ...state,
  };
}

function parseBuildId(body) {
  try {
    return JSON.parse(body).buildId ?? null;
  } catch {
    return null;
  }
}

async function readState(stateFile) {
  try {
    return JSON.parse(await readFile(stateFile, 'utf8'));
  } catch {
    return { consecutiveBreaches: 0 };
  }
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const baseUrl = process.env.BASE_URL || 'https://kognitika.ru';
  try {
    const result = await runMonitor({ baseUrl });
    console.log(JSON.stringify(result));
    process.exitCode = result.alert ? 2 : 0;
  } catch (error) {
    console.error(`[latency-monitor] ${error instanceof Error ? error.message : 'monitor failed'}`);
    process.exitCode = 1;
  }
}
