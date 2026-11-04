import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, TEST_USER_ID } from '../utils/mockSupabase';
import { createEvidence, type EvidenceInput, type EvidenceRecord } from '../../src/domain/evidence/evidenceService';
import { createSupabaseEvidenceWriter } from '../../src/infrastructure/evidence/supabaseEvidenceWriter';
import { createSupabaseEvidenceRepository } from '../../src/infrastructure/evidence/supabaseEvidenceRepository';
import type { EvidenceClient } from '../../src/infrastructure/evidence/evidenceClient';
import { toLearningEvidenceRow } from '../../src/infrastructure/evidence/evidenceClient';

const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';

const client = mockSupabase.client as unknown as EvidenceClient;

const baseInput: EvidenceInput = {
  userId: TEST_USER_ID,
  clientEventId: 'evt-1',
  subjectId: 'mathematics',
  skillId: 'fractions',
  activityId: 'diagnostic-v1',
  itemId: 'math-frac-1',
  itemVersion: 1,
  dimension: 'application',
  response: '3/4',
  score: 1,
  independent: true,
  hints: 0,
  provenance: 'learner_action',
};

function record(overrides: Partial<EvidenceInput> = {}): EvidenceRecord {
  return createEvidence({ ...baseInput, ...overrides });
}

describe('supabase evidence writer', () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it('writes evidence owned by the authenticated learner', async () => {
    const writer = createSupabaseEvidenceWriter(() => client);
    const result = await writer.write(record());
    expect(result).toEqual({ ok: true });
    expect(mockSupabase.db.learning_evidence).toHaveLength(1);
    expect(mockSupabase.db.learning_evidence[0]).toMatchObject({
      user_id: TEST_USER_ID,
      client_event_id: 'evt-1',
      subject_id: 'mathematics',
      skill_id: 'fractions',
      validation_status: 'validated',
    });
  });

  it('refuses to write evidence under a different identity without touching the database', async () => {
    const writer = createSupabaseEvidenceWriter(() => client);
    const result = await writer.write(record({ userId: OTHER_USER_ID }));
    expect(result).toMatchObject({ ok: false, code: 'identity_mismatch', retryable: false });
    expect(mockSupabase.db.learning_evidence).toHaveLength(0);
  });

  it('treats a duplicate client event id as idempotent success', async () => {
    const writer = createSupabaseEvidenceWriter(() => client);
    expect(await writer.write(record())).toEqual({ ok: true });
    expect(await writer.write(record())).toEqual({ ok: true, duplicate: true });
    expect(mockSupabase.db.learning_evidence).toHaveLength(1);
  });

  it('rejects invalid evidence before persistence', async () => {
    const writer = createSupabaseEvidenceWriter(() => client);
    const result = await writer.write({ ...record(), score: 1.5 });
    expect(result).toMatchObject({ ok: false, code: 'validation', retryable: false });
    expect(mockSupabase.db.learning_evidence).toHaveLength(0);
  });

  it('classifies an expired session as retryable authentication failure', async () => {
    vi.spyOn(mockSupabase.client.auth, 'getUser').mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'JWT expired', code: 'PGRST301' },
    } as never);

    const writer = createSupabaseEvidenceWriter(() => client);
    const result = await writer.write(record());
    expect(result).toMatchObject({ ok: false, code: 'auth_expired', retryable: true });
    expect(mockSupabase.db.learning_evidence).toHaveLength(0);
  });

  it('classifies a missing client as a retryable network failure', async () => {
    const writer = createSupabaseEvidenceWriter(() => null);
    const result = await writer.write(record());
    expect(result).toMatchObject({ ok: false, code: 'network', retryable: true });
  });

  it('classifies an RLS rejection as a permanent validation failure', async () => {
    const writer = createSupabaseEvidenceWriter(() => client);
    mockSupabase.failNext('learning_evidence', 'insert', 'row-level security policy violation', '42501');
    const result = await writer.write(record());
    expect(result).toMatchObject({ ok: false, code: 'validation', retryable: false });
  });

  it('maps domain fields to database columns without inventing values', () => {
    const row = toLearningEvidenceRow(record(), TEST_USER_ID);
    expect(row.user_id).toBe(TEST_USER_ID);
    expect(row.objective_id).toBeNull();
    expect(row.curriculum_ref).toBeNull();
    expect(row.assessment_version).toBe(1);
    expect(row.item_version).toBe(1);
  });
});

describe('supabase evidence repository', () => {
  beforeEach(() => {
    mockSupabase.reset();
  });

  it('returns only the authenticated learner’s evidence', async () => {
    const writer = createSupabaseEvidenceWriter(() => client);
    await writer.write(record());
    await writer.write(record({ clientEventId: 'evt-2', skillId: 'equations' }));

    const repository = createSupabaseEvidenceRepository(() => client);
    const result = await repository.listForLearner(TEST_USER_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records).toHaveLength(2);
    expect(result.records.every((r) => r.userId === TEST_USER_ID)).toBe(true);
    expect(result.records[0].syncState).toBe('synced');
  });

  it('refuses to read another learner’s evidence', async () => {
    const repository = createSupabaseEvidenceRepository(() => client);
    const result = await repository.listForLearner(OTHER_USER_ID);
    expect(result).toMatchObject({ ok: false, code: 'auth_expired' });
  });

  it('drops malformed rows instead of guessing', async () => {
    mockSupabase.db.learning_evidence.push({
      user_id: TEST_USER_ID,
      client_event_id: 'bad-row',
      skill_id: 'fractions',
      activity_id: 'x',
      dimension: 'not-a-dimension',
      score: 1,
    });
    const repository = createSupabaseEvidenceRepository(() => client);
    const result = await repository.listForLearner(TEST_USER_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records).toHaveLength(0);
  });
});
