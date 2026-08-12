/**
 * @vitest-environment node
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SERVER_ROOT = join(process.cwd(), 'src', 'server');
const RUNTIME_BOUNDARIES = ['routes', 'middleware', 'realtime'];
const PRISMA_IMPORT = /from\s+['"][^'"]*lib\/prisma(?:\.ts)?['"]/;

describe('runtime Prisma boundary', () => {
  it('keeps direct Prisma imports out of HTTP and realtime transports', async () => {
    const violations: string[] = [];

    for (const directory of RUNTIME_BOUNDARIES) {
      const path = join(SERVER_ROOT, directory);
      const files = await readdir(path);
      for (const file of files.filter((name) => name.endsWith('.ts'))) {
        const source = await readFile(join(path, file), 'utf8');
        if (PRISMA_IMPORT.test(source)) violations.push(join(directory, file));
      }
    }

    expect(violations).toEqual([]);
  });
});
