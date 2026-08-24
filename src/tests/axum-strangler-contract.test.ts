import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AnalyzeSessionInputSchema,
  AnalyzeSessionOutputSchema,
  analyzeSession,
  parseAnalyzeSessionInput,
  type AnalyzeSessionInput,
} from '../core/analyze-session/session-analysis';

const root = resolve(import.meta.dirname, '../..');
const rustSource = readFileSync(resolve(root, 'crates/kognitika-core/src/lib.rs'), 'utf8');
const rustManifest = readFileSync(resolve(root, 'crates/kognitika-core/Cargo.toml'), 'utf8');
const contract = readFileSync(resolve(root, 'docs/axum-strangler-contract.md'), 'utf8');
const expressSource = readFileSync(
  resolve(root, 'src/core/analyze-session/session-analysis.ts'),
  'utf8',
);

const syntheticInput: AnalyzeSessionInput = {
  schemaVersion: 1,
  sessionId: 'synthetic-axum-contract',
  moduleId: 'schulte',
  category: 'cognitive',
  startedAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T00:00:01.000Z',
  events: [
    {
      tMs: 1000,
      kind: 'click',
      reactionTimeMs: 250,
      isCorrect: true,
      x: 0.25,
      y: 0.75,
    },
  ],
};

describe('Axum strangler contract', () => {
  it('keeps the pilot explicitly proposed and health-only', () => {
    expect(contract).toContain('**Status:** proposed');
    expect(contract).toContain('The sole pilot candidate is deliberately narrow: `GET /api/health`.');
    expect(contract).toMatch(
      /No Axum listener,\s+router, proxy rule, database client, or production traffic switch is introduced/,
    );
    expect(contract).toContain('health response remains exactly');
    expect(contract).not.toContain('production cutover is authorized');
  });

  it('keeps Express and Rust on the same v1 JSON naming and field contract', () => {
    const parsed = AnalyzeSessionInputSchema.safeParse(syntheticInput);
    expect(parsed.success).toBe(true);

    const output = analyzeSession(syntheticInput);
    expect(AnalyzeSessionOutputSchema.safeParse(output).success).toBe(true);
    expect(Object.keys(output)).toEqual([
      'schemaVersion',
      'durationMs',
      'clickCount',
      'p50ReactionMs',
      'p95ReactionMs',
      'speedSlope',
      'accuracy',
      'fatigueIndex',
      'engagementIndex',
      'suspiciousPatternScore',
      'recommendationSignals',
    ]);

    expect(rustSource).toContain('#[serde(rename_all = "camelCase", deny_unknown_fields)]');
    expect(rustSource).toContain('pub schema_version: u8');
    expect(rustSource).toContain('if input.schema_version != 1');
    expect(rustSource).toContain('pub recommendation_signals: Vec<RecommendationSignal>');
    expect(expressSource).toContain('schemaVersion: z.literal(1)');
    expect(expressSource).toContain('}).strict()');
    expect(contract).toContain('input and output `schemaVersion` are the numeric literal `1`');
  });

  it('keeps privacy denylist and non-identity fields aligned', () => {
    const denylistedKeys = [
      'authorization',
      'auth',
      'bearer',
      'brainid',
      'cookie',
      'email',
      'jwt',
      'localstorage',
      'password',
      'rawstorage',
      'refresh',
      'screenshot',
      'secret',
      'token',
    ];

    for (const key of denylistedKeys) {
      expect(rustSource).toContain(`"${key}"`);
      expect(expressSource).toContain(key);
    }

    expect(rustSource).toContain('|| normalized == "user"');
    expect(expressSource).toMatch(/\|user\)\/i/);
    expect(parseAnalyzeSessionInput({ ...syntheticInput, metadata: { token: 'synthetic' } }).success)
      .toBe(false);
    expect(contract).toContain('No Brain ID, token, raw IP, request body, or private telemetry');
  });

  it('documents stable adapter error mapping instead of exposing Rust debug output', () => {
    expect(rustSource).toContain('SensitiveField');
    expect(rustSource).toContain('InvalidSchema(String)');
    expect(contract).toContain('| `SensitiveField` | 400 | `sensitive_field` |');
    expect(contract).toContain('| `InvalidSchema(_)` | 400 | `invalid_schema` |');
    expect(contract).toContain('must not expose Rust `Debug` output');
  });

  it('does not turn the current core crate into an Axum runtime dependency', () => {
    expect(rustManifest).not.toMatch(/^\s*axum\s*=/m);
    expect(rustManifest).not.toMatch(/sqlx|diesel|tokio-postgres|prisma/i);
  });
});
