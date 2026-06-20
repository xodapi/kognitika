import { rm } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

const repoRoot = resolve(process.cwd());
const distPath = resolve(repoRoot, 'dist');
const relativeDist = relative(repoRoot, distPath);

if (!relativeDist || relativeDist.startsWith('..') || isAbsolute(relativeDist)) {
  throw new Error(`Refusing to remove path outside repository workspace: ${distPath}`);
}

await rm(distPath, { recursive: true, force: true });
console.log(`Removed ${relativeDist}`);
