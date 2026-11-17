import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, TEST_USER_ID } from '../utils/mockSupabase';
import { storeChunks } from '../../lib/knowledge';
import { retrieveRelevantChunks, buildCitation } from '../../lib/retrieval';
import { setActivePortalContext } from '../../src/infrastructure/portalContext';

// No embedding model available (CI / phone user). Importing must still store
// every chunk, keep it private, and make it retrievable with a citation.
vi.mock('../../lib/embeddings', () => ({
  generateEmbedding: async () => null,
}));

describe('Import and retrieval without embeddings (ADR-009)', () => {
  const rpcCalls: Array<{ name: string; args: unknown }> = [];
  const originalRpc = mockSupabase.client.rpc;

  beforeEach(() => {
    mockSupabase.reset();
    rpcCalls.length = 0;
    mockSupabase.client.rpc = async (name: string, args?: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      return originalRpc(name, args);
    };
    setActivePortalContext({
      learningMode: 'self_directed',
      userId: TEST_USER_ID,
    });
  });

  const context = {
    portal_type: 'knowledge_explorer' as const,
    curriculum_scope: 'USER_PRIVATE',
    taxonomy_scope: 'sd-biology',
    mastery_level: 0,
    user_goal: 'understand photosynthesis',
    active_path: ['sd-biology'],
  };

  it('stores 50 embedding-less chunks as USER_PRIVATE rows', async () => {
    const chunks = Array.from({ length: 50 }, (_, i) => ({
      id: `chunk-${i}`,
      content: `Photosynthesis note ${i}: plants convert light into chemical energy.`,
      metadata: { source: 'notes.pdf', chapter_no: 4, page: 10 + i },
    }));

    const result = await storeChunks({
      userId: TEST_USER_ID,
      portalType: 'knowledge_explorer',
      documentId: 'no-embedding-doc',
      title: 'Fifty Notes',
      chunks,
      subjectId: 'sd-biology',
      // A caller demanding a shared scope must be overridden by the import path.
      curriculumScope: 'GLOBAL_OPEN',
    });

    expect(result).toEqual({ stored: 50, failed: 0, total: 50 });
    expect(mockSupabase.db.document_chunks).toHaveLength(50);
    for (const row of mockSupabase.db.document_chunks) {
      expect(row.embedding).toBeUndefined();
      expect(row.curriculum_scope).toBe('USER_PRIVATE');
      expect(row.user_id).toBe(TEST_USER_ID);
    }
  });

  it('retrieves cited chunks through the ranked FTS RPC with no embedding model', async () => {
    const chunks = Array.from({ length: 50 }, (_, i) => ({
      id: `chunk-${i}`,
      content: `Photosynthesis note ${i}: plants convert light into chemical energy.`,
      metadata: { source: 'notes.pdf', chapter_no: 4, page: 10 + i },
    }));
    await storeChunks({
      userId: TEST_USER_ID,
      portalType: 'knowledge_explorer',
      documentId: 'no-embedding-retrieve-doc',
      title: 'Fifty Notes',
      chunks,
      subjectId: 'sd-biology',
    });

    mockSupabase.setRpcResult('search_document_chunks_fts', [
      { content: chunks[0].content, metadata: chunks[0].metadata, rank: 0.09 },
      { content: chunks[1].content, metadata: chunks[1].metadata, rank: 0.08 },
    ]);

    const results = await retrieveRelevantChunks('photosynthesis', context, { maxChunks: 2 });

    expect(rpcCalls.some((call) => call.name === 'search_document_chunks_fts')).toBe(true);
    expect(rpcCalls.some((call) => call.name === 'match_document_chunks')).toBe(false);
    expect(results).toHaveLength(2);
    expect(buildCitation(results[0].metadata)).toBe('[notes.pdf Ch4 p.10]');
    expect(results[0].similarity).toBeGreaterThanOrEqual(0.7);
  });
});
