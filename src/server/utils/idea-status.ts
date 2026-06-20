export const IDEA_STATUSES = ['PENDING', 'IN_PROGRESS', 'DONE', 'REJECTED'] as const;

export type IdeaStatus = typeof IDEA_STATUSES[number];

const STATUS_SET = new Set<string>(IDEA_STATUSES);

const LEGACY_STATUS_MAP: Record<string, IdeaStatus> = {
  OPEN: 'PENDING',
  PLANNED: 'IN_PROGRESS',
  IMPLEMENTED: 'DONE',
  REJECTED: 'REJECTED',
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
};

function canonicalStatusKey(value: unknown) {
  if (typeof value !== 'string') return null;
  return value.trim().replace(/[\s-]+/g, '_').toUpperCase();
}

export function parseIdeaStatus(value: unknown): IdeaStatus | null {
  const key = canonicalStatusKey(value);
  if (!key) return null;
  if (STATUS_SET.has(key)) return key as IdeaStatus;
  return LEGACY_STATUS_MAP[key] || null;
}

export function normalizeIdeaStatus(value: unknown): IdeaStatus {
  return parseIdeaStatus(value) || 'PENDING';
}
