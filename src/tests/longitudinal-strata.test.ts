import { describe, expect, it } from 'vitest';
import {
  resolveLongitudinalStratum,
  type LongitudinalStrataPolicy,
} from '../lib/longitudinal-strata.ts';

const policy: LongitudinalStrataPolicy = [
  {
    moduleId: 'schulte',
    moduleVersion: '2026.1',
    difficulties: { '5x5': 'grid-5', '7x7': 'grid-7' },
  },
  {
    moduleId: 'schulte',
    moduleVersion: '2026.2',
    difficulties: { '5x5': 'grid-5-recalibrated' },
  },
];

function job(events: readonly Record<string, unknown>[], moduleVersion = '2026.1') {
  return {
    moduleId: 'schulte',
    moduleVersion,
    events,
  };
}

const completed = { kind: 'session_completed' };

describe('longitudinal strata resolver', () => {
  it('places matching trial_started and trial_answered events in one explicit stratum', () => {
    expect(resolveLongitudinalStratum(job([
      { kind: 'trial_started', difficulty: '5x5' },
      { kind: 'trial_answered', difficulty: '5x5' },
      completed,
    ]), policy)).toEqual({
      eligible: true,
      reason: 'eligible',
      stratum: {
        moduleId: 'schulte',
        moduleVersion: '2026.1',
        difficulty: '5x5',
        label: 'grid-5',
      },
    });
  });

  it('keeps version changes in a separate explicitly mapped stratum', () => {
    const first = resolveLongitudinalStratum(job([
      { kind: 'trial_started', difficulty: '5x5' },
      completed,
    ]), policy);
    const changed = resolveLongitudinalStratum(job([
      { kind: 'trial_started', difficulty: '5x5' },
      completed,
    ], '2026.2'), policy);

    expect(first).toMatchObject({ eligible: true, stratum: { moduleVersion: '2026.1', label: 'grid-5' } });
    expect(changed).toMatchObject({ eligible: true, stratum: { moduleVersion: '2026.2', label: 'grid-5-recalibrated' } });
  });

  it.each([
    ['missing_difficulty', [{ kind: 'trial_started' }, completed]],
    ['mixed_difficulty', [{ kind: 'trial_started', difficulty: '5x5' }, { kind: 'trial_answered', difficulty: '7x7' }, completed]],
    ['unknown_difficulty', [{ kind: 'trial_started', difficulty: '9x9' }, completed]],
  ] as const)('excludes %s difficulty without coercion', (reason, events) => {
    expect(resolveLongitudinalStratum(job(events), policy)).toEqual({
      eligible: false,
      reason,
      stratum: null,
    });
  });

  it('excludes abandoned, incomplete, and malformed candidates without diagnostic claims', () => {
    expect(resolveLongitudinalStratum(job([
      { kind: 'trial_started', difficulty: '5x5' },
      { kind: 'session_abandoned' },
    ]), policy)).toEqual({ eligible: false, reason: 'abandoned', stratum: null });
    expect(resolveLongitudinalStratum(job([
      { kind: 'trial_started', difficulty: '5x5' },
    ]), policy)).toEqual({ eligible: false, reason: 'not_completed', stratum: null });
    expect(resolveLongitudinalStratum({ moduleId: 'schulte', events: [] }, policy))
      .toEqual({ eligible: false, reason: 'malformed', stratum: null });
  });

  it('returns identity-free outcomes even when a synthetic job carries private fields', () => {
    const result = resolveLongitudinalStratum({
      ...job([{ kind: 'trial_started', difficulty: '5x5' }, completed]),
      sessionId: 'synthetic-session-only-input',
      brainId: 'synthetic-private-input',
      email: 'synthetic@example.test',
    }, policy);

    expect(JSON.stringify(result)).not.toMatch(/session|brain|email|synthetic-private/i);
  });
});
