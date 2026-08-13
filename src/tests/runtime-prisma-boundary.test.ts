/**
 * @vitest-environment node
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SERVER_ROOT = join(process.cwd(), 'src', 'server');
const RUNTIME_BOUNDARIES = ['routes', 'middleware', 'realtime'];
const RUNTIME_FILES = [join(process.cwd(), 'src', 'lib', 'subscribers.ts')];
const PRISMA_IMPORT = /from\s+['"][^'"]*lib\/prisma(?:\.ts)?['"]/;

describe('runtime Prisma boundary', () => {
  it('keeps direct Prisma imports out of runtime transports and subscribers', async () => {
    const violations: string[] = [];

    for (const directory of RUNTIME_BOUNDARIES) {
      const path = join(SERVER_ROOT, directory);
      const files = await readdir(path);
      for (const file of files.filter((name) => name.endsWith('.ts'))) {
        const source = await readFile(join(path, file), 'utf8');
        if (PRISMA_IMPORT.test(source)) violations.push(join(directory, file));
      }
    }

    for (const path of RUNTIME_FILES) {
      const source = await readFile(path, 'utf8');
      if (PRISMA_IMPORT.test(source)) violations.push(path);
    }

    expect(violations).toEqual([]);
  });
});
