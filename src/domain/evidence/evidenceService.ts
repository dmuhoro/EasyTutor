import type { EvidenceDimension } from '../learning/types';

export interface EvidenceInput {
  userId: string;
  clientEventId: string;
  skillId: string;
  activityId: string;
  itemId?: string;
  itemVersion?: number;
  dimension: EvidenceDimension;
  response?: string;
  score: number;
  independent: boolean;
  hints: number;
  provenance?: 'learner_action' | 'ai_assisted';
}

export type SyncState = 'pending' | 'synced' | 'failed';

export interface EvidenceRecord extends EvidenceInput {
  id: string;
  syncState: SyncState;
  createdAt: string;
  attempts: number;
}

export interface EvidenceWriter { write(record: EvidenceRecord): Promise<{ ok: boolean; error?: string }>; }

const DIMENSIONS: EvidenceDimension[] = ['recall','understanding','application','analysis','reasoning','evaluation','creation','transfer','retention'];

export function validateEvidence(input: EvidenceInput): string | null {
  if (!input.userId) return 'missing userId';
  if (!input.clientEventId) return 'missing clientEventId';
  if (!input.skillId) return 'missing skillId';
  if (!input.activityId) return 'missing activityId';
  if (!DIMENSIONS.includes(input.dimension)) return 'invalid dimension';
  if (!Number.isFinite(input.score) || input.score < 0 || input.score > 1) return 'score out of range';
  if (!Number.isInteger(input.hints) || input.hints < 0) return 'invalid hints';
  if (typeof input.independent !== 'boolean') return 'invalid independence flag';
  return null;
}

export function createEvidence(input: EvidenceInput, now: Date = new Date()): EvidenceRecord {
  const err = validateEvidence(input);
  if (err) throw new Error(`invalid evidence: ${err}`);
  return { ...input, id: input.clientEventId, syncState: 'pending', createdAt: now.toISOString(), attempts: 0 };
}

export function enqueue(queue: EvidenceRecord[], record: EvidenceRecord): EvidenceRecord[] {
  if (queue.some(r => r.id === record.id)) return queue;
  return [...queue, record];
}

export function markSynced(queue: EvidenceRecord[], id: string): EvidenceRecord[] {
  return queue.map(r => r.id === id ? { ...r, syncState: 'synced' } : r);
}

export function markFailed(queue: EvidenceRecord[], id: string): EvidenceRecord[] {
  return queue.map(r => r.id === id ? { ...r, syncState: 'failed', attempts: r.attempts + 1 } : r);
}

export async function drain(queue: EvidenceRecord[], writer: EvidenceWriter): Promise<EvidenceRecord[]> {
  let next = queue;
  for (const record of queue) {
    if (record.syncState === 'synced') continue;
    try {
      const res = await writer.write(record);
      next = res.ok ? markSynced(next, record.id) : markFailed(next, record.id);
    } catch {
      next = markFailed(next, record.id);
    }
  }
  return next;
}
