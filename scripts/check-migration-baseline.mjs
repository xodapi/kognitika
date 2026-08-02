import { inspectMigrationBaseline, withDatabaseUrl } from './migration-baseline-state.mjs';

function fail(message, code) {
  console.error(`[migration-baseline] ${message}`);
  process.exitCode = code;
}

try {
  const state = await withDatabaseUrl(inspectMigrationBaseline);

  switch (state.kind) {
    case 'empty':
      console.log('[migration-baseline] Empty database detected; baseline migration will be applied normally.');
      break;
    case 'compatible':
      console.log('[migration-baseline] Existing schema and migration history are compatible; pending migrations may apply normally.');
      break;
    case 'legacy-reconciliation-required':
      console.log('[migration-baseline] Exact approved legacy recovery fingerprint confirmed; committed reconciliation migration may apply.');
      break;
    case 'invalid':
      fail(`${state.reason} Stop deployment before DDL.`, state.code);
      break;
    default:
      fail('Could not classify migration baseline state.', 20);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : 'Could not verify migration baseline.', 20);
}
