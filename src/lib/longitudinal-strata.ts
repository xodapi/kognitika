/**
 * Pure, identity-free eligibility resolver for a future longitudinal read
 * projection. It does not persist, diagnose, or aggregate session data.
 */
export type LongitudinalStrataMapping = {
  readonly moduleId: string;
  readonly moduleVersion: string;
  readonly difficulties: Readonly<Record<string, string>>;
};

export type LongitudinalStrataPolicy = readonly LongitudinalStrataMapping[];

export type LongitudinalStratum = {
  readonly moduleId: string;
  readonly moduleVersion: string;
  readonly difficulty: string;
  readonly label: string;
};

export type LongitudinalStrataResolution =
  | { readonly eligible: true; readonly reason: 'eligible'; readonly stratum: LongitudinalStratum }
  | {
    readonly eligible: false;
    readonly reason:
      | 'malformed'
      | 'not_completed'
      | 'abandoned'
      | 'unsupported_module_version'
      | 'missing_difficulty'
      | 'mixed_difficulty'
      | 'unknown_difficulty';
    readonly stratum: null;
  };

type CandidateEvent = {
  readonly kind?: unknown;
  readonly difficulty?: unknown;
};

type CandidateJob = {
  readonly moduleId?: unknown;
  readonly moduleVersion?: unknown;
  readonly events?: unknown;
};

const INELIGIBLE = (reason: Exclude<LongitudinalStrataResolution['reason'], 'eligible'>): LongitudinalStrataResolution => ({
  eligible: false,
  reason,
  stratum: null,
});

/**
 * Resolves one completed canonical job into exactly one explicit stratum.
 * Unsupported or ambiguous input is intentionally excluded rather than
 * inferred, normalized, or assigned to a neighboring stratum.
 */
export function resolveLongitudinalStratum(
  candidate: unknown,
  policy: LongitudinalStrataPolicy,
): LongitudinalStrataResolution {
  if (!isCandidateJob(candidate)) return INELIGIBLE('malformed');

  const events = candidate.events;
  if (!events.every(isCandidateEvent)) return INELIGIBLE('malformed');

  const terminalKinds = events
    .map((event) => event.kind)
    .filter((kind) => kind === 'session_completed' || kind === 'session_abandoned');
  if (terminalKinds.length !== 1) return INELIGIBLE('not_completed');
  if (terminalKinds[0] === 'session_abandoned') return INELIGIBLE('abandoned');
  if (events[events.length - 1]?.kind !== 'session_completed') return INELIGIBLE('not_completed');

  const mapping = policy.find((entry) => (
    entry.moduleId === candidate.moduleId && entry.moduleVersion === candidate.moduleVersion
  ));
  if (!mapping) return INELIGIBLE('unsupported_module_version');

  const trialEvents = events.filter((event) => (
    event.kind === 'trial_started' || event.kind === 'trial_answered'
  ));
  if (trialEvents.length === 0 || trialEvents.some((event) => typeof event.difficulty !== 'string')) {
    return INELIGIBLE('missing_difficulty');
  }

  const difficulties = new Set(trialEvents.map((event) => event.difficulty as string));
  if (difficulties.size !== 1) return INELIGIBLE('mixed_difficulty');

  const [difficulty] = difficulties;
  const label = mapping.difficulties[difficulty];
  if (typeof label !== 'string' || label.length === 0) return INELIGIBLE('unknown_difficulty');

  return {
    eligible: true,
    reason: 'eligible',
    stratum: {
      moduleId: candidate.moduleId,
      moduleVersion: candidate.moduleVersion,
      difficulty,
      label,
    },
  };
}

function isCandidateJob(candidate: unknown): candidate is CandidateJob & {
  moduleId: string;
  moduleVersion: string;
  events: CandidateEvent[];
} {
  if (!isRecord(candidate)
    || typeof candidate.moduleId !== 'string'
    || candidate.moduleId.length === 0
    || typeof candidate.moduleVersion !== 'string'
    || candidate.moduleVersion.length === 0
    || !Array.isArray(candidate.events)
    || candidate.events.length === 0) {
    return false;
  }
  return true;
}

function isCandidateEvent(event: unknown): event is CandidateEvent {
  return isRecord(event) && typeof event.kind === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
