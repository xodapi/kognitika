import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function listFiles(dir: string): string[] {
  const absolute = path.join(repoRoot, dir);
  return readdirSync(absolute).flatMap((entry) => {
    const fullPath = path.join(absolute, entry);
    const relativePath = path.relative(repoRoot, fullPath).replace(/\\/g, '/');
    if (statSync(fullPath).isDirectory()) return listFiles(relativePath);
    return relativePath;
  });
}

describe('PWA offline-first guardrail', () => {
  it('documents the required strategy before Service Worker re-enable', () => {
    const strategy = read('docs/pwa-offline-strategy.md');

    expect(strategy).toContain('Service Worker registration is intentionally disabled');
    expect(strategy).toContain('Use Workbox or an equivalent explicit strategy layer');
    expect(strategy).toContain('index.html');
    expect(strategy).toContain('/assets/*');
    expect(strategy).toContain('network-only by default');
    expect(strategy).toContain('No raw Brain ID, token, email');
  });

  it('keeps the HTML manifest disabled while PWA is not enabled', () => {
    const html = read('index.html');
    const uncommentedHtml = html.replace(/<!--[\s\S]*?-->/g, '');

    expect(html).toContain('<!-- <link rel="manifest" href="/manifest.json" /> -->');
    expect(uncommentedHtml).not.toMatch(/<link\s+rel=["']manifest["'][^>]*>/i);
  });

  it('does not register a Service Worker from app code yet', () => {
    const files = [
      'index.html',
      ...listFiles('src').filter((file) => /\.(ts|tsx|js|jsx)$/.test(file)),
    ];

    const offenders = files.filter((file) => /serviceWorker\s*\.\s*register\s*\(/.test(read(file)));

    expect(offenders).toEqual([]);
  });

  it('keeps public sw.js as a revocation worker until Workbox strategy exists', () => {
    const serviceWorker = read('public/sw.js');

    expect(serviceWorker).toContain('caches.delete');
    expect(serviceWorker).toContain('self.registration.unregister');
    expect(serviceWorker).not.toContain('fetch');
    expect(serviceWorker).not.toContain('cache.addAll');
  });
});
