import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabase, TEST_USER_ID } from '../utils/mockSupabase';
import { retrieveRelevantChunks } from '../../lib/retrieval';
import { storeChunks } from '../../lib/knowledge';
import { learningOrchestrator } from '../../src/intelligence';
import { useRoadmapStore } from '../../store/roadmapStore';

vi.mock('../../lib/embeddings', () => ({
  generateEmbedding: vi.fn(),
}));

import { generateEmbedding } from '../../lib/embeddings';
const mockedEmbedding = generateEmbedding as unknown as ReturnType<typeof vi.fn>;

// Path must satisfy assertRetrievalContext's canonical-ownership checks.
const highSchoolContext = {
  portal_type: 'high_school' as const,
  curriculum_scope: 'KICD_KCSE',
  taxonomy_scope: 'HS-MATH',
  mastery_level: 30,
  user_goal: 'Master linear equations',
  active_path: ['HS-MATH-ALG'],
};

const makeEmbedding = () => new Array(384).fill(0.1);

describe('Polymath: free-form learning goals', () => {
  beforeEach(() => {
    mockedEmbedding.mockReset();
  });

  it('refuses non-knowledge-explorer writes (fail-closed) and writes nothing', async () => {
    await expect(
      learningOrchestrator.saveLearningGoal({
        user_id: TEST_USER_ID,
        topic: 'Quantum Physics',
        portal_type: 'high_school',
        data: { title: 'Quantum Physics' },
      })
    ).rejects.toThrow(/GOVERNANCE ERROR/);

    expect(mockSupabase.db.learning_goals).toHaveLength(0);
  });

  it('persists free-form roadmaps as idempotent learning goals through the real write path', async () => {
    const store = useRoadmapStore.getState();
    store.setUserId(TEST_USER_ID);

    const roadmap = {
      id: 'local-roadmap-1',
      topic: 'Quantum Physics for Beginners',
      title: 'Quantum Physics for Beginners',
      days: [{ day: 1, title: 'Day 1', tasks: ['Understand superposition'] }],
      createdAt: new Date().toISOString(),
      learningMode: 'self_directed' as const,
    };

    await store.saveRoadmap(roadmap, 'self_directed');
    await store.saveRoadmap(roadmap, 'self_directed');

    const goals = mockSupabase.db.learning_goals;
    expect(goals).toHaveLength(1);
    expect(goals[0].user_id).toBe(TEST_USER_ID);
    expect(goals[0].topic).toBe(roadmap.topic);
    expect(goals[0].portal_type).toBe('knowledge_explorer');
    expect(goals[0].data.days).toHaveLength(1);

    // Written through the governed layer: no phantom _matchFields column leaks.
    expect(Object.keys(goals[0]).some((key) => key === '_matchFields')).toBe(false);
  });

  it('rehydrates free-form missions via listLearningGoals (same topic → same id)', async () => {
    await learningOrchestrator.saveLearningGoal({
      user_id: TEST_USER_ID,
      topic: 'Chords and Harmony',
      portal_type: 'knowledge_explorer',
      data: { title: 'Chords and Harmony', days: [] },
    });

    const goals = await learningOrchestrator.listLearningGoals({
      user_id: TEST_USER_ID,
      portal_type: 'knowledge_explorer',
    });

    expect(goals).toHaveLength(1);
    expect(goals[0].topic).toBe('Chords and Harmony');
  });
});

describe('Polymath: real ingestion (governed, fail-closed)', () => {
  beforeEach(() => {
    mockedEmbedding.mockReset();
  });

  it('stores chunks only when embeddings exist and is idempotent on re-run', async () => {
    mockedEmbedding.mockResolvedValue(makeEmbedding());

    const source = {
      userId: TEST_USER_ID,
      portalType: 'knowledge_explorer' as const,
      documentId: '11111111-1111-4111-8111-111111111111',
      title: 'My Notes',
      chunks: ['Chunk one about thermodynamics', 'Chunk two about entropy'],
    };

    const first = await storeChunks(source);
    expect(first.stored).toBe(2);
    expect(first.failed).toBe(0);
    // no silent drops: totals are explicit
    expect(first.total).toBe(2);

    const rows = mockSupabase.db.document_chunks;
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.user_id === TEST_USER_ID)).toBe(true);
    expect(rows.every((row) => row.portal_type === 'knowledge_explorer')).toBe(true);
    expect(rows.every((row) => Array.isArray(row.embedding) && row.embedding.length === 384)).toBe(true);
    expect(rows.some((row) => Object.keys(row).includes('_matchFields'))).toBe(false);

    // Re-ingesting the same source is a deterministic upsert, not a duplicate.
    await storeChunks(source);
    expect(mockSupabase.db.document_chunks).toHaveLength(2);

    // Parent document row was created too.
    expect(mockSupabase.db.documents).toHaveLength(1);
    expect(mockSupabase.db.documents[0]!.id).toBe(source.documentId);
  });

  it('fails closed: chunks without an embedding are counted as failed, never stored', async () => {
    mockedEmbedding.mockResolvedValue(null);

    const result = await storeChunks({
      userId: TEST_USER_ID,
      portalType: 'knowledge_explorer',
      documentId: '22222222-2222-4222-8222-222222222222',
      title: 'Offline notes',
      chunks: ['Only chunk'],
    });

    expect(result.stored).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.total).toBe(1);
    expect(mockSupabase.db.document_chunks).toHaveLength(0);
  });
});

describe('Polymath: real retrieval (match_document_chunks RPC)', () => {
  it('returns seeded chunks when the embedding exists', async () => {
    mockedEmbedding.mockResolvedValue(makeEmbedding());
    mockSupabase.setRpcResult('match_document_chunks', [
      {
        id: 'chunk-1',
        content: 'First law of thermodynamics',
        metadata: { documentId: 'doc-1' },
        similarity: 0.92,
      },
      {
        id: 'chunk-2',
        content: 'Entropy increases in isolated systems',
        metadata: { documentId: 'doc-1' },
        similarity: 0.83,
      },
    ]);

    const results = await retrieveRelevantChunks(
      'thermodynamics entropy',
      highSchoolContext,
      { minSimilarity: 0.7 }
    );

    expect(results.length).toBe(2);
    expect(results[0]!.content).toBe('First law of thermodynamics');
    expect(results[0]!.similarity).toBe(0.92);
    expect(results[0]!.metadata).toBeDefined();
  });

  it('fails closed: empty embedding never reaches the RPC and yields no matches', async () => {
    mockedEmbedding.mockResolvedValue(null);

    const results = await retrieveRelevantChunks('anything', highSchoolContext);

    expect(results).toEqual([]);
  });
});