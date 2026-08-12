/**
 * @vitest-environment node
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SERVER_ROOT = join(process.cwd(), 'src', 'server');
const APPLICATION_BOUNDARIES = ['services', 'repositories'];
const PRISMA_IMPORT = /from\s+['"]@prisma\/client['"]/;

describe('application Prisma type boundary', () => {
  it('keeps generated Prisma types out of services and repository ports', async () => {
    const violations: string[] = [];

    for (const directory of APPLICATION_BOUNDARIES) {
      const files = await readdir(join(SERVER_ROOT, directory), { recursive: true });
      for (const file of files.filter((name) => name.endsWith('.ts'))) {
        const source = await readFile(join(SERVER_ROOT, directory, file), 'utf8');
        if (PRISMA_IMPORT.test(source)) violations.push(join(directory, file));
      }
    }

    expect(violations).toEqual([]);
  });
});
