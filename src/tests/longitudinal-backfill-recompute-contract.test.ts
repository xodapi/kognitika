import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type BackfillRecomputeContract = {
  schemaVersion: number;
  contractId: string;
  status: string;
  ownership: {
    productionDdlOwner: string;
    writer: string;
    rustDatabaseAccess: string;
  };
  privacy: {
    permitsRawIdentity: boolean;
    permitsRawPrivateTelemetry: boolean;
  };
  protectedInternalBoundaries: {
    publicWriteApi: string;
    sourceMutation: string;
    directDatabaseWritesOutsideNodePrisma: string;
    rustDatabaseAccess: string;
    outboxPurge: string;
  };
  recompute: {
    mode: string;
    createsNewProjectionVersion: boolean;
    historicalProjections: string;
    activation: string;
    rollback: {
      method: string;
      deletesProjectionRows: boolean;
      rewritesHistoricalProjectionRows: boolean;
    };
  };
  idempotency: {
    requestKey: { unique: boolean; retry: string };
    lease: { required: boolean; singleActiveHolderPerRequestKey: boolean };
    publish: { atomic: boolean; requiresCompletedProjectionBeforeActivation: boolean };
  };
  retention: {
    projectionVersionRetention: string;
    deletionException: string;
    privacyDeletion: {
      mayRemoveAffectedProjectionData: boolean;
      mayOverrideAppendOnlyRetention: boolean;
      requiresAuditableTombstoneWithoutRawIdentity: boolean;
    };
  };
  preconditions: string[];
  nonGoals: string[];
};

const contractPath = resolve(
  process.cwd(),
  'contracts/longitudinal-backfill-recompute-v1.json',
);
const contract = JSON.parse(
  readFileSync(contractPath, 'utf8'),
) as BackfillRecomputeContract;

describe('longitudinal backfill and recompute contract', () => {
  it('keeps DDL and writes in the Node/Prisma boundary', () => {
    expect(contract.schemaVersion).toBe(1);
    expect(contract.contractId).toBe('longitudinal-backfill-recompute-v1');
    expect(contract.status).toBe('documentation-contract-only');
    expect(contract.ownership).toEqual({
      productionDdlOwner: 'prisma',
      writer: 'node-prisma',
      rustDatabaseAccess: 'forbidden',
    });
    expect(contract.protectedInternalBoundaries).toMatchObject({
      publicWriteApi: 'forbidden',
      sourceMutation: 'forbidden',
      directDatabaseWritesOutsideNodePrisma: 'forbidden',
      rustDatabaseAccess: 'forbidden',
      outboxPurge: 'excluded',
    });
  });

  it('excludes raw identity and private telemetry', () => {
    expect(contract.privacy.permitsRawIdentity).toBe(false);
    expect(contract.privacy.permitsRawPrivateTelemetry).toBe(false);
  });

  it('requires append-only immutable projections and non-destructive rollback', () => {
    expect(contract.recompute).toEqual({
      mode: 'append-only',
      createsNewProjectionVersion: true,
      historicalProjections: 'immutable',
      activation: 'atomic-publish',
      rollback: {
        method: 'activate-existing-version',
        deletesProjectionRows: false,
        rewritesHistoricalProjectionRows: false,
      },
    });
  });

  it('requires request-key reuse, leases, atomic publishing, and bounded retention', () => {
    expect(contract.idempotency).toEqual({
      requestKey: { unique: true, retry: 'reuse-existing-request' },
      lease: {
        required: true,
        singleActiveHolderPerRequestKey: true,
        expiredLease: 'may-be-reclaimed',
      },
      publish: {
        atomic: true,
        requiresCompletedProjectionBeforeActivation: true,
      },
    });
    expect(contract.retention.privacyDeletion).toEqual({
      mayRemoveAffectedProjectionData: true,
      mayOverrideAppendOnlyRetention: true,
      requiresAuditableTombstoneWithoutRawIdentity: true,
    });
    expect(contract.retention.deletionException).toBe('privacy-deletion-request');
  });

  it('lists implementation preconditions and keeps this slice non-operational', () => {
    expect(contract.preconditions).toEqual(
      expect.arrayContaining([
        'approved versioned projection definition',
        'privacy review of aggregate-only input and output',
        'unique request key and lease storage are available',
        'atomic publish transaction boundary is defined',
      ]),
    );
    expect(contract.nonGoals).toEqual(
      expect.arrayContaining([
        'Prisma migration or database schema',
        'backfill worker or scheduler',
        'public write API',
        'source-data repair or mutation',
        'outbox purge',
        'Rust database writer or migration',
        'UI or production execution',
      ]),
    );
  });
});
