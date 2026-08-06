import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

const dbSensitivePaths = [
  'prisma/schema.prisma',
  'prisma/migrations/20260802000000_example/migration.sql',
  'scripts/run-production-migration.mjs',
  '.github/workflows/deploy.yml',
];

describe('production database governance contracts', () => {
  it('classifies schema, migrations, migration scripts, and deploy workflow changes as database-sensitive', async () => {
    const { isDbSensitivePath } = await import('../../scripts/production-db-change-gate.mjs');

    for (const file of dbSensitivePaths) {
      expect(isDbSensitivePath(file)).toBe(true);
    }
    expect(isDbSensitivePath('src/lib/calculator.ts')).toBe(false);
  });

  it('keeps the normal production deploy path free of DDL and migration-history mutation', () => {
    const deploy = read('.github/workflows/deploy.yml');
    const productionDeploy = deploy.slice(deploy.indexOf("'REMOTE'"));
    const preflight = productionDeploy.indexOf('node scripts/check-migration-baseline.mjs');

    // The verify job may migrate its disposable PostgreSQL service. This contract covers the remote production path.
    expect(productionDeploy).not.toContain('prisma migrate deploy');
    expect(productionDeploy).not.toContain('prisma migrate resolve');
    expect(preflight).toBeGreaterThanOrEqual(0);
    expect(preflight).toBeLessThan(productionDeploy.indexOf('upsert_env APP_URL'));
    expect(preflight).toBeLessThan(productionDeploy.indexOf('sudo cp deployment/nginx-kognitika.ru.conf'));
    expect(preflight).toBeLessThan(productionDeploy.indexOf('pnpm build'));
    expect(preflight).toBeLessThan(productionDeploy.indexOf('systemctl restart kognitika'));
  });

  it('requires a manual, externally approved DB-migration workflow with reviewable evidence before DDL', () => {
    const workflow = read('.github/workflows/production-db-migration.yml');
    const preflight = workflow.indexOf('node scripts/check-migration-baseline.mjs');
    const ddl = workflow.indexOf('pnpm exec prisma migrate deploy');

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production-db-changes');
    expect(workflow).toContain('db_change_runbook_id:');
    expect(workflow).toContain('review_url:');
    expect(workflow).toContain('node scripts/production-db-change-gate.mjs');
    expect(workflow).toContain('DATABASE_URL: ${{ secrets.DATABASE_URL }}');
    expect(workflow).not.toContain('prisma migrate resolve');
    expect(preflight).toBeGreaterThanOrEqual(0);
    expect(preflight).toBeLessThan(ddl);
  });

  it('requires an explicit destructive acknowledgement and a durable verified-backup reference before a clean rebuild', () => {
    const workflow = read('.github/workflows/production-db-migration.yml');
    const acknowledgement = workflow.indexOf('DELETE_PRODUCTION_DATA');
    const rebuildStep = workflow.indexOf('Clean rebuild on protected host');
    const backupReference = workflow.indexOf('VERIFIED_BACKUP_REFERENCE', rebuildStep);
    const checksum = workflow.indexOf('sha256sum --check');
    const stopService = workflow.indexOf('sudo systemctl stop kognitika');
    const reset = workflow.indexOf('DROP SCHEMA public CASCADE');
    const migration = workflow.indexOf('pnpm exec prisma migrate deploy');
    const finalStatus = workflow.lastIndexOf('pnpm exec prisma migrate status');

    expect(workflow).toContain('operation:');
    expect(workflow).toContain('clean_rebuild');
    expect(workflow).toContain('verified_backup_reference:');
    expect(workflow).not.toContain('actions/upload-artifact');
    expect(acknowledgement).toBeGreaterThanOrEqual(0);
    expect(rebuildStep).toBeGreaterThan(acknowledgement);
    expect(backupReference).toBeGreaterThan(rebuildStep);
    expect(checksum).toBeGreaterThan(backupReference);
    expect(stopService).toBeGreaterThan(checksum);
    expect(workflow).toContain('client_image=postgres:16');
    expect(workflow).toContain('client psql "$DATABASE_URL"');
    expect(reset).toBeGreaterThan(stopService);
    expect(migration).toBeGreaterThan(reset);
    expect(finalStatus).toBeGreaterThan(migration);
  });

  it('requires protected approval and an isolated restore before a backup can authorize a clean rebuild', () => {
    const workflow = read('.github/workflows/production-db-backup-verify.yml');
    const dump = workflow.indexOf('pg_dump --format=custom');
    const checksum = workflow.indexOf('sha256sum --check');
    const restore = workflow.indexOf('pg_restore --exit-on-error');

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production-db-changes');
    expect(workflow).toContain('backup_reference:');
    expect(workflow).toContain('review_url:');
    expect(workflow).toContain('client_image=postgres:16');
    expect(workflow).toContain('docker run --rm');
    expect(workflow).toContain('DATABASE_URL="${DATABASE_URL%%\\?schema=public}"');
    expect(workflow).toContain('createdb --maintenance-db="$DATABASE_URL"');
    expect(workflow).toContain('pg_restore --exit-on-error --no-owner --no-privileges --dbname "$restore_url"');
    expect(workflow).not.toContain('actions/upload-artifact');
    expect(dump).toBeGreaterThanOrEqual(0);
    expect(checksum).toBeGreaterThan(dump);
    expect(restore).toBeGreaterThan(checksum);
  });

  it('requires protected approval and an exact synthetic marker before production smoke cleanup', () => {
    const workflow = read('.github/workflows/production-smoke-data-cleanup.yml');

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production-db-changes');
    expect(workflow).toContain('DELETE_SYNTHETIC_SMOKE_DATA');
    expect(workflow).toContain("metadata @> '{\"smokeTest\": true}'::jsonb");
    expect(workflow).toContain('WITH smoke_sessions AS');
    expect(workflow).toContain('BEGIN;');
    expect(workflow).toContain('COMMIT;');
    expect(workflow).not.toContain('DROP SCHEMA');
    expect(workflow).not.toContain('actions/upload-artifact');
  });

  it('keeps ADMIN recovery dry-run by default and schema-guards the only supported write', () => {
    const workflow = read('.github/workflows/production-admin-recovery.yml');
    const schemaGuard = workflow.indexOf("schema_status=");
    const credentialGeneration = workflow.indexOf('brain_id="$(cat /proc/sys/kernel/random/uuid)"');
    const write = workflow.indexOf('INSERT INTO "User"');

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('environment: production-db-changes');
    expect(workflow).toContain('default: dry_run');
    expect(workflow).toContain('CREATE_ONE_RECOVERY_ADMIN');
    expect(workflow).toContain('test -r /opt/kognitika/.env');
    expect(workflow).toContain("column_name = 'brainId'");
    expect(workflow).toContain("column_name = 'pseudonym'");
    expect(workflow).toContain("column_name = 'role'");
    expect(workflow).toContain('recovery-admin-created');
    expect(workflow).toContain('Kognitika schema guard mismatch.');
    expect(workflow).toContain('database-client-unavailable');
    expect(workflow).toContain('database-connection-failed');
    expect(workflow).toContain('schema-function-query-failed');
    expect(workflow).toContain('information-schema-query-failed');
    expect(workflow).toContain("to_regclass('public.\\\"User\\\"')");
    expect(workflow).toContain('SELECT COUNT(*) FROM information_schema.columns');
    expect(workflow).toContain('kognitika-schema-query-failed');
    expect(workflow).toContain("sed -n -E 's/^[[:space:]]*");
    expect(workflow).toContain('kognitika-schema-ok|kognitika-schema-mismatch');
    expect(workflow).toContain('ADMIN recovery dry-run status: $diagnostic_status');
    expect(workflow).not.toContain('unexpected-diagnostic-state');
    expect(workflow).toContain('test ! -e "$recovery_file"');
    expect(workflow).not.toContain('DROP SCHEMA');
    expect(workflow).not.toContain('actions/upload-artifact');
    expect(schemaGuard).toBeGreaterThanOrEqual(0);
    expect(credentialGeneration).toBeGreaterThan(schemaGuard);
    expect(write).toBeGreaterThan(credentialGeneration);
  });

  it('fails closed without a valid runbook identifier and reviewable GitHub issue or pull-request URL', async () => {
    const { evaluateProductionDbGate } = await import('../../scripts/production-db-change-gate.mjs');

    expect(evaluateProductionDbGate({ paths: dbSensitivePaths })).toMatchObject({ allowed: false });
    expect(evaluateProductionDbGate({
      paths: dbSensitivePaths,
      runbookId: 'PDD-DB-2026-08-02-165',
    })).toMatchObject({ allowed: false });
    expect(evaluateProductionDbGate({
      paths: dbSensitivePaths,
      runbookId: 'PDD-DB-2026-08-02-165',
      reviewUrl: 'https://github.com/xodapi/kognitika/issues/165',
    })).toMatchObject({ allowed: true });
  });

  it('does not log credentials or protected user data from the governance gate', () => {
    const gate = read('scripts/production-db-change-gate.mjs');

    expect(gate).not.toMatch(/console\.(?:log|error)\([^\n]*(?:DATABASE_URL|password|credential|Brain ID|JWT|telemetry|user rows)/i);
  });
});
