import { describe, it, expect } from 'vitest';
import {
  createEvidence,
  validateEvidence,
  enqueue,
  drain,
  recoverInterrupted,
  outboxForLearner,
  summarizeOutbox,
  markFailed,
  retryFailed,
  nextRetryDelayMs,
  type EvidenceInput,
  type EvidenceRecord,
  type EvidenceWriter,
} from '../../src/domain/evidence/evidenceService';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

const base: EvidenceInput = {
  userId: USER,
  clientEventId: 'e1',
  subjectId: 'mathematics',
  skillId: 'fractions',
  activityId: 'diagnostic',
  dimension: 'application',
  score: 1,
  independent: true,
  hints: 0,
};

function rec(overrides: Partial<EvidenceInput> = {}): EvidenceRecord {
  return createEvidence({ ...base, ...overrides });
}

describe('evidence validation', () => {
  it('rejects an out-of-range score', () => {
    expect(validateEvidence({ ...base, score: 1.2 })).not.toBeNull();
  });
  it('rejects an unknown dimension', () => {
    expect(validateEvidence({ ...base, dimension: 'bogus' as never })).not.toBeNull();
  });
  it('rejects a non-integer hint count', () => {
    expect(validateEvidence({ ...base, hints: 1.5 })).not.toBeNull();
  });
  it('rejects a non-UUID owner (never a free-form client identity)', () => {
    expect(validateEvidence({ ...base, userId: 'learner' })).not.toBeNull();
  });
  it('rejects an unsupported provenance', () => {
    expect(validateEvidence({ ...base, provenance: 'claim' as never })).not.toBeNull();
  });
  it('accepts a valid learner action', () => {
    expect(validateEvidence(base)).toBeNull();
  });
  it('creates pending evidence with zero attempts', () => {
    const record = createEvidence(base);
    expect(record.syncState).toBe('pending');
    expect(record.attempts).toBe(0);
    expect(record.id).toBe(base.clientEventId);
  });
});

describe('outbox', () => {
  it('enqueue is idempotent by client event id', () => {
    const r = rec();
    const queue = enqueue(enqueue([], r), r);
    expect(queue).toHaveLength(1);
  });

  it('recovers records interrupted mid-flight back to pending', () => {
    const interrupted = { ...rec(), syncState: 'syncing' as const };
    expect(recoverInterrupted([interrupted])[0].syncState).toBe('pending');
  });

  it('never surfaces another learner’s records', () => {
    const queue = [rec(), rec({ clientEventId: 'e2', userId: OTHER })];
    const forUser = outboxForLearner(queue, USER);
    expect(forUser).toHaveLength(1);
    expect(forUser[0].userId).toBe(USER);
    expect(outboxForLearner(queue, null)).toHaveLength(0);
  });

  it('summarizes synchronization honestly', () => {
    let queue = enqueue([], rec());
    queue = markFailed(queue, 'e1', { code: 'auth_expired', message: 'JWT expired' });
    const summary = summarizeOutbox(queue, USER);
    expect(summary.failed).toBe(1);
    expect(summary.requiresAuthentication).toBe(true);
    expect(summary.synced).toBe(0);
  });

  it('uses bounded exponential backoff', () => {
    expect(nextRetryDelayMs(0)).toBe(1_000);
    expect(nextRetryDelayMs(3)).toBe(8_000);
    expect(nextRetryDelayMs(50)).toBe(300_000);
  });

  it('manual retry revives a permanently failed record without dropping it', () => {
    let queue = enqueue([], rec());
    queue = markFailed(queue, 'e1', { code: 'validation', message: 'bad payload' });
    expect(queue[0].syncState).toBe('failed');
    const revived = retryFailed(queue);
    expect(revived[0].syncState).toBe('pending');
    expect(revived[0].attempts).toBe(1);
  });
});

describe('drain', () => {
  it('marks a record synced only after the backend confirms', async () => {
    const writer: EvidenceWriter = { write: async () => ({ ok: true }) };
    const out = await drain(enqueue([], rec()), writer);
    expect(out[0].syncState).toBe('synced');
  });

  it('acknowledges an idempotent duplicate as synced', async () => {
    const writer: EvidenceWriter = { write: async () => ({ ok: true, duplicate: true }) };
    const out = await drain(enqueue([], rec()), writer);
    expect(out[0].syncState).toBe('synced');
  });

  it('retains a retryable failure with a next retry time', async () => {
    const now = new Date('2026-11-02T10:00:00Z');
    const writer: EvidenceWriter = {
      write: async () => ({ ok: false, code: 'network', message: 'offline', retryable: true }),
    };
    const out = await drain(enqueue([], rec()), writer, { now });
    expect(out[0].syncState).toBe('failed');
    expect(out[0].attempts).toBe(1);
    expect(out[0].lastErrorCode).toBe('network');
    expect(out[0].nextRetryAt).toBe('2026-11-02T10:00:01.000Z');
  });

  it('does not retry before the backoff window elapses', async () => {
    const now = new Date('2026-11-02T10:00:00Z');
    let writes = 0;
    const writer: EvidenceWriter = {
      write: async () => {
        writes += 1;
        return { ok: false, code: 'network', message: 'offline', retryable: true };
      },
    };
    let queue = await drain(enqueue([], rec()), writer, { now });
    queue = await drain(queue, writer, { now: new Date('2026-11-02T10:00:00.500Z') });
    expect(writes).toBe(1);
    await drain(queue, writer, { now: new Date(now.getTime() + 2_000) });
    expect(writes).toBe(2);
  });

  it('survives a thrown writer without losing the record', async () => {
    const writer: EvidenceWriter = {
      write: async () => {
        throw new Error('socket closed');
      },
    };
    const out = await drain(enqueue([], rec()), writer);
    expect(out).toHaveLength(1);
    expect(out[0].syncState).toBe('failed');
    expect(out[0].lastError).toContain('socket closed');
  });

  it('publishes each transition so app closure cannot lose sync status', async () => {
    const states: string[] = [];
    const writer: EvidenceWriter = { write: async () => ({ ok: true }) };
    await drain(enqueue([], rec()), writer, {
      onProgress: (queue) => states.push(queue[0].syncState),
    });
    expect(states).toEqual(['syncing', 'synced']);
  });

  it('supports partial synchronization in bounded runs', async () => {
    let queue = enqueue([], rec());
    queue = enqueue(queue, rec({ clientEventId: 'e2' }));
    const writer: EvidenceWriter = { write: async () => ({ ok: true }) };
    queue = await drain(queue, writer, { maxRecords: 1 });
    expect(queue.filter((r) => r.syncState === 'synced')).toHaveLength(1);
    expect(queue.filter((r) => r.syncState === 'pending')).toHaveLength(1);
    queue = await drain(queue, writer, { maxRecords: 1 });
    expect(queue.every((r) => r.syncState === 'synced')).toBe(true);
  });
});
