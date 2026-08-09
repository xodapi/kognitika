export declare function isDbSensitivePath(filePath: string): boolean;

export declare function isValidRunbookId(runbookId: unknown): boolean;

export declare function isReviewableGitHubUrl(reviewUrl: unknown): boolean;

export interface ProductionDbGateRequest {
  paths: string[];
  runbookId?: string | undefined;
  reviewUrl?: string | undefined;
}

export interface ProductionDbGateResult {
  allowed: boolean;
  sensitivePaths: string[];
  reason?: string;
}

export declare function evaluateProductionDbGate(
  request: ProductionDbGateRequest,
): ProductionDbGateResult;
