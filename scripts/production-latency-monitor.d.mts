export const DEFAULT_TOTAL_THRESHOLD_MS: 3000;
export const DEFAULT_CONSECUTIVE_LIMIT: 3;
export function findActiveAsset(html: string): string | null;
export function updateConsecutiveState(previous: { consecutiveBreaches?: number } | undefined, breached: boolean): {
  consecutiveBreaches: number;
  alert: boolean;
};
export function runMonitor(options: {
  baseUrl: string;
  thresholdMs?: number;
  consecutiveLimit?: number;
  stateFile?: string;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
}): Promise<{
  measurements: Array<{
    url: string | null;
    status: number;
    totalMs: number;
    ttfbMs: number;
    bytes: number;
    proxy: string;
  }>;
  buildId: string | null;
  breached: boolean;
  consecutiveBreaches: number;
  alert: boolean;
}>;
