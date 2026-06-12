/**
 * @vitest-environment node
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

function collectFiles(dir: string, extensions: string[]) {
  const root = fileURLToPath(new URL(`../../${dir}`, import.meta.url));
  const files: string[] = [];

  function walk(path: string) {
    for (const entry of readdirSync(path)) {
      const fullPath = join(path, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (extensions.some((extension) => fullPath.endsWith(extension))) {
        files.push(fullPath);
      }
    }
  }

  walk(root);
  return files;
}

describe('legacy email audit', () => {
  it('keeps public auth UI Brain ID-only', () => {
    const authModal = readRepoFile('src/components/AuthModal.tsx');

    expect(authModal).not.toMatch(/type=["']email["']/);
    expect(authModal).not.toMatch(/type=["']password["']/);
    expect(authModal).not.toContain('/api/auth/login');
    expect(authModal).not.toContain('/api/auth/register');
    expect(authModal).not.toContain('/api/auth/magic-link');
  });

  it('does not use user.email as public UI identity', () => {
    const files = [
      readRepoFile('src/App.tsx'),
      ...collectFiles('src/components', ['.tsx']).map((file) => readFileSync(file, 'utf8')),
    ];

    for (const source of files) {
      expect(source).not.toMatch(/\buser\.email\b/);
    }
  });

  it('keeps email delivery behind explicit legacy opt-in flags', () => {
    const subscribers = readRepoFile('src/lib/subscribers.ts');
    const reportSubscriber = readRepoFile('src/lib/report-subscriber.ts');
    const mailService = readRepoFile('src/server/services/mail.ts');
    const envExample = readRepoFile('.env.example');

    expect(subscribers).toContain('LEGACY_EMAIL_NOTIFICATIONS_ENABLED');
    expect(reportSubscriber).toContain('LEGACY_EMAIL_NOTIFICATIONS_ENABLED');
    expect(mailService).toContain('LEGACY_EMAIL_AUTH_ENABLED');
    expect(envExample).toContain('LEGACY_EMAIL_NOTIFICATIONS_ENABLED="false"');
    expect(envExample).toContain('LEGACY_EMAIL_AUTH_ENABLED="false"');
    expect(envExample).toContain('ADMIN_NOTIFICATION_EMAIL');
    expect(envExample).not.toContain('ADMIN_EMAIL=');
  });

  it('documents Prisma email and password as legacy/admin-only fields', () => {
    const schema = readRepoFile('prisma/schema.prisma');

    expect(schema).toContain('Legacy/admin-only nullable contact field');
    expect(schema).toContain('Legacy/admin-only nullable credential hash');
  });
});
