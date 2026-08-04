/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const transactionClient = vi.hoisted(() => ({
  gameAttempt: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
  gameSession: { findUnique: vi.fn(), create: vi.fn() },
  user: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  xpEvent: { create: vi.fn() },
  completedSessionAnalyticsJob: { create: vi.fn() },
  analyticsOutboxEntry: { create: vi.fn() },
}));

const prismaMock = vi.hoisted(() => ({
  gameSession: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('../lib/prisma.ts', () => ({ default: prismaMock }));

function completedAnalyticsJob(moduleId: string, suffix: string, trialType: string) {
  const sessionId = `browser-${suffix}`;
  const completedAt = '2026-08-04T00:00:01.000Z';
  return {
    schemaVersion: 1,
    jobId: `analytics-job-${suffix}`,
    analyzerVersion: 'analyze-session-v1',
    receivedAt: '2026-08-04T00:00:02.000Z',
    sessionId,
    moduleId,
    moduleVersion: '1',
    category: 'cognitive',
    startedAt: '2026-08-04T00:00:00.000Z',
    completedAt,
    events: [
      { schemaVersion: 1, eventId: `${sessionId}:0`, sessionId, moduleId, moduleVersion: '1', category: 'cognitive', sequence: 0, tMs: 0, kind: 'trial_started', trialType },
      { schemaVersion: 1, eventId: `${sessionId}:1`, sessionId, moduleId, moduleVersion: '1', category: 'cognitive', sequence: 1, tMs: 1_000, kind: 'session_completed', completedAt },
    ],
  };
}

describe('game save idempotency service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GAME_SAVE_LEGACY_COMPAT_ENABLED = 'true';
    process.env.ANALYTICS_OUTBOX_SHADOW_ENABLED = 'false';
    prismaMock.$transaction.mockImplementation((callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient));
    transactionClient.gameAttempt.findUnique.mockResolvedValue(null);
    transactionClient.gameAttempt.updateMany.mockResolvedValue({ count: 1 });
    transactionClient.gameAttempt.update.mockResolvedValue({});
    transactionClient.gameSession.findUnique.mockResolvedValue(null);
    transactionClient.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-a', experience: 100, level: 1, streakDays: 0, lastPlayedAt: null,
    });
    transactionClient.gameSession.create.mockResolvedValue({
      id: 'session-a', userId: 'user-a', clientRunId: '11111111-1111-4111-8111-111111111111', score: 21,
    });
    transactionClient.user.update.mockResolvedValue({
      id: 'user-a', experience: 121, level: 1, streakDays: 1, lastPlayedAt: new Date(),
    });
    transactionClient.xpEvent.create.mockResolvedValue({ id: 'xp-a' });
    transactionClient.completedSessionAnalyticsJob.create.mockResolvedValue({ id: 'analytics-job-row-a' });
    transactionClient.analyticsOutboxEntry.create.mockResolvedValue({ id: 'outbox-a' });
  });

  it('awards XP once and links it to the created session', async () => {
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    const result = await saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 5000,
      metadata: { size: 3 },
    });

    expect(result.isReplay).toBe(false);
    expect(transactionClient.user.update).toHaveBeenCalledOnce();
    expect(transactionClient.xpEvent.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-a',
        gameSessionId: 'session-a',
        amount: 21,
        reason: 'game:SCHULTE',
      },
    });
  });

  it('atomically creates a privacy-safe outbox job with a successful game save when enabled', async () => {
    process.env.ANALYTICS_OUTBOX_SHADOW_ENABLED = 'true';
    const { saveCompletedGame } = await import('../server/services/game-save.ts');

    const result = await saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 5000,
      metadata: { size: 3, nested: { rawBrainId: 'must-not-be-queued' } },
    });

    expect(result.isReplay).toBe(false);
    expect(transactionClient.analyticsOutboxEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceSessionId: 'session-a',
        analyzerVersion: 'rust-shadow-v1',
        contractVersion: 'analytics-contract-v1',
        idempotencyKey: 'session-a:rust-shadow-v1:analytics-contract-v1',
      }),
    });
    expect(JSON.stringify(transactionClient.analyticsOutboxEntry.create.mock.calls[0][0])).not.toMatch(/brainid|metadata|jwt|email|token/i);
  });

  it('binds a validated Schulte canonical job outside GameSession metadata', async () => {
    process.env.ANALYTICS_OUTBOX_SHADOW_ENABLED = 'true';
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    const analyticsJob = {
      schemaVersion: 1,
      jobId: 'analytics-job-synthetic-schulte',
      analyzerVersion: 'analyze-session-v1',
      receivedAt: '2026-08-04T00:00:02.000Z',
      sessionId: 'browser-session-synthetic',
      moduleId: 'schulte',
      moduleVersion: '1',
      category: 'cognitive',
      startedAt: '2026-08-04T00:00:00.000Z',
      completedAt: '2026-08-04T00:00:01.000Z',
      events: [
        { schemaVersion: 1, eventId: 'browser-session-synthetic:0', sessionId: 'browser-session-synthetic', moduleId: 'schulte', moduleVersion: '1', category: 'cognitive', sequence: 0, tMs: 0, kind: 'trial_started', trialType: 'schulte:cell' },
        { schemaVersion: 1, eventId: 'browser-session-synthetic:1', sessionId: 'browser-session-synthetic', moduleId: 'schulte', moduleVersion: '1', category: 'cognitive', sequence: 1, tMs: 1_000, kind: 'session_completed', completedAt: '2026-08-04T00:00:01.000Z' },
      ],
    };

    await saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 5000,
      metadata: { size: 3 },
      analyticsJob,
    });

    expect(transactionClient.gameSession.create.mock.calls[0][0]).not.toHaveProperty('analyticsJob');
    expect(JSON.stringify(transactionClient.gameSession.create.mock.calls[0][0])).not.toContain('browser-session-synthetic');
    expect(transactionClient.completedSessionAnalyticsJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        jobId: analyticsJob.jobId,
        gameSessionId: 'session-a',
        moduleId: 'schulte',
        payload: analyticsJob,
      }),
    });
    expect(transactionClient.analyticsOutboxEntry.create).toHaveBeenCalledOnce();
  });

  it('binds a validated Stroop canonical job to a Stroop game session', async () => {
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    const analyticsJob = {
      schemaVersion: 1,
      jobId: 'analytics-job-synthetic-stroop',
      analyzerVersion: 'analyze-session-v1',
      receivedAt: '2026-08-04T00:00:02.000Z',
      sessionId: 'browser-stroop-synthetic',
      moduleId: 'stroop',
      moduleVersion: '1',
      category: 'cognitive',
      startedAt: '2026-08-04T00:00:00.000Z',
      completedAt: '2026-08-04T00:00:01.000Z',
      events: [
        { schemaVersion: 1, eventId: 'browser-stroop-synthetic:0', sessionId: 'browser-stroop-synthetic', moduleId: 'stroop', moduleVersion: '1', category: 'cognitive', sequence: 0, tMs: 0, kind: 'trial_started', trialType: 'stroop:congruent' },
        { schemaVersion: 1, eventId: 'browser-stroop-synthetic:1', sessionId: 'browser-stroop-synthetic', moduleId: 'stroop', moduleVersion: '1', category: 'cognitive', sequence: 1, tMs: 1_000, kind: 'session_completed', completedAt: '2026-08-04T00:00:01.000Z' },
      ],
    };

    await saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'STROOP',
      timeMs: 5_000,
      analyticsJob,
    });

    expect(transactionClient.completedSessionAnalyticsJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ moduleId: 'stroop', jobId: analyticsJob.jobId }),
    });
  });

  it('binds a validated N-Back canonical job to an N_BACK game session', async () => {
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    const analyticsJob = {
      schemaVersion: 1,
      jobId: 'analytics-job-synthetic-nback',
      analyzerVersion: 'analyze-session-v1',
      receivedAt: '2026-08-04T00:00:02.000Z',
      sessionId: 'browser-nback-synthetic',
      moduleId: 'nback',
      moduleVersion: '1',
      category: 'cognitive',
      startedAt: '2026-08-04T00:00:00.000Z',
      completedAt: '2026-08-04T00:00:01.000Z',
      events: [
        { schemaVersion: 1, eventId: 'browser-nback-synthetic:0', sessionId: 'browser-nback-synthetic', moduleId: 'nback', moduleVersion: '1', category: 'cognitive', sequence: 0, tMs: 0, kind: 'checkpoint', checkpoint: 'session_started' },
        { schemaVersion: 1, eventId: 'browser-nback-synthetic:1', sessionId: 'browser-nback-synthetic', moduleId: 'nback', moduleVersion: '1', category: 'cognitive', sequence: 1, tMs: 1_000, kind: 'session_completed', completedAt: '2026-08-04T00:00:01.000Z' },
      ],
    };

    await saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'N_BACK',
      timeMs: 5_000,
      analyticsJob,
    });

    expect(transactionClient.completedSessionAnalyticsJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ moduleId: 'nback', jobId: analyticsJob.jobId }),
    });
  });

  it.each([
    ['numerical', 'NUMERICAL_ANALYSIS', 'numerical:question'],
    ['logical-sequence', 'LOGICAL_SEQUENCE', 'logical:matrix'],
    ['mental-math', 'MENTAL_MATH', 'mental-math:question'],
    ['situational', 'SITUATIONAL_JUDGMENT', 'situational:judgment'],
    ['spatial', 'SPATIAL_CONCEALMENT', 'spatial:recall'],
    ['stroop-alphabet', 'STROOP_ALPHABET', 'stroop-alphabet:color-action'],
    ['schulte-90', 'SCHULTE_90', 'schulte-90:cell-selection'],
    ['alphabet-table', 'ALPHABET_TABLE', 'alphabet-table:action-selection'],
    ['collision', 'COLLISION_DETECTOR', 'collision:filter'],
    ['dispatcher', 'ASYNC_DISPATCHER', 'dispatcher:stream-session'],
    ['topology', 'TOPOLOGY_MEMORY', 'topology:state-recall'],
  ])('binds a validated %s canonical job to %s', async (moduleId, gameType, trialType) => {
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    const analyticsJob = completedAnalyticsJob(moduleId, moduleId, trialType);

    await saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType,
      timeMs: 5_000,
      analyticsJob,
    });

    expect(transactionClient.completedSessionAnalyticsJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ moduleId, jobId: analyticsJob.jobId }),
    });
  });

  it.each([
    ['numerical', 'NUMERICAL_ANALYSIS', 'numerical:question'],
    ['logical-sequence', 'LOGICAL_SEQUENCE', 'logical:matrix'],
    ['mental-math', 'MENTAL_MATH', 'mental-math:question'],
    ['situational', 'SITUATIONAL_JUDGMENT', 'situational:judgment'],
    ['spatial', 'SPATIAL_CONCEALMENT', 'spatial:recall'],
    ['stroop-alphabet', 'STROOP_ALPHABET', 'stroop-alphabet:color-action'],
    ['schulte-90', 'SCHULTE_90', 'schulte-90:cell-selection'],
    ['alphabet-table', 'ALPHABET_TABLE', 'alphabet-table:action-selection'],
    ['collision', 'COLLISION_DETECTOR', 'collision:filter'],
    ['dispatcher', 'ASYNC_DISPATCHER', 'dispatcher:stream-session'],
    ['topology', 'TOPOLOGY_MEMORY', 'topology:state-recall'],
  ])('rejects %s canonical jobs for a different game type before starting a transaction', async (moduleId, gameType, trialType) => {
    const { saveCompletedGame } = await import('../server/services/game-save.ts');

    await expect(saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: gameType === 'SCHULTE' ? 'STROOP' : 'SCHULTE',
      timeMs: 5_000,
      analyticsJob: completedAnalyticsJob(moduleId, `${moduleId}-mismatch`, trialType),
    })).rejects.toMatchObject({ code: 'ANALYTICS_GAME_TYPE_MISMATCH' });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a canonical job for a different game type before starting a transaction', async () => {
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    await expect(saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 5000,
      analyticsJob: {
        schemaVersion: 1,
        jobId: 'analytics-job-synthetic-mismatch',
        analyzerVersion: 'analyze-session-v1',
        receivedAt: '2026-08-04T00:00:02.000Z',
        sessionId: 'browser-stroop-mismatch',
        moduleId: 'stroop',
        moduleVersion: '1',
        category: 'cognitive',
        startedAt: '2026-08-04T00:00:00.000Z',
        completedAt: '2026-08-04T00:00:01.000Z',
        events: [
          { schemaVersion: 1, eventId: 'browser-stroop-mismatch:0', sessionId: 'browser-stroop-mismatch', moduleId: 'stroop', moduleVersion: '1', category: 'cognitive', sequence: 0, tMs: 0, kind: 'trial_started', trialType: 'stroop:congruent' },
          { schemaVersion: 1, eventId: 'browser-stroop-mismatch:1', sessionId: 'browser-stroop-mismatch', moduleId: 'stroop', moduleVersion: '1', category: 'cognitive', sequence: 1, tMs: 1_000, kind: 'session_completed', completedAt: '2026-08-04T00:00:01.000Z' },
        ],
      },
    })).rejects.toMatchObject({ code: 'ANALYTICS_GAME_TYPE_MISMATCH' });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a sensitive canonical job before starting a transaction', async () => {
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    await expect(saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 5000,
      analyticsJob: { brainId: 'synthetic-brain-id' },
    })).rejects.toMatchObject({ code: 'INVALID_ANALYTICS_JOB' });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('returns the existing session without another XP award', async () => {
    transactionClient.gameSession.findUnique.mockResolvedValue({
      id: 'session-a', userId: 'user-a', clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE', timeMs: 5000, score: 21,
    });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    const result = await saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 5000,
    });

    expect(result.isReplay).toBe(true);
    expect(result.session.id).toBe('session-a');
    expect(transactionClient.gameSession.create).not.toHaveBeenCalled();
    expect(transactionClient.user.update).not.toHaveBeenCalled();
    expect(transactionClient.xpEvent.create).not.toHaveBeenCalled();
  });

  it('rejects a reused clientRunId with conflicting performance data', async () => {
    transactionClient.gameSession.findUnique.mockResolvedValue({
      id: 'session-a', userId: 'user-a', clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE', timeMs: 5000, score: 21,
    });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');

    await expect(saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 6000,
    })).rejects.toMatchObject({ code: 'ATTEMPT_REPLAY_CONFLICT' });
    expect(transactionClient.xpEvent.create).not.toHaveBeenCalled();
  });

  it('consumes a valid challenge once and links the attempt to the session', async () => {
    const { digestGameChallenge } = await import('../server/services/game-attempt.ts');
    const challenge = 'synthetic-secret-challenge';
    transactionClient.gameAttempt.findUnique.mockResolvedValue({
      id: 'attempt-a', userId: 'user-a', gameType: 'SCHULTE',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      challengeDigest: digestGameChallenge(challenge),
      notBefore: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 60000),
      consumedAt: null, gameSessionId: null,
    });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');

    const result = await saveCompletedGame({
      userId: 'user-a', attemptId: 'attempt-a', challenge,
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE', timeMs: 5000,
    });

    expect(result.isReplay).toBe(false);
    expect(transactionClient.gameAttempt.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'attempt-a', userId: 'user-a', consumedAt: null }),
    }));
    expect(transactionClient.gameAttempt.update).toHaveBeenCalledWith({
      where: { id: 'attempt-a' }, data: { gameSessionId: 'session-a' },
    });
    expect(transactionClient.xpEvent.create).toHaveBeenCalledOnce();
  });

  it.each([
    ['wrong owner', { userId: 'user-b' }, 'expected', 'INVALID_ATTEMPT_CREDENTIALS'],
    ['wrong challenge', {}, 'wrong', 'INVALID_ATTEMPT_CREDENTIALS'],
    ['wrong type', { gameType: 'STROOP' }, 'expected', 'ATTEMPT_CONTRACT_MISMATCH'],
    ['wrong run', { clientRunId: '22222222-2222-4222-8222-222222222222' }, 'expected', 'ATTEMPT_CONTRACT_MISMATCH'],
  ])('rejects %s without awarding XP', async (_label, attemptPatch, suppliedChallenge, code) => {
    const { digestGameChallenge } = await import('../server/services/game-attempt.ts');
    transactionClient.gameAttempt.findUnique.mockResolvedValue({
      id: 'attempt-a', userId: 'user-a', gameType: 'SCHULTE',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      challengeDigest: digestGameChallenge('expected'),
      notBefore: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 60000),
      consumedAt: null, gameSessionId: null, ...attemptPatch,
    });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    await expect(saveCompletedGame({
      userId: 'user-a', attemptId: 'attempt-a', challenge: suppliedChallenge,
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE', timeMs: 5000,
    })).rejects.toMatchObject({ code });
    expect(transactionClient.xpEvent.create).not.toHaveBeenCalled();
  });

  it.each([
    ['not ready', new Date(Date.now() + 60000), new Date(Date.now() + 120000), 'ATTEMPT_NOT_READY'],
    ['expired', new Date(Date.now() - 120000), new Date(Date.now() - 60000), 'ATTEMPT_EXPIRED'],
  ])('rejects a %s attempt', async (_label, notBefore, expiresAt, code) => {
    const { digestGameChallenge } = await import('../server/services/game-attempt.ts');
    transactionClient.gameAttempt.findUnique.mockResolvedValue({
      id: 'attempt-a', userId: 'user-a', gameType: 'SCHULTE',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      challengeDigest: digestGameChallenge('expected'), notBefore, expiresAt,
      consumedAt: null, gameSessionId: null,
    });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    await expect(saveCompletedGame({
      userId: 'user-a', attemptId: 'attempt-a', challenge: 'expected',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE', timeMs: 5000,
    })).rejects.toMatchObject({ code });
  });

  it('returns a matching consumed attempt idempotently without duplicate XP', async () => {
    const { digestGameChallenge } = await import('../server/services/game-attempt.ts');
    transactionClient.gameAttempt.findUnique.mockResolvedValue({
      id: 'attempt-a', userId: 'user-a', gameType: 'SCHULTE',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      challengeDigest: digestGameChallenge('expected'),
      notBefore: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 60000),
      consumedAt: new Date(), gameSessionId: 'session-a',
    });
    transactionClient.gameSession.findUnique.mockResolvedValue({
      id: 'session-a', userId: 'user-a', clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE', timeMs: 5000, score: 21,
    });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    const result = await saveCompletedGame({
      userId: 'user-a', attemptId: 'attempt-a', challenge: 'expected',
      clientRunId: '11111111-1111-4111-8111-111111111111', gameType: 'SCHULTE', timeMs: 5000,
    });
    expect(result.isReplay).toBe(true);
    expect(transactionClient.user.update).not.toHaveBeenCalled();
    expect(transactionClient.xpEvent.create).not.toHaveBeenCalled();
  });

  it('rejects a conflicting consumed attempt replay', async () => {
    const { digestGameChallenge } = await import('../server/services/game-attempt.ts');
    transactionClient.gameAttempt.findUnique.mockResolvedValue({
      id: 'attempt-a', userId: 'user-a', gameType: 'SCHULTE',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      challengeDigest: digestGameChallenge('expected'),
      notBefore: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 60000),
      consumedAt: new Date(), gameSessionId: 'session-a',
    });
    transactionClient.gameSession.findUnique.mockResolvedValue({
      id: 'session-a', userId: 'user-a', clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE', timeMs: 6000, score: 17,
    });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    await expect(saveCompletedGame({
      userId: 'user-a', attemptId: 'attempt-a', challenge: 'expected',
      clientRunId: '11111111-1111-4111-8111-111111111111', gameType: 'SCHULTE', timeMs: 5000,
    })).rejects.toMatchObject({ code: 'ATTEMPT_REPLAY_CONFLICT' });
  });

  it('requires an attempt when legacy compatibility is disabled', async () => {
    process.env.GAME_SAVE_LEGACY_COMPAT_ENABLED = 'false';
    const { saveCompletedGame } = await import('../server/services/game-save.ts');
    await expect(saveCompletedGame({
      userId: 'user-a', clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE', timeMs: 5000,
    })).rejects.toMatchObject({ code: 'ATTEMPT_REQUIRED' });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('keeps the level update inside the award transaction', async () => {
    transactionClient.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-a', experience: 490, level: 1, streakDays: 0, lastPlayedAt: null,
    });
    transactionClient.user.update
      .mockResolvedValueOnce({ id: 'user-a', experience: 511, level: 1, streakDays: 1 })
      .mockResolvedValueOnce({ id: 'user-a', experience: 511, level: 2, streakDays: 1 });
    const { saveCompletedGame } = await import('../server/services/game-save.ts');

    await saveCompletedGame({
      userId: 'user-a',
      clientRunId: '11111111-1111-4111-8111-111111111111',
      gameType: 'SCHULTE',
      timeMs: 5000,
    });

    expect(transactionClient.user.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'user-a' },
      data: { level: 2 },
    });
  });
});
