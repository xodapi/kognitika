export type ProductionDbGateResult =
  | { allowed: true; sensitivePaths: string[] }
  | { allowed: false; sensitivePaths: string[]; reason: string };

export function isDbSensitivePath(filePath: string): boolean;
export function isValidRunbookId(runbookId: unknown): boolean;
export function isReviewableGitHubUrl(reviewUrl: unknown): boolean;
export function evaluateProductionDbGate(input: {
  paths: string[];
  runbookId?: unknown;
  reviewUrl?: unknown;
}): ProductionDbGateResult;
