import { readdir, readFile, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_MIN_AGE_HOURS = 24;

export function parseOptions(argv) {
  const options = {
    root: 'dist',
    minAgeHours: DEFAULT_MIN_AGE_HOURS,
    apply: false,
  };

  for (const argument of argv) {
    if (argument === '--apply') {
      options.apply = true;
    } else if (argument === '--dry-run') {
      options.apply = false;
    } else if (argument.startsWith('--root=')) {
      options.root = argument.slice('--root='.length);
    } else if (argument.startsWith('--min-age-hours=')) {
      options.minAgeHours = Number(argument.slice('--min-age-hours='.length));
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  if (!Number.isFinite(options.minAgeHours) || options.minAgeHours < 24) {
    throw new Error('--min-age-hours must be at least 24.');
  }
  return options;
}

export function referencedAssetNames(indexHtml, availableNames) {
  const available = new Set(availableNames);
  const references = new Set();
  const pattern = /(?:^|["'(])(?:\.?\/)?assets\/([^"'?)\s#]+)/g;
  for (const match of indexHtml.matchAll(pattern)) {
    const name = match[1];
    if (available.has(name)) references.add(name);
  }
  return references;
}

export async function planAssetRetention({
  assetDir,
  indexPath = path.join(path.dirname(assetDir), 'index.html'),
  now = new Date(),
  minAgeHours = DEFAULT_MIN_AGE_HOURS,
}) {
  const entries = await readdir(assetDir, { withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const indexHtml = await readFile(indexPath, 'utf8');
  const referenced = referencedAssetNames(indexHtml, files);
  const cutoff = now.getTime() - minAgeHours * 60 * 60 * 1000;
  const candidates = [];
  const retained = [];

  for (const name of files) {
    const filePath = path.join(assetDir, name);
    const fileStat = await stat(filePath);
    const isFresh = fileStat.mtimeMs >= cutoff;
    if (referenced.has(name) || isFresh) {
      retained.push({ name, reason: referenced.has(name) ? 'index-reference' : 'younger-than-retention-window' });
    } else {
      candidates.push({ name, path: filePath, mtime: new Date(fileStat.mtimeMs) });
    }
  }

  return { candidates, retained, cutoff: new Date(cutoff), referenced: [...referenced].sort() };
}

export async function run(argv = process.argv.slice(2), io = console) {
  const options = parseOptions(argv);
  const assetDir = path.resolve(options.root, 'assets');
  const indexPath = path.resolve(options.root, 'index.html');
  const plan = await planAssetRetention({
    assetDir,
    indexPath,
    minAgeHours: options.minAgeHours,
  });

  io.log(`[asset-retention] mode=${options.apply ? 'apply' : 'dry-run'} assets=${plan.retained.length + plan.candidates.length} retained=${plan.retained.length} candidates=${plan.candidates.length}`);
  for (const candidate of plan.candidates) {
    io.log(`[asset-retention] candidate=${candidate.name} mtime=${candidate.mtime.toISOString()}`);
    if (options.apply) await rm(candidate.path);
  }
  if (options.apply && plan.candidates.length > 0) {
    io.log(`[asset-retention] removed=${plan.candidates.length}`);
  }
  return plan;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    await run();
  } catch (error) {
    console.error(`[asset-retention] ${error instanceof Error ? error.message : 'failed'}`);
    process.exitCode = 1;
  }
}
