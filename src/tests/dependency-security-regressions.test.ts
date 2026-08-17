import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

describe('dependency security regressions', () => {
  let lockfile: string;

  beforeAll(async () => {
    lockfile = await readFile(resolve(process.cwd(), 'pnpm-lock.yaml'), 'utf8');
  });

  it('keeps patched transitive dependency overrides', () => {
    expect(lockfile).toMatch(/^  deepmerge-ts: 8\.0\.0$/m);
    expect(lockfile).toMatch(/^  nanoid: 3\.3\.18$/m);
    expect(lockfile).toMatch(/^  valibot: 1\.4\.2$/m);
    expect(lockfile).toContain('deepmerge-ts@8.0.0');
    expect(lockfile).not.toContain('deepmerge-ts@7.1.5');
  });

  it('keeps every workspace on a patched Vite and esbuild resolution', () => {
    expect(lockfile).toMatch(/apps\/investor:[\s\S]*?version: 7\.3\.6\(/);
    expect(lockfile).not.toContain('vite@7.3.3');
    expect(lockfile).not.toContain('esbuild@0.27.7');
    expect(lockfile).toContain('vite@7.3.6');
    expect(lockfile).toContain('esbuild@0.28.1');
  });

  it('resolves Valibot to the patched version', () => {
    expect(lockfile).toContain('valibot@1.4.2');
    expect(lockfile).not.toContain('valibot@1.2.0');
  });
});
