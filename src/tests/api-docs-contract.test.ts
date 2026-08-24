import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

describe('API and environment documentation contract', () => {
  it('documents the mounted public and authenticated API surfaces', () => {
    const docs = read('docs/api-reference.md');

    for (const endpoint of [
      'GET` | `/api/health',
      'POST` | `/api/auth/brain',
      'POST` | `/api/game/attempts',
      'POST` | `/api/game/save',
      'GET` | `/api/me',
      'GET` | `/api/analytics/cognitive-trend',
      'POST` | `/api/analytics/practice-flow',
      'GET /api/admin/analytics-outbox',
    ]) {
      expect(docs).toContain(endpoint);
    }
  });

  it('keeps documented local URL variables available in the example environment', () => {
    const envExample = read('.env.example');
    for (const variable of ['APP_URL=', 'FRONTEND_URL=', 'CORS_ALLOW_NATIVE_APP=', 'DEBUG_LOGS=', 'VITE_DEBUG_LOGS=']) {
      expect(envExample).toContain(variable);
    }
  });
});
