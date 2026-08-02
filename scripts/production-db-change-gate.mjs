import { execFileSync } from 'node:child_process';

const RUNBOOK_ID_PATTERN = /^PDD-DB-\d{4}-\d{2}-\d{2}-[A-Z0-9][A-Z0-9-]{2,80}$/;
const REVIEW_URL_PATTERN = /^https:\/\/github\.com\/xodapi\/kognitika\/(?:issues|pull)\/\d+\/?$/;
const DB_SENSITIVE_PATHS = [
  /^prisma\/schema\.prisma$/,
  /^prisma\/migrations\//,
  /^scripts\/.*(?:migration|prisma|database|db)[^/]*\.(?:[cm]?[jt]s|sh)$/i,
  /^\.github\/workflows\/(?:deploy|production|release).*\.ya?ml$/i,
];

function fail(message) {
  console.error(`[production-db-gate] ${message}`);
  process.exitCode = 1;
}

function changedPaths(from, to) {
  try {
    return execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMR', from, to], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).split(/\r?\n/).filter(Boolean);
  } catch {
    fail('Could not determine the reviewed change set. Refusing production database mutation.');
    return [];
  }
}

export function isDbSensitivePath(filePath) {
  return DB_SENSITIVE_PATHS.some((pattern) => pattern.test(filePath));
}

export function isValidRunbookId(runbookId) {
  return typeof runbookId === 'string' && RUNBOOK_ID_PATTERN.test(runbookId);
}

export function isReviewableGitHubUrl(reviewUrl) {
  return typeof reviewUrl === 'string' && REVIEW_URL_PATTERN.test(reviewUrl);
}

export function evaluateProductionDbGate({ paths, runbookId, reviewUrl }) {
  const sensitivePaths = paths.filter(isDbSensitivePath);
  if (sensitivePaths.length === 0) {
    return { allowed: true, sensitivePaths };
  }

  if (!isValidRunbookId(runbookId) || !isReviewableGitHubUrl(reviewUrl)) {
    return {
      allowed: false,
      sensitivePaths,
      reason: 'Database-sensitive changes require a valid PDD runbook identifier and reviewable repository issue or pull-request URL.',
    };
  }

  return { allowed: true, sensitivePaths };
}

function main() {
  const [from, to] = process.argv.slice(2);
  if (!from || !to) {
    fail('Expected base and target commit arguments. Refusing production database mutation.');
    return;
  }

  const result = evaluateProductionDbGate({
    paths: changedPaths(from, to),
    runbookId: process.env.DB_CHANGE_RUNBOOK_ID,
    reviewUrl: process.env.DB_CHANGE_REVIEW_URL,
  });

  if (!result.allowed) {
    fail(result.reason);
    return;
  }

  console.log(result.sensitivePaths.length > 0
    ? '[production-db-gate] Reviewed database-sensitive change set accepted.'
    : '[production-db-gate] No database-sensitive paths in reviewed change set.');
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  main();
}
