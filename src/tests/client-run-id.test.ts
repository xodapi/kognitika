import { describe, expect, it } from 'vitest';
import { createClientRunId } from '../lib/client-run-id';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('createClientRunId', () => {
  it('creates distinct UUID v4 identifiers', () => {
    const first = createClientRunId();
    const second = createClientRunId();

    expect(first).toMatch(UUID_V4_PATTERN);
    expect(second).toMatch(UUID_V4_PATTERN);
    expect(second).not.toBe(first);
  });
});
