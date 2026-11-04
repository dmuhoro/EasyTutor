// Evidence domain service — pure, deterministic, dependency-free.
//
// Authority boundary (ADR-008 / Mission 4):
//   * This module validates evidence and coordinates the local outbox.
//   * It never decides mastery. Mastery belongs to the deterministic learning engine.
//   * It never talks to the network. Writers are injected at the application edge.

import type { EvidenceDimension } from '../learning/types';

export type EvidenceProvenance = 'learner_action' | 'ai_assisted' | 'system_review';
export type EvidenceValidationStatus = 'validated' | 'provisional' | 'rejected';

export interface EvidenceInput {
  userId: string;
  clientEventId: string;
  /** Canonical subject namespace. Optional only for backwards compatibility; new evidence always sets it. */
  subjectId?: string;
  skillId: string;
  /** Stable identifier of the activity that produced the evidence (diagnostic, practice, review...). */
  activityId: string;
  /** Optional learning-objective / curriculum mapping. Never conflated with the canonical skill id. */
  objectiveId?: string;
  curriculumRef?: string;
  itemId?: string;
  itemVersion?: number;
  assessmentVersion?: number;
  dimension: EvidenceDimension;
  /** The learner's response, or an appropriate reference. Never a secret. */
  response?: string;
  score: number;
  independent: boolean;
  hints: number;
  provenance?: EvidenceProvenance;
}

export type SyncState = 'pending' | 'syncing' | 'synced' | 'failed';

export type EvidenceErrorCode =
  | 'validation'
  | 'identity_mismatch'
  | 'auth_expired'
  | 'network'
  | 'duplicate'
  | 'backend'
  | 'unknown';

export interface EvidenceFailure {
  ok: false;
  code: EvidenceErrorCode;
  message: string;
  retryable: boolean;
}

export type EvidenceWriteResult = { ok: true; duplicate?: boolean } | EvidenceFailure;

export interface EvidenceRecord extends EvidenceInput {
  id: string;
  syncState: SyncState;
  createdAt: string;
  attempts: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  lastError?: string;
  lastErrorCode?: EvidenceErrorCode;
}

/**
 * Persistence port. The application injects a concrete implementation
 * (Supabase) at the boundary; tests inject deterministic fakes.
 */
export interface EvidenceWriter {
  write(record: EvidenceRecord): Promise<EvidenceWriteResult>;
}

const DIMENSIONS: readonly EvidenceDimension[] = [
  'recall', 'understanding', 'application', 'analysis',
  'reasoning', 'evaluation', 'creation', 'transfer', 'retention',
];

const PROVENANCES: readonly EvidenceProvenance[] = ['learner_action', 'ai_assisted', 'system_review'];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CLIENT_EVENT_ID_MAX_LENGTH = 200;
export const RETRY_BASE_MS = 1_000;
export const RETRY_MAX_MS = 5 * 60_000;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Validates an evidence candidate. Returns a human-readable reason, or null when valid.
 * A client can never submit an arbitrary mastery claim: only bounded learner actions pass.
 */
export function validateEvidence(input: EvidenceInput): string | null {
  if (!input.userId) return 'missing userId';
  if (!isUuid(input.userId)) return 'userId must be a UUID';
  if (!input.clientEventId) return 'missing clientEventId';
  if (input.clientEventId.length > CLIENT_EVENT_ID_MAX_LENGTH) return 'clientEventId too long';
  if (!input.skillId) return 'missing skillId';
  if (!input.activityId) return 'missing activityId';
  if (!DIMENSIONS.includes(input.dimension)) return 'invalid dimension';
  if (!Number.isFinite(input.score) || input.score < 0 || input.score > 1) return 'score out of range';
  if (!Number.isInteger(input.hints) || input.hints < 0) return 'invalid hints';
  if (typeof input.independent !== 'boolean') return 'invalid independence flag';
  if (input.itemVersion !== undefined && (!Number.isInteger(input.itemVersion) || input.itemVersion < 1)) {
    return 'invalid itemVersion';
  }
  if (input.assessmentVersion !== undefined && (!Number.isInteger(input.assessmentVersion) || input.assessmentVersion < 1)) {
    return 'invalid assessmentVersion';
  }
  if (input.provenance !== undefined && !PROVENANCES.includes(input.provenance)) {
    return 'invalid provenance';
  }
  return null;
}

export function createEvidence(input: EvidenceInput, now: Date = new Date()): EvidenceRecord {
  const reason = validateEvidence(input);
  if (reason) throw new Error(`invalid evidence: ${reason}`);
  return {
    ...input,
    id: input.clientEventId,
    syncState: 'pending',
    createdAt: now.toISOString(),
    attempts: 0,
  };
}

/** Adds a record exactly once. The client event id is the idempotency key. */
export function enqueue(queue: EvidenceRecord[], record: EvidenceRecord): EvidenceRecord[] {
  if (queue.some((r) => r.id === record.id)) return queue;
  return [...queue, record];
}

/**
 * A learner-scoped view of an outbox. This is the only way application code should read
 * the queue for display, so one learner's cached evidence can never surface under another.
 */
export function outboxForLearner(queue: EvidenceRecord[], userId: string | null): EvidenceRecord[] {
  if (!userId) return [];
  return queue.filter((r) => r.userId === userId);
}

export function pendingForLearner(queue: EvidenceRecord[], userId: string | null): EvidenceRecord[] {
  return outboxForLearner(queue, userId).filter((r) => r.syncState !== 'synced');
}

