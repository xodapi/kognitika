import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSafeLogger } from '../lib/safe-logger';

const root = process.cwd();
const runtimeRoots = ['server.ts', 'src'];
const allowedConsoleFiles = new Set([
  'src/lib/safe-logger.ts',
]);

function listRuntimeFiles(entry: string): string[] {
  const absolute = join(root, entry);
  const stat = statSync(absolute);
  if (stat.isFile()) return [absolute];

  return readdirSync(absolute).flatMap((name) => {
    const child = join(absolute, name);
    const childRelative = relative(root, child).replace(/\\/g, '/');
    if (childRelative.startsWith('src/tests/')) return [];
    if (childRelative.includes('/__fixtures__/')) return [];
    if (statSync(child).isDirectory()) return listRuntimeFiles(childRelative);
    return [child];
  });
}

describe('logging privacy boundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps direct console usage isolated to the safe logger', () => {
    const offenders: string[] = [];
    const consolePattern = /console\.(log|warn|error|info|debug)\s*\(/g;

    for (const file of runtimeRoots.flatMap(listRuntimeFiles)) {
      const relativeFile = relative(root, file).replace(/\\/g, '/');
      if (allowedConsoleFiles.has(relativeFile)) continue;
      if (!/\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/.test(relativeFile)) continue;

      const source = readFileSync(file, 'utf8');
      const matches = source.match(consolePattern);
      if (matches) offenders.push(`${relativeFile}: ${matches.join(', ')}`);
    }

    expect(offenders).toEqual([]);
  });

  it('redacts sensitive identifiers and secrets from logger output', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('DEBUG_LOGS', 'true');
    const logger = createSafeLogger('privacy-test');

    logger.warn('Failed for user synthetic@example.invalid with token abc', {
      email: 'synthetic@example.invalid',
      brainId: 'BR-SYNTHETIC-RAW',
      authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature',
      nested: {
        message: 'refresh token leaked for synthetic@example.invalid',
      },
    });

    const output = JSON.stringify(warnSpy.mock.calls);

    expect(output).not.toContain('synthetic@example.invalid');
    expect(output).not.toContain('BR-SYNTHETIC-RAW');
    expect(output).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(output).toContain('[redacted]');
  });
});
