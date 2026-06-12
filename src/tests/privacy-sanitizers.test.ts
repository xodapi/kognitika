import { describe, expect, it } from 'vitest';
import { applyPrivacyRedaction } from '../server/middleware/privacy.ts';
import {
  sanitizeAdminUserIdentity,
  sanitizePublicUserIdentity,
} from '../server/utils/privacy.ts';

const rawSyntheticUser = {
  id: 'user_synthetic_123456789',
  name: 'Legacy Visible Name',
  pseudonym: 'Brain Synthetic',
  brainId: 'BR-SYNTHETIC-SECRET-001',
  email: 'synthetic@example.test',
  password: 'synthetic-password-hash',
  token: 'eyJ.synthetic.token',
};

describe('privacy serializers', () => {
  it('public identity output never includes email, password, tokens, or raw Brain ID', () => {
    const output = sanitizePublicUserIdentity(rawSyntheticUser);
    const serialized = JSON.stringify(output);

    expect(output).toEqual({
      name: 'Brain Synthetic',
      pseudonym: 'Brain Synthetic',
      brainLabel: 'Brain BR-SYNTH',
    });
    expect(serialized).not.toContain(rawSyntheticUser.email);
    expect(serialized).not.toContain(rawSyntheticUser.password);
    expect(serialized).not.toContain(rawSyntheticUser.token);
    expect(serialized).not.toContain(rawSyntheticUser.brainId);
  });

  it('admin identity output uses an id and short Brain label without legacy auth fields', () => {
    const output = sanitizeAdminUserIdentity(rawSyntheticUser);
    const serialized = JSON.stringify(output);

    expect(output).toEqual({
      id: 'user_synthetic_123456789',
      displayName: 'Brain Synthetic',
      name: 'Brain Synthetic',
      brainLabel: 'Brain BR-SYNTH',
      pseudonym: 'Brain Synthetic',
    });
    expect(serialized).not.toContain(rawSyntheticUser.email);
    expect(serialized).not.toContain(rawSyntheticUser.password);
    expect(serialized).not.toContain(rawSyntheticUser.token);
    expect(serialized).not.toContain(rawSyntheticUser.brainId);
  });

  it('redacts fingerprintable request fields after Brain auth is known', () => {
    const req: any = {
      user: { id: 'user_synthetic_123456789', identity: 'brain', brainId: 'BR-SYNTHETIC-SECRET-001' },
      ip: '203.0.113.10',
      headers: {
        'user-agent': 'Synthetic Browser',
        'accept-language': 'ru-RU',
        'x-forwarded-for': '203.0.113.10',
      },
      fingerprint: 'synthetic-fingerprint',
    };

    applyPrivacyRedaction(req);

    expect(req.ip).toBe('0.0.0.0');
    expect(req.headers['user-agent']).toBe('[REDACTED]');
    expect(req.headers['accept-language']).toBe('[REDACTED]');
    expect(req.headers['x-forwarded-for']).toBe('[REDACTED]');
    expect(req.fingerprint).toBeUndefined();
  });
});