/** Recovers records left in `syncing` when the app was closed mid-flight. */
export function recoverInterrupted(queue: EvidenceRecord[]): EvidenceRecord[] {
  return queue.map((r) => (r.syncState === 'syncing' ? { ...r, syncState: 'pending' } : r));
}

export function nextRetryDelayMs(attempts: number): number {
  const exponent = Math.max(0, Math.min(attempts, 10));
  return Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** exponent);
}

export function isRetryable(code: EvidenceErrorCode): boolean {
  return code === 'network' || code === 'auth_expired' || code === 'backend' || code === 'unknown';
}

function withResult(
  queue: EvidenceRecord[],
  id: string,
  patch: Partial<EvidenceRecord>,
): EvidenceRecord[] {
  return queue.map((r) => (r.id === id ? { ...r, ...patch } : r));
}

export interface MarkFailureOptions {
  code: EvidenceErrorCode;
  message: string;
  now?: Date;
}

export function markSynced(queue: EvidenceRecord[], id: string): EvidenceRecord[] {
  return withResult(queue, id, {
    syncState: 'synced',
    lastError: undefined,
    lastErrorCode: undefined,
    nextRetryAt: undefined,
  });
}

export function markSyncing(queue: EvidenceRecord[], id: string, now: Date = new Date()): EvidenceRecord[] {
  return withResult(queue, id, { syncState: 'syncing', lastAttemptAt: now.toISOString() });
}

export function markFailed(queue: EvidenceRecord[], id: string, options: MarkFailureOptions): EvidenceRecord[] {
  const now = options.now ?? new Date();
  const record = queue.find((r) => r.id === id);
  const attempts = (record?.attempts ?? 0) + 1;
  const retryable = isRetryable(options.code);
  return withResult(queue, id, {
    syncState: 'failed',
    attempts,
    lastAttemptAt: now.toISOString(),
    lastError: options.message,
    lastErrorCode: options.code,
    nextRetryAt: retryable ? new Date(now.getTime() + nextRetryDelayMs(attempts - 1)).toISOString() : undefined,
  });
}

/** Explicit operator/learner-initiated retry of permanently failed records. */
export function retryFailed(queue: EvidenceRecord[], id?: string): EvidenceRecord[] {
  return queue.map((r) => {
    if (r.syncState !== 'failed') return r;
    if (id && r.id !== id) return r;
    return { ...r, syncState: 'pending', nextRetryAt: undefined };
  });
}

export interface DrainOptions {
  now?: Date;
  /** Persist each transition so app closure can never lose a status change. */
  onProgress?: (queue: EvidenceRecord[]) => void;
  /** Bounds a single run; remaining records stay pending for the next run. */
  maxRecords?: number;
}

function normalizeResult(result: EvidenceWriteResult | { ok: boolean; error?: string }): EvidenceWriteResult {
  if (result.ok) return { ok: true, duplicate: 'duplicate' in result ? result.duplicate : undefined };
  if ('code' in result) return result;
  // Tolerates the legacy writer contract: unknown failure, retryable.
  return { ok: false, code: 'backend', message: result.error ?? 'write failed', retryable: true };
}

/**
 * Delivers pending/failed evidence to the writer. Never drops a record:
 * every outcome leaves an explicit, inspectable state on the queue.
 */
export async function drain(
  queue: EvidenceRecord[],
  writer: EvidenceWriter,
  options: DrainOptions = {},
): Promise<EvidenceRecord[]> {
  const now = options.now ?? new Date();
  let next = queue;
  const limit = options.maxRecords ?? Number.POSITIVE_INFINITY;
  const snapshot = queue.filter((r) => r.syncState !== 'synced').slice(0, limit);

  for (const record of snapshot) {
    const current = next.find((r) => r.id === record.id);
    if (!current || current.syncState === 'synced') continue;
    if (current.nextRetryAt && new Date(current.nextRetryAt).getTime() > now.getTime()) continue;

    next = markSyncing(next, record.id, now);
    options.onProgress?.(next);

    try {
      const result = normalizeResult(await writer.write(current));
      if (result.ok) {
        next = markSynced(next, record.id);
      } else {
        next = markFailed(next, record.id, { code: result.code, message: result.message, now });
      }
    } catch (error) {
      next = markFailed(next, record.id, {
        code: 'unknown',
        message: error instanceof Error ? error.message : 'unexpected writer failure',
        now,
      });
    }

    options.onProgress?.(next);
  }

  return next;
}

export interface OutboxSummary {
  total: number;
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  retryable: number;
  requiresAuthentication: boolean;
  lastError?: string;
}

/** Learner-facing synchronization status. Accurate: only backend-confirmed writes count as synced. */
export function summarizeOutbox(queue: EvidenceRecord[], userId: string | null): OutboxSummary {
  const records = outboxForLearner(queue, userId);
  const summary: OutboxSummary = {
    total: records.length,
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    retryable: 0,
    requiresAuthentication: false,
  };

  for (const record of records) {
    summary[record.syncState] += 1;
    if (record.syncState === 'failed') {
      if (record.lastErrorCode && isRetryable(record.lastErrorCode)) summary.retryable += 1;
      if (record.lastErrorCode === 'auth_expired') summary.requiresAuthentication = true;
    }
    if (record.lastError && record.syncState !== 'synced') summary.lastError = record.lastError;
  }

  return summary;
}

/** Removes one learner's records. Only ever called for an explicit, deliberate data deletion. */
export function purgeLearner(queue: EvidenceRecord[], userId: string): EvidenceRecord[] {
  return queue.filter((r) => r.userId !== userId);
}
