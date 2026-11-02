// Structural Supabase boundary for learning evidence.
//
// We depend on the smallest possible surface of the client (auth.getUser + from().insert/select)
// so the repository is testable and the UI never performs raw database operations.

import type {
  EvidenceErrorCode,
  EvidenceRecord,
  EvidenceValidationStatus,
  EvidenceWriteResult,
} from '../../domain/evidence/evidenceService';

export interface EvidenceAuthUser {
  id: string;
}

export interface EvidenceAuthResponse {
  data: { user: EvidenceAuthUser | null };
  error: { message?: string; code?: string } | null;
}

export interface EvidenceDbError {
  code?: string;
  message: string;
  details?: string;
}

export interface EvidenceInsertResult {
  error: EvidenceDbError | null;
}

export interface EvidenceSelectResult {
  data: unknown[] | null;
  error: EvidenceDbError | null;
}

export interface EvidenceSelectBuilder extends PromiseLike<EvidenceSelectResult> {
  eq(column: string, value: string): EvidenceSelectBuilder;
  order(column: string, options?: { ascending?: boolean }): EvidenceSelectBuilder;
  limit(count: number): EvidenceSelectBuilder;
}

export interface EvidenceTableClient {
  insert(rows: LearningEvidenceRow | LearningEvidenceRow[]): PromiseLike<EvidenceInsertResult>;
  select(columns?: string): EvidenceSelectBuilder;
}

export interface EvidenceClient {
  auth: { getUser(): Promise<EvidenceAuthResponse> };
  from(table: 'learning_evidence'): EvidenceTableClient;
}

export interface LearningEvidenceRow {
  user_id: string;
  client_event_id: string;
  subject_id: string | null;
  skill_id: string;
  activity_id: string;
  objective_id: string | null;
  curriculum_ref: string | null;
  item_id: string | null;
  item_version: number;
  assessment_version: number;
  dimension: string;
  response: string | null;
  score: number;
  independent: boolean;
  hints: number;
  provenance: string;
  validation_status: string;
}

export const EVIDENCE_TABLE = 'learning_evidence';

/** Maps the validated domain record onto database columns. Never trusts a client-supplied owner. */
export function toLearningEvidenceRow(record: EvidenceRecord, authenticatedUserId: string): LearningEvidenceRow {
  return {
    user_id: authenticatedUserId,
    client_event_id: record.clientEventId,
    subject_id: record.subjectId ?? null,
    skill_id: record.skillId,
    activity_id: record.activityId,
    objective_id: record.objectiveId ?? null,
    curriculum_ref: record.curriculumRef ?? null,
    item_id: record.itemId ?? null,
    item_version: record.itemVersion ?? 1,
    assessment_version: record.assessmentVersion ?? 1,
    dimension: record.dimension,
    response: record.response ?? null,
    score: record.score,
    independent: record.independent,
    hints: record.hints,
    provenance: record.provenance ?? 'learner_action',
    validation_status: 'validated',
  };
}

/** Postgres/PostgREST error classification. Drives retry vs. permanent-failure decisions. */
export function classifyEvidenceError(error: EvidenceDbError): {
  code: EvidenceErrorCode;
  retryable: boolean;
} {
  const code = error.code ?? '';
  const message = `${error.message} ${error.details ?? ''}`.toLowerCase();

  if (code === '23505') return { code: 'duplicate', retryable: false };
  if (code === 'PGRST301' || message.includes('jwt expired') || message.includes('jwt is expired')) {
    return { code: 'auth_expired', retryable: true };
  }
  if (code === '42501') {
    // A policy/permission rejection will not succeed by retrying the same payload.
    return { code: 'validation', retryable: false };
  }
  if (['23502', '23503', '23514', '22P02', '22001'].includes(code) || message.includes('row-level security')) {
    return { code: 'validation', retryable: false };
  }
  if (message.includes('failed to fetch') || message.includes('network request failed') || message.includes('timeout')) {
    return { code: 'network', retryable: true };
  }
  return { code: 'backend', retryable: true };
}

export function failureFromError(error: EvidenceDbError): EvidenceWriteResult {
  const classified = classifyEvidenceError(error);
  if (classified.code === 'duplicate') {
    // The backend already holds this exact (user_id, client_event_id): an idempotent success.
    return { ok: true, duplicate: true };
  }
  return {
    ok: false,
    code: classified.code,
    message: error.message || 'evidence write failed',
    retryable: classified.retryable,
  };
}

const DIMENSION_SET = new Set([
  'recall', 'understanding', 'application', 'analysis',
  'reasoning', 'evaluation', 'creation', 'transfer', 'retention',
]);

const VALIDATION_SET = new Set<EvidenceValidationStatus>(['validated', 'provisional', 'rejected']);

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asInteger(value: unknown, fallback = 1): number {
  return typeof value === 'number' && Number.isInteger(value) ? value : fallback;
}

/** Strictly parses a database row back into the domain record. Unknown rows are dropped, never guessed. */
export function parseLearningEvidenceRow(row: unknown): EvidenceRecord | null {
  if (!row || typeof row !== 'object') return null;
  const raw = row as Record<string, unknown>;

  const userId = asString(raw.user_id);
  const clientEventId = asString(raw.client_event_id);
  const skillId = asString(raw.skill_id);
  const activityId = asString(raw.activity_id);
  const dimension = asString(raw.dimension);
  const validation = asString(raw.validation_status, 'validated');

  if (!userId || !clientEventId || !skillId || !activityId) return null;
  if (!DIMENSION_SET.has(dimension)) return null;
  if (!VALIDATION_SET.has(validation as EvidenceValidationStatus)) return null;

  return {
    id: clientEventId,
    userId,
    clientEventId,
    subjectId: asNullableString(raw.subject_id) ?? undefined,
    skillId,
    activityId,
    objectiveId: asNullableString(raw.objective_id) ?? undefined,
    curriculumRef: asNullableString(raw.curriculum_ref) ?? undefined,
    itemId: asNullableString(raw.item_id) ?? undefined,
    itemVersion: asInteger(raw.item_version),
    assessmentVersion: asInteger(raw.assessment_version),
    dimension: dimension as EvidenceRecord['dimension'],
    response: asNullableString(raw.response) ?? undefined,
    score: asNumber(raw.score),
    independent: raw.independent === true,
    hints: asInteger(raw.hints, 0),
    provenance: (asString(raw.provenance, 'learner_action') as EvidenceRecord['provenance']),
    syncState: 'synced',
    createdAt: asString(raw.created_at, new Date(0).toISOString()),
    attempts: 0,
  };
}
