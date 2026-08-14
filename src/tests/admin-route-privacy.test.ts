/**
 * @vitest-environment node
 */
import express, { type Router } from 'express';
import { createServer, type Server as HttpServer } from 'http';
import type { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPracticeFlowEventsForTests,
  recordPracticeFlowEvent,
} from '../server/services/practice-flow-store';
import {
  resetGameRepositories,
  setAdminAuthorizationRepository,
  setAdminRepository,
} from '../server/infrastructure/container.ts';
import type { AdminRepository } from '../server/repositories/admin-repository.ts';
import type { AdminAuthorizationRepository } from '../server/repositories/admin-authorization-repository.ts';
import {
  clearAnalyticsOutboxOperationalSnapshotForTests,
  recordAnalyticsOutboxOperationalSnapshot,
} from '../server/services/analytics-outbox-observability.ts';

const preflightRustAnalyticsCanary = vi.hoisted(() => vi.fn());
vi.mock('../server/config/rust-analytics-canary.ts', () => ({ preflightRustAnalyticsCanary }));

const JWT_SECRET = 'synthetic-admin-route-secret';

let adminRoutes: Router;
const servers: HttpServer[] = [];

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  const module = await import('../server/routes/admin.ts');
  adminRoutes = module.default;
});

beforeEach(() => {
  vi.clearAllMocks();
  preflightRustAnalyticsCanary.mockReturnValue({ ready: false, reason: 'outbox_disabled' });
  setAdminRepository({
    findUsers,
    getStats,
    findFeedback,
    respondToFeedback,
    updateIdeaStatus,
  });
  setAdminAuthorizationRepository({ findRole });
  clearPracticeFlowEventsForTests();
  clearAnalyticsOutboxOperationalSnapshotForTests();
});

afterEach(async () => {
  resetGameRepositories();
  await Promise.all(servers.splice(0).map((server) => (
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    })
  )));
});

const findUsers = vi.fn<AdminRepository['findUsers']>();
const getStats = vi.fn<AdminRepository['getStats']>();
const findFeedback = vi.fn<AdminRepository['findFeedback']>();
const respondToFeedback = vi.fn<AdminRepository['respondToFeedback']>();
const updateIdeaStatus = vi.fn<AdminRepository['updateIdeaStatus']>();
const findRole = vi.fn<AdminAuthorizationRepository['findRole']>();

async function createAdminHarness() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  servers.push(server);

  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

function adminToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, JWT_SECRET);
}

async function getJson(baseUrl: string, path: string, token: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

async function postJson(baseUrl: string, path: string, token: string, body: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    body: await response.json(),
  };
}

