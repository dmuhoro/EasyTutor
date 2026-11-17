import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockSupabase, TEST_USER_ID } from '../utils/mockSupabase';
import { storeChunks } from '../../lib/knowledge';
import { retrieveRelevantChunks, buildCitation } from '../../lib/retrieval';
import { setActivePortalContext } from '../../src/infrastructure/portalContext';
import { useProgressStore } from '../../store/progressStore';
import { MasteryMemory } from '../../src/intelligence/memory/masteryMemory';
import { WeakPointMemory } from '../../src/intelligence/memory/weakPointMemory';
import { warmLearningPort } from '../utils/warmLearningPort';

// W1-3 §6: prove the learning loop still works end-to-end AFTER the ADR-009
// hardening. Only the embedding model is stubbed (unavailable in CI). Every
// other step calls the production module on the real submission path.
vi.mock('../../lib/embeddings', () => ({ generateEmbedding: async () => null }));

const OTHER_USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TOPIC_ID = '22222222-2222-4222-8222-222222222222';

describe('Post-hardening loop (W1-3)', () => {
  warmLearningPort();

  const rpcCalls: Array<{ name: string; args?: Record<string, unknown> }> = [];
  const originalRpc = mockSupabase.client.rpc;

  beforeEach(async () => {
    mockSupabase.reset();
    rpcCalls.length = 0;
    mockSupabase.client.rpc = async (name: string, args?: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      return originalRpc(name, args);
    };
    setActivePortalContext({ learningMode: 'self_directed', userId: TEST_USER_ID });
    await AsyncStorage.clear();
    useProgressStore.setState({ userId: TEST_USER_ID, quizScores: [], xpTotal: 0 });
  });

  it('import -> retrieval -> quiz -> weak-spot works for a signed-in user', async () => {
    // 1) IMPORT — no embedding model; chunks must still be stored and private.
    const chunks = Array.from({ length: 12 }, (_, i) => ({
      id: `loop-chunk-${i}`,
      content: `Photosynthesis note ${i}: plants convert light into chemical energy.`,
      metadata: { source: 'loop.pdf', chapter_no: 2, page: 20 + i },
    }));
    const stored = await storeChunks({
      userId: TEST_USER_ID,
      portalType: 'knowledge_explorer',
      documentId: 'loop-doc',
      title: 'Loop Notes',
      chunks,
      subjectId: 'sd-biology',
      curriculumScope: 'GLOBAL_OPEN', // must be overridden
    });
    expect(stored).toEqual({ stored: 12, failed: 0, total: 12 });
    expect(mockSupabase.db.document_chunks).toHaveLength(12);
    expect(
      mockSupabase.db.document_chunks.every(
        (c) => c.curriculum_scope === 'USER_PRIVATE' && c.user_id === TEST_USER_ID,
      ),
    ).toBe(true);

    // 2) RETRIEVAL — ranked FTS RPC, cited results survive the governance gate.
    mockSupabase.setRpcResult('search_document_chunks_fts', [
      { content: chunks[0].content, metadata: chunks[0].metadata, rank: 0.1 },
      { content: chunks[1].content, metadata: chunks[1].metadata, rank: 0.09 },
    ]);
    const context = {
      portal_type: 'knowledge_explorer' as const,
      curriculum_scope: 'USER_PRIVATE',
      taxonomy_scope: 'sd-biology',
      mastery_level: 0,
      user_goal: 'understand photosynthesis',
      active_path: ['sd-biology'],
    };
    const results = await retrieveRelevantChunks('photosynthesis', context, { maxChunks: 2 });
    expect(rpcCalls.some((c) => c.name === 'search_document_chunks_fts')).toBe(true);
    expect(rpcCalls.some((c) => c.name === 'match_document_chunks')).toBe(false);
    expect(results).toHaveLength(2);
    expect(buildCitation(results[0].metadata)).toBe('[loop.pdf Ch2 p.20]');
    expect(results[0].similarity).toBeGreaterThanOrEqual(0.7);

    // 3) QUIZ — completing a quiz persists a user-owned quiz_sessions row.
    await useProgressStore.getState().addQuizScore(8, 10, 'Linear Equations', 'hs-math', TOPIC_ID);
    expect(mockSupabase.db.quiz_sessions).toContainEqual(
      expect.objectContaining({ user_id: TEST_USER_ID, score: 8, total: 10, topic_id: TOPIC_ID }),
    );

    // 4) WEAK SPOT — only the signed-in learner's low-mastery nodes surface.
    await MasteryMemory.update({
      user_id: TEST_USER_ID,
      node_id: 'node-low',
      portal_type: 'knowledge_explorer',
      mastery_score: 25,
      attempts: 3,
      last_activity: new Date().toISOString(),
    });
    await MasteryMemory.update({
      user_id: OTHER_USER_ID,
      node_id: 'node-other-user',
      portal_type: 'knowledge_explorer',
      mastery_score: 5,
      attempts: 1,
      last_activity: new Date().toISOString(),
    });
    const weak = await WeakPointMemory.identify(TEST_USER_ID);
    expect(weak.map((w) => w.node_id)).toEqual(['node-low']);
    expect(weak[0].urgency).toBe('high');
  });
});
