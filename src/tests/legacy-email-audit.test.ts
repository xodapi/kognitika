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

describe('Brain ID-only identity audit', () => {
  it('keeps public auth UI Brain ID-only', () => {
    const authModal = readRepoFile('src/components/AuthModal.tsx');
    const publicComponentSources = collectFiles('src/components', ['.tsx']).map((file) => readFileSync(file, 'utf8'));

    expect(authModal).not.toMatch(/type=["']email["']/);
    expect(authModal).not.toMatch(/type=["']password["']/);
    for (const source of publicComponentSources) {
      expect(source).not.toContain('/api/auth/login');
      expect(source).not.toContain('/api/auth/register');
      expect(source).not.toContain('/api/auth/magic-link');
    }
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

  it('removes SMTP and legacy email identity from runtime configuration', () => {
    const runtimeSources = [
      readRepoFile('server.ts'),
      readRepoFile('src/lib/subscribers.ts'),
      readRepoFile('src/server/routes/auth.ts'),
      readRepoFile('.env.example'),
      readRepoFile('package.json'),
    ];

    for (const source of runtimeSources) {
      expect(source).not.toMatch(/SMTP_|LEGACY_EMAIL|ADMIN_NOTIFICATION_EMAIL|nodemailer/i);
    }
  });

  it('removes email and password columns from the User model', () => {
    const schema = readRepoFile('prisma/schema.prisma');
    const userModel = schema.match(/model User \{([\s\S]*?)\n\}/)?.[1] || '';

    expect(userModel).not.toMatch(/^\s*email\s/m);
    expect(userModel).not.toMatch(/^\s*password\s/m);
  });

  it('keeps admin authorization role-based instead of email-based', () => {
    const authMiddleware = readRepoFile('src/server/middleware/auth.ts');
    const authorizationRepository = readRepoFile(
      'src/server/infrastructure/prisma/prisma-admin-authorization-repository.ts',
    );

    expect(authMiddleware).toContain('getAdminAuthorizationRepository');
    expect(authorizationRepository).toContain("select: { role: true }");
    expect(authMiddleware).not.toContain('ADMIN_EMAIL');
    expect(authMiddleware).not.toMatch(/email/i);
  });
});
