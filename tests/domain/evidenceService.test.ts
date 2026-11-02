import { describe, it, expect } from 'vitest';
import { createEvidence, validateEvidence, enqueue, drain, type EvidenceInput } from '../../src/domain/evidence/evidenceService';

const base: EvidenceInput = { userId:'u1', clientEventId:'e1', skillId:'fractions', activityId:'diag', dimension:'application', score:1, independent:true, hints:0 };

describe('evidence service', () => {
  it('rejects invalid score', () => expect(validateEvidence({...base, score:1.2})).not.toBeNull());
  it('rejects invalid dimension', () => expect(validateEvidence({...base, dimension:'bogus' as any})).not.toBeNull());
  it('creates pending evidence', () => expect(createEvidence(base).syncState).toBe('pending'));
  it('enqueue is idempotent', () => {
    const r = createEvidence(base); const q = enqueue(enqueue([], r), r);
    expect(q.length).toBe(1);
  });
  it('drain marks synced on success', async () => {
    const q = enqueue([], createEvidence(base));
    const out = await drain(q, { write: async () => ({ ok: true }) });
    expect(out[0].syncState).toBe('synced');
  });
  it('drain retains failed record for retry', async () => {
    const q = enqueue([], createEvidence(base));
    const out = await drain(q, { write: async () => ({ ok: false }) });
    expect(out[0].syncState).toBe('failed');
  });
});
