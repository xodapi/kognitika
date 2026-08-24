export const DEFAULT_MIN_AGE_HOURS: 24;

export interface AssetRetentionOptions {
  root: string;
  minAgeHours: number;
  apply: boolean;
}

export interface RetainedAsset {
  name: string;
  reason: 'index-reference' | 'younger-than-retention-window';
}

export interface CandidateAsset {
  name: string;
  path: string;
  mtime: Date;
}

export interface AssetRetentionPlan {
  candidates: CandidateAsset[];
  retained: RetainedAsset[];
  cutoff: Date;
  referenced: string[];
}

export function parseOptions(argv: string[]): AssetRetentionOptions;
export function referencedAssetNames(indexHtml: string, availableNames: string[]): Set<string>;
export function planAssetRetention(options: {
  assetDir: string;
  indexPath?: string;
  now?: Date;
  minAgeHours?: number;
}): Promise<AssetRetentionPlan>;
export function run(argv?: string[], io?: Pick<Console, 'log'>): Promise<AssetRetentionPlan>;
