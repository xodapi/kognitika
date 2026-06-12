/**
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Firebase feedback privacy contract', () => {
  it('does not require or describe email in the feedback blueprint', () => {
    const blueprint = JSON.parse(readFileSync(new URL('../../firebase-blueprint.json', import.meta.url), 'utf8'));
    const feedback = blueprint.entities.Feedback;

    expect(feedback.properties).not.toHaveProperty('email');
    expect(feedback.properties).toHaveProperty('brainLabel');
    expect(feedback.required).toEqual([
      'userId',
      'userName',
      'brainLabel',
      'content',
      'type',
      'createdAt',
      'status',
    ]);
  });

  it('validates feedback documents without a user email field', () => {
    const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8');

    expect(rules).toContain("['userId', 'userName', 'brainLabel', 'content', 'type', 'createdAt', 'status']");
    expect(rules).toContain('data.brainLabel is string');
    expect(rules).not.toMatch(/data\.email/);
    expect(rules).not.toContain("'email'");
    expect(rules).not.toContain('"email"');
  });
});
