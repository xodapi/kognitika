import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = join(rootDir, 'dist');
const htmlPath = join(distDir, 'index.html');

const budgets = {
  entryRawBytes: 160 * 1024,
  entryGzipBytes: 50 * 1024,
  initialRawBytes: 900 * 1024,
  initialGzipBytes: 260 * 1024,
  largestInitialRawBytes: 500 * 1024,
  largestInitialGzipBytes: 150 * 1024,
};

function bytes(value) {
  return `${(value / 1024).toFixed(1)} KiB`;
}

function fail(message) {
  console.error(`[bundle-budget] ${message}`);
  process.exitCode = 1;
}

function resolveDistAsset(reference, fromFile = htmlPath) {
  const cleanReference = reference.split('?')[0];
  if (cleanReference.startsWith('/')) {
    return normalize(join(distDir, cleanReference.replace(/^\//, '')));
  }

  return normalize(resolve(dirname(fromFile), cleanReference));
}

function assertInsideDist(filePath) {
  const relative = normalize(filePath).slice(normalize(distDir).length);
  return relative.startsWith('\\') || relative.startsWith('/');
}

function findHtmlAssetRefs(html) {
  const refs = new Set();
  const patterns = [/<script[^>]+type=["']module["'][^>]+src=["']([^"']+\.js)["'][^>]*>/gi];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) refs.add(match[1]);
  }

  return refs;
}

function findHtmlPreloadRefs(html) {
  const refs = new Set();
  const pattern = /<link[^>]+rel=["']modulepreload["'][^>]+href=["']([^"']+\.js)["'][^>]*>/gi;

  for (const match of html.matchAll(pattern)) refs.add(match[1]);

  return refs;
}

function findStaticImportRefs(source) {
  const refs = new Set();
  const importPattern = /\bimport\s*(?!\()\s*(?:["']([^"']+\.js)["']|[\w\s{},*$]+\s+from\s+["']([^"']+\.js)["'])/g;

  for (const match of source.matchAll(importPattern)) {
    refs.add(match[1] || match[2]);
  }

  return refs;
}

if (!existsSync(htmlPath)) {
  fail('dist/index.html is missing. Run `pnpm build` before `pnpm check:bundle`.');
  process.exit(process.exitCode || 0);
}

const html = readFileSync(htmlPath, 'utf8');
const entryRefs = [...findHtmlAssetRefs(html)];
const preloadRefs = [...findHtmlPreloadRefs(html)];
const initialFiles = new Set();
const queue = [...entryRefs, ...preloadRefs].map((ref) => resolveDistAsset(ref));

for (const filePath of queue) {
  if (initialFiles.has(filePath)) continue;
  if (!assertInsideDist(filePath) || !existsSync(filePath)) continue;

  initialFiles.add(filePath);
  const source = readFileSync(filePath, 'utf8');
  for (const ref of findStaticImportRefs(source)) {
    queue.push(resolveDistAsset(ref, filePath));
  }
}

const initialAssets = [...initialFiles]
  .map((filePath) => {
    const rawBytes = statSync(filePath).size;
    const gzipBytes = gzipSync(readFileSync(filePath)).length;
    return {
      filePath,
      label: filePath.replace(normalize(distDir), 'dist').replace(/\\/g, '/'),
      rawBytes,
      gzipBytes,
    };
  })
  .sort((a, b) => b.rawBytes - a.rawBytes);

const entryAssets = entryRefs
  .map((ref) => resolveDistAsset(ref))
  .filter((filePath) => existsSync(filePath))
  .map((filePath) => {
    const rawBytes = statSync(filePath).size;
    const gzipBytes = gzipSync(readFileSync(filePath)).length;
    return { filePath, rawBytes, gzipBytes };
  });

const initialRawBytes = initialAssets.reduce((sum, asset) => sum + asset.rawBytes, 0);
const initialGzipBytes = initialAssets.reduce((sum, asset) => sum + asset.gzipBytes, 0);
const entryRawBytes = entryAssets.reduce((sum, asset) => sum + asset.rawBytes, 0);
const entryGzipBytes = entryAssets.reduce((sum, asset) => sum + asset.gzipBytes, 0);
const largestInitialAsset = initialAssets[0];

console.log('[bundle-budget] Initial JS assets:');
for (const asset of initialAssets) {
  console.log(`- ${asset.label}: raw=${bytes(asset.rawBytes)} gzip=${bytes(asset.gzipBytes)}`);
}
console.log(`[bundle-budget] entry raw=${bytes(entryRawBytes)} gzip=${bytes(entryGzipBytes)}`);
console.log(`[bundle-budget] initial raw=${bytes(initialRawBytes)} gzip=${bytes(initialGzipBytes)}`);

if (entryRawBytes > budgets.entryRawBytes) {
  fail(`entry raw size ${bytes(entryRawBytes)} exceeds budget ${bytes(budgets.entryRawBytes)}`);
}
if (entryGzipBytes > budgets.entryGzipBytes) {
  fail(`entry gzip size ${bytes(entryGzipBytes)} exceeds budget ${bytes(budgets.entryGzipBytes)}`);
}
if (initialRawBytes > budgets.initialRawBytes) {
  fail(`initial raw size ${bytes(initialRawBytes)} exceeds budget ${bytes(budgets.initialRawBytes)}`);
}
if (initialGzipBytes > budgets.initialGzipBytes) {
  fail(`initial gzip size ${bytes(initialGzipBytes)} exceeds budget ${bytes(budgets.initialGzipBytes)}`);
}
if (largestInitialAsset && largestInitialAsset.rawBytes > budgets.largestInitialRawBytes) {
  fail(`largest initial asset raw size ${bytes(largestInitialAsset.rawBytes)} exceeds budget ${bytes(budgets.largestInitialRawBytes)}`);
}
if (largestInitialAsset && largestInitialAsset.gzipBytes > budgets.largestInitialGzipBytes) {
  fail(`largest initial asset gzip size ${bytes(largestInitialAsset.gzipBytes)} exceeds budget ${bytes(budgets.largestInitialGzipBytes)}`);
}

if (!process.exitCode) {
  console.log('[bundle-budget] OK');
}
