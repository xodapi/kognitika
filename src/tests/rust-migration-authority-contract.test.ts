import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type MigrationPhase = {
  id: string;
  ddlOwner: string;
  nodePrismaAuthorityOperational: boolean;
  rustComponents: Array<{
    name: string;
    databaseUrlAccess: 'forbidden' | 'not-applicable';
    ddlMigrations: 'forbidden' | 'not-applicable';
    writes: 'forbidden' | 'not-applicable';
  }>;
  rollback: { restoresNodePrismaAuthority: boolean };
};

type MigrationAuthorityPolicy = {
  version: number;
  currentPhase: string;
  productionSchema: { name: string; currentDdlOwner: string };
  ownershipTransfer: {
    requiredPullRequest: boolean;
    requiredReview: boolean;
    enablesConcurrentPrismaAndSqlxMigrations: boolean;
  };
  migrationEngines: {
    prisma: { mayModifyProductionSchema: boolean };
    sqlx: { mayModifyProductionSchema: boolean };
  };
  phases: MigrationPhase[];
  compatibilityMatrix: Array<{
    databaseState: 'fresh' | 'legacy-production-like' | 'fully-migrated';
    nodePrismaAuthorityOperational: boolean;
    rustReaderAccess: 'node-mediated-only';
    rollbackRestoresNodePrismaAuthority: boolean;
  }>;
  readerSchemaContract: {
    nullableFieldsDocumented: boolean;
    enumValuesVersioned: boolean;
    requiredIndexesDocumented: boolean;
    foreignKeysDocumented: boolean;
    idempotencyKeysDocumented: boolean;
    transactionBoundariesDocumented: boolean;
  };
  leastPrivilege: {
    rustComponentsReceiveDatabaseUrl: boolean;
    rustComponentsReceiveDatabaseCredentials: boolean;
    nodeMigrationPrincipal: {
      status: 'required-for-future-ownership-transfer';
      runtimeEnforcementVerified: boolean;
    };
    runtimeEnvironmentManifestValidation: {
      status: 'not-implemented';
      requiredBeforeRustServiceDeployment: boolean;
    };
  };
  observability: {
    permitsRawBrainId: boolean;
    permitsSecretsOrTokens: boolean;
    permitsRawPrivateTelemetry: boolean;
  };
};

const policyPath = resolve(process.cwd(), 'contracts/rust-postgresql-migration-authority.json');
const policy = JSON.parse(readFileSync(policyPath, 'utf8')) as MigrationAuthorityPolicy;

describe('Rust/PostgreSQL migration authority policy', () => {
  it('keeps Prisma as the sole current production DDL owner', () => {
    expect(policy.version).toBe(1);
    expect(policy.currentPhase).toBe('prisma-authority');
    expect(policy.productionSchema).toEqual({ name: 'public', currentDdlOwner: 'prisma' });
    expect(policy.migrationEngines.prisma.mayModifyProductionSchema).toBe(true);
    expect(policy.migrationEngines.sqlx.mayModifyProductionSchema).toBe(false);
  });

  it('requires a reviewed ownership-transfer PR and never permits concurrent engines', () => {
    expect(policy.ownershipTransfer).toMatchObject({
      requiredPullRequest: true,
      requiredReview: true,
      enablesConcurrentPrismaAndSqlxMigrations: false,
      notImplementedByThisPolicy: true,
    });

    for (const phase of policy.phases) {
      expect(phase.ddlOwner, phase.id).toBe('prisma');
    }
  });

  it('keeps Rust components read-only and disconnected from PostgreSQL credentials', () => {
    expect(policy.leastPrivilege.rustComponentsReceiveDatabaseUrl).toBe(false);
    expect(policy.leastPrivilege.rustComponentsReceiveDatabaseCredentials).toBe(false);
    expect(policy.leastPrivilege.nodeMigrationPrincipal).toEqual({
      status: 'required-for-future-ownership-transfer',
      runtimeEnforcementVerified: false,
    });
    expect(policy.leastPrivilege.runtimeEnvironmentManifestValidation).toEqual({
      status: 'not-implemented',
      requiredBeforeRustServiceDeployment: true,
    });

    for (const component of policy.phases.flatMap((phase) => phase.rustComponents)) {
      expect(component.databaseUrlAccess, component.name).toBe('forbidden');
      expect(component.ddlMigrations, component.name).toBe('forbidden');
      expect(component.writes, component.name).toBe('forbidden');
    }
  });

  it('defines fresh, legacy-like, and fully migrated compatibility with a Node-safe rollback', () => {
    expect(policy.compatibilityMatrix.map((entry) => entry.databaseState)).toEqual([
      'fresh',
      'legacy-production-like',
      'fully-migrated',
    ]);

    for (const entry of policy.compatibilityMatrix) {
      expect(entry.nodePrismaAuthorityOperational, entry.databaseState).toBe(true);
      expect(entry.rustReaderAccess, entry.databaseState).toBe('node-mediated-only');
      expect(entry.rollbackRestoresNodePrismaAuthority, entry.databaseState).toBe(true);
    }
    for (const phase of policy.phases) {
      expect(phase.nodePrismaAuthorityOperational, phase.id).toBe(true);
      expect(phase.rollback.restoresNodePrismaAuthority, phase.id).toBe(true);
    }
  });

  it('requires an explicit reader schema contract and privacy-safe observability', () => {
    expect(policy.readerSchemaContract).toEqual({
      nullableFieldsDocumented: true,
      enumValuesVersioned: true,
      requiredIndexesDocumented: true,
      foreignKeysDocumented: true,
      idempotencyKeysDocumented: true,
      transactionBoundariesDocumented: true,
    });
    expect(policy.observability).toEqual({
      permitsRawBrainId: false,
      permitsSecretsOrTokens: false,
      permitsRawPrivateTelemetry: false,
    });
  });
});
