import { beforeEach, describe, expect, it } from 'vitest';
import { processSyncQueue } from '../../services/syncEngine';
import { useSyncQueueStore } from '../../store/syncQueueStore';
import { mockSupabase, TEST_USER_ID } from '../utils/mockSupabase';

const TOPIC_ID = '22222222-2222-4222-8222-222222222222';

describe('C29 — local-first, idempotent sync', () => {
  beforeEach(() => {
    useSyncQueueStore.getState().clear();
    mockSupabase.reset();
  });

  it('deduplicates an identical offline write before it reaches Supabase', () => {
    const payload = {
      userId: TEST_USER_ID,
      subjectId: 'hs-math',
      topicId: TOPIC_ID,
      topicName: 'Linear Equations',
    };
    const first = useSyncQueueStore.getState().add({ type: 'progress_update', payload });
    const second = useSyncQueueStore.getState().add({ type: 'progress_update', payload });

    expect(second.id).toBe(first.id);
    expect(useSyncQueueStore.getState().items).toHaveLength(1);
  });

  it('replays a queued write exactly once and keeps it marked synced', async () => {
    useSyncQueueStore.getState().add({
      type: 'progress_update',
      payload: { userId: TEST_USER_ID, subjectId: 'hs-math', topicId: TOPIC_ID, topicName: 'Linear Equations' },
    });
    await processSyncQueue();

    const rows = mockSupabase.db.user_progress.filter(
      (row) => row.user_id === TEST_USER_ID && row.topic_id === TOPIC_ID,
    );
    expect(rows).toHaveLength(1);
    expect(useSyncQueueStore.getState().items.every((item) => item.status === 'synced')).toBe(true);

    // A second pass must not create another remote row: no silent duplicate writes.
    await processSyncQueue();
    expect(mockSupabase.db.user_progress.filter((row) => row.topic_id === TOPIC_ID)).toHaveLength(1);
  });

  it('retains a failed item locally with a retry timestamp instead of dropping it', async () => {
    mockSupabase.setRpcResult('resolve_topic_id', null);
    const item = useSyncQueueStore.getState().add({
      type: 'progress_update',
      payload: { userId: TEST_USER_ID, subjectId: 'hs-math', topicId: 'not-a-uuid', topicName: 'Unknown Topic' },
    });
    await processSyncQueue();

    const retained = useSyncQueueStore.getState().items.find((candidate) => candidate.id === item.id);
    expect(retained?.status).toBe('failed');
    expect(retained?.retries).toBe(1);
    expect(retained?.nextAttemptAt).toEqual(expect.any(String));
  });
});