describe('admin route privacy and authorization contract', () => {
  it('does not trust stale or forged ADMIN role from a signed JWT', async () => {
    findRole.mockResolvedValue('USER');
    const baseUrl = await createAdminHarness();
    const token = adminToken({ id: 'user_synthetic_regular', role: 'ADMIN' });

    const response = await getJson(baseUrl, '/api/admin/users', token);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Access denied' });
    expect(findRole).toHaveBeenCalledWith('user_synthetic_regular');
    expect(findUsers).not.toHaveBeenCalled();
  });

  it('filters sensitive identity fields from /api/admin/users responses', async () => {
    findRole.mockResolvedValue('ADMIN');
    findUsers.mockResolvedValue([
      {
        id: 'user_synthetic_admin_view',
        name: 'Legacy Admin Visible',
        pseudonym: 'Brain Synthetic',
        brainId: 'BR-SYNTHETIC-SECRET-001',
        email: 'synthetic@example.test',
        password: 'synthetic-password-hash',
        token: 'synthetic-token',
        level: 4,
        experience: 120,
        rating: 1020,
        streakDays: 3,
        role: 'USER',
        createdAt: '2026-01-01T00:00:00.000Z',
        sessions: [],
      },
    ]);

    const baseUrl = await createAdminHarness();
    const token = adminToken({ id: 'user_synthetic_admin', role: 'ADMIN' });

    const response = await getJson(baseUrl, '/api/admin/users', token);
    const serialized = JSON.stringify(response.body);

    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({
      id: 'user_synthetic_admin_view',
      displayName: 'Brain Synthetic',
      brainLabel: 'Brain BR-SYNTH',
      pseudonym: 'Brain Synthetic',
      level: 4,
      rating: 1020,
    });
    expect(serialized).not.toContain('synthetic@example.test');
    expect(serialized).not.toContain('synthetic-password-hash');
    expect(serialized).not.toContain('synthetic-token');
    expect(serialized).not.toContain('BR-SYNTHETIC-SECRET-001');
  });

  it('filters sensitive identity fields from /api/admin/feedback responses', async () => {
    findRole.mockResolvedValue('ADMIN');
    findFeedback.mockResolvedValue([
      {
        id: 'feedback_synthetic_1',
        type: 'idea',
        content: 'Synthetic feedback only.',
        adminResponse: null,
        status: 'new',
        trackingNum: 'FB-SYNTH',
        createdAt: '2026-01-01T00:00:00.000Z',
        user: {
          id: 'user_synthetic_feedback',
          name: 'Legacy Feedback Visible',
          pseudonym: 'Brain Feedback',
          brainId: 'BR-SYNTHETIC-FEEDBACK-SECRET',
          email: 'feedback@example.test',
          password: 'synthetic-password-hash',
          token: 'synthetic-token',
        },
      },
    ]);

    const baseUrl = await createAdminHarness();
    const token = adminToken({ id: 'user_synthetic_admin', role: 'ADMIN' });

    const response = await getJson(baseUrl, '/api/admin/feedback', token);
    const serialized = JSON.stringify(response.body);

    expect(response.status).toBe(200);
    expect(response.body[0].user).toEqual({
      name: 'Brain Feedback',
      pseudonym: 'Brain Feedback',
      brainLabel: 'Brain BR-SYNTH',
    });
    expect(serialized).not.toContain('feedback@example.test');
    expect(serialized).not.toContain('synthetic-password-hash');
    expect(serialized).not.toContain('synthetic-token');
    expect(serialized).not.toContain('BR-SYNTHETIC-FEEDBACK-SECRET');
  });

  it('exposes privacy-safe practice flow summary to admins', async () => {
    findRole.mockResolvedValue('ADMIN');
    recordPracticeFlowEvent({
      event: 'PracticeStarted',
      category: 'cognitive',
      moduleId: 'typing',
      route: '/typing',
      buildId: 'test-build',
      storageSchemaVersion: '1',
      anonymousSessionId: 'anon-synthetic-admin-summary',
      timestamp: '2026-01-01T00:00:00.000Z',
      checkpoint: 'route_loaded',
    });
    recordPracticeFlowEvent({
      event: 'PracticeAbandoned',
      category: 'cognitive',
      moduleId: 'typing',
      route: '/typing',
      buildId: 'test-build',
      storageSchemaVersion: '1',
      anonymousSessionId: 'anon-synthetic-admin-summary',
      timestamp: '2026-01-01T00:00:05.000Z',
      lastCheckpoint: 'route_loaded',
      reason: 'route_change',
      durationMs: 5_000,
    });

    const baseUrl = await createAdminHarness();
    const token = adminToken({ id: 'user_synthetic_admin', role: 'ADMIN' });

    const response = await getJson(baseUrl, '/api/admin/practice-flow', token);
    const serialized = JSON.stringify(response.body);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      totalEvents: 2,
      dropOffByModuleAndCheckpoint: [
        { moduleId: 'typing', checkpoint: 'route_loaded', abandoned: 1 },
      ],
    });
    expect(serialized).not.toContain('synthetic@example.test');
    expect(serialized).not.toContain('BR-SYNTHETIC');
    expect(serialized).not.toContain('synthetic-token');
  });

  it('exposes aggregate-only analytics outbox metrics to admins', async () => {
    findRole.mockResolvedValue('ADMIN');
    recordAnalyticsOutboxOperationalSnapshot({
      updatedAt: new Date(Date.now() - 30_001).toISOString(),
      worker: { recovered: 2, dispatched: 3, purged: 0 },
      outbox: {
        pending: 1,
        processing: 0,
        retry: 1,
        completed: 12,
        dead: 0,
        oldestLagMs: 250,
        failures: 0,
      },
      sidecar: {
        requests: 5,
        matched: 5,
        mismatched: 0,
        failures: {
          sidecar_timeout: 0,
          sidecar_unavailable: 0,
          sidecar_rejected: 0,
          sidecar_invalid_response: 0,
        },
      },
    });
    const baseUrl = await createAdminHarness();
    const token = adminToken({ id: 'user_synthetic_admin', role: 'ADMIN' });

    const response = await getJson(baseUrl, '/api/admin/analytics-outbox', token);
    const serialized = JSON.stringify(response.body);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      schemaVersion: 1,
      worker: { recovered: 2, dispatched: 3, purged: 0 },
      outbox: { pending: 1, dead: 0, oldestLagMs: 250 },
      sidecar: { requests: 5, matched: 5 },
      canary: { eligible: false, reason: 'insufficient_samples' },
      freshness: { status: 'stale' },
      rolloutConfiguration: { ready: false, reason: 'outbox_disabled' },
    });
    expect(serialized).not.toMatch(/session|job|brainid|email|token|payload/i);
  });

  it('reports an expired analytics outbox snapshot as unavailable', async () => {
    findRole.mockResolvedValue('ADMIN');
    recordAnalyticsOutboxOperationalSnapshot({
      updatedAt: new Date(Date.now() - (5 * 60_000) - 1).toISOString(),
      worker: { recovered: 0, dispatched: 0, purged: 0 },
      outbox: {
        pending: 0,
        processing: 0,
        retry: 0,
        completed: 0,
        dead: 0,
        oldestLagMs: 0,
        failures: 0,
      },
      sidecar: null,
    });
    const baseUrl = await createAdminHarness();
    const token = adminToken({ id: 'user_synthetic_admin', role: 'ADMIN' });

    const response = await getJson(baseUrl, '/api/admin/analytics-outbox', token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      schemaVersion: 1,
      status: 'unavailable',
      rolloutConfiguration: { ready: false, reason: 'outbox_disabled' },
    });
  });

  it('validates and sanitizes /api/admin/feedback/:id/response', async () => {
    findRole.mockResolvedValue('ADMIN');
    respondToFeedback.mockResolvedValue({
      id: 'feedback_synthetic_1',
      type: 'bug',
      content: 'Synthetic feedback only.',
      adminResponse: 'Synthetic admin response.',
      status: 'replied',
      trackingNum: 'FB-SYNTH',
      createdAt: '2026-01-01T00:00:00.000Z',
      userId: 'user_synthetic_feedback',
      user: {
        id: 'user_synthetic_feedback',
        name: 'Legacy Feedback Visible',
        pseudonym: 'Brain Feedback',
        brainId: 'BR-SYNTHETIC-FEEDBACK-SECRET',
        email: 'feedback@example.test',
        token: 'synthetic-token',
      },
    });

    const baseUrl = await createAdminHarness();
    const token = adminToken({ id: 'user_synthetic_admin', role: 'ADMIN' });

    const invalid = await postJson(baseUrl, '/api/admin/feedback/feedback_synthetic_1/response', token, {
      response: '',
    });
    expect(invalid.status).toBe(400);
    expect(respondToFeedback).not.toHaveBeenCalled();

    const response = await postJson(baseUrl, '/api/admin/feedback/feedback_synthetic_1/response', token, {
      response: '  Synthetic admin response.  ',
    });
    const serialized = JSON.stringify(response.body);

    expect(response.status).toBe(200);
    expect(respondToFeedback).toHaveBeenCalledWith(
      'feedback_synthetic_1',
      'Synthetic admin response.',
    );
    expect(response.body.feedback).toMatchObject({
      id: 'feedback_synthetic_1',
      text: 'Synthetic feedback only.',
      adminResponse: 'Synthetic admin response.',
      status: 'replied',
      trackingNum: 'FB-SYNTH',
      user: {
        name: 'Brain Feedback',
        pseudonym: 'Brain Feedback',
        brainLabel: 'Brain BR-SYNTH',
      },
    });
    expect(serialized).not.toContain('feedback@example.test');
    expect(serialized).not.toContain('synthetic-token');
    expect(serialized).not.toContain('BR-SYNTHETIC-FEEDBACK-SECRET');
    expect(serialized).not.toContain('user_synthetic_feedback');
  });

  it('validates and normalizes /api/admin/ideas/:id/status', async () => {
    findRole.mockResolvedValue('ADMIN');
    updateIdeaStatus.mockResolvedValue({
      id: 'idea_synthetic_status',
      title: 'Synthetic idea',
      description: 'Synthetic idea description.',
      status: 'IN_PROGRESS',
    });

    const baseUrl = await createAdminHarness();
    const token = adminToken({ id: 'user_synthetic_admin', role: 'ADMIN' });

    const invalid = await postJson(baseUrl, '/api/admin/ideas/idea_synthetic_status/status', token, {
      status: 'maybe',
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({ error: 'Invalid idea status' });
    expect(updateIdeaStatus).not.toHaveBeenCalled();

    const response = await postJson(baseUrl, '/api/admin/ideas/idea_synthetic_status/status', token, {
      status: 'in progress',
    });

    expect(response.status).toBe(200);
    expect(updateIdeaStatus).toHaveBeenCalledWith('idea_synthetic_status', 'IN_PROGRESS');
    expect(response.body).toMatchObject({
      id: 'idea_synthetic_status',
      status: 'IN_PROGRESS',
    });
  });
});
