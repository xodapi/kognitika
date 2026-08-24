import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseOptions, planAssetRetention } from '../../scripts/asset-retention-guard.mjs';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'kognitika-assets-'));
  temporaryRoots.push(root);
  await mkdir(path.join(root, 'assets'));
  return root;
}

describe('asset retention guard', () => {
  it('keeps index-referenced and recent assets while planning old unreferenced files', async () => {
    const root = await createFixture();
    const now = new Date('2026-08-24T12:00:00.000Z');
    const old = new Date('2026-08-22T00:00:00.000Z');
    await writeFile(path.join(root, 'index.html'), '<script src="/assets/app-current.js"></script>');
    for (const name of ['app-current.js', 'app-recent.js', 'app-old.js']) {
      await writeFile(path.join(root, 'assets', name), 'synthetic');
    }
    await utimes(path.join(root, 'assets', 'app-old.js'), old, old);

    const plan = await planAssetRetention({ assetDir: path.join(root, 'assets'), now });

    expect(plan.referenced).toEqual(['app-current.js']);
    expect(plan.retained.map(({ name }) => name).sort()).toEqual(['app-current.js', 'app-recent.js']);
    expect(plan.candidates.map(({ name }) => name)).toEqual(['app-old.js']);
  });

  it('requires an explicit minimum window of at least 24 hours', () => {
    expect(() => parseOptions(['--min-age-hours=12'])).toThrow(/at least 24/);
    expect(parseOptions(['--dry-run', '--root=dist'])).toMatchObject({ apply: false, minAgeHours: 24, root: 'dist' });
    expect(parseOptions(['--apply'])).toMatchObject({ apply: true });
  });
});
