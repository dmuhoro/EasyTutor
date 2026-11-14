import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, TEST_USER_ID } from '../utils/mockSupabase';
import { storeChunks } from '../../lib/knowledge';
import { setActivePortalContext } from '../../src/infrastructure/portalContext';

// Force a deterministic embedding so tests are fast and offline-safe.
vi.mock('../../lib/embeddings', () => ({
  generateEmbedding: vi.fn(async () => new Array(384).fill(0.1)),
}));

// Force the AI router to return a canned grounded question so the pipeline
// test does not depend on a live LLM provider.
vi.mock('../../src/intelligence/routing/hybridInferenceRouter', () => ({
  HybridInferenceRouter: (class HybridInferenceRouter {
    execute = vi.fn(async () => ({
      text: JSON.stringify({
        question: 'What is the four-stroke cycle?',
        options: ['Intake, compression, power, exhaust', 'Fuel, air, spark, exhaust', 'Oil, water, fuel, air', 'Start, run, stop, idle'],
        correct: 0,
        explanation: 'The four-stroke cycle is intake, compression, power, exhaust.',
        notCovered: false,
      }),
      route: 'local',
    }));
  }),
}));

import { PipelineExecutor } from '../../src/intelligence/pipelines/pipelineExecutor';
import { createRuntimeContext } from '../../src/intelligence/runtime/runtimeContext';

const AUTOMOTIVE_NOTES = `
Four-stroke engine cycle.
1. Intake stroke: the piston moves down, drawing an air-fuel mixture into the cylinder through the open intake valve.
2. Compression stroke: both valves close and the piston moves up, compressing the mixture.
3. Power stroke: the spark plug ignites the compressed mixture, forcing the piston down.
4. Exhaust stroke: the exhaust valve opens and the piston moves up, pushing out burned gases.
`;

describe('Automotive Science Principles ingestion + quiz loop', () => {
  beforeEach(() => {
    mockSupabase.reset();
    setActivePortalContext({
      learningMode: 'self_directed',
      userId: TEST_USER_ID,
    });
  });

  it('stores automotive chunks with retrievable scope columns', async () => {
    const result = await storeChunks({
      userId: TEST_USER_ID,
      portalType: 'knowledge_explorer',
      documentId: 'auto-doc-1',
      title: 'Automotive Science Principles',
      chunks: [AUTOMOTIVE_NOTES],
      subjectId: 'sd-automotive',
      curriculumScope: 'GLOBAL_OPEN',
    });

    expect(result.stored).toBe(1);
    expect(result.failed).toBe(0);

    const row = mockSupabase.db.document_chunks[0];
    expect(row).toBeDefined();
    expect(row.content).toContain('Four-stroke engine cycle');
    expect(row.taxonomy_scope).toBe('sd-automotive');
    expect(row.curriculum_scope).toBe('GLOBAL_OPEN');
    expect(row.portal_type).toBe('knowledge_explorer');
    expect(row.user_id).toBe(TEST_USER_ID);
    expect(row.vector_namespace).toBe('portal:knowledge_explorer');
  });

  it('quiz is grounded in ingested notes when context is retrieved', async () => {
    // Pretend the automotive notes were ingested and are retrievable.
    mockSupabase.setRpcResult('match_document_chunks', [
      { content: 'Four-stroke engine cycle: intake, compression, power, exhaust.', similarity: 0.95, metadata: {} },
    ]);

    const executor = new PipelineExecutor();
    const context = createRuntimeContext({
      user_id: TEST_USER_ID,
      portal_type: 'knowledge_explorer',
      subject_id: 'sd-automotive',
      topic_id: 'four-stroke-cycle',
      learning_goal: 'Explain the four-stroke engine cycle',
      mastery_state: { score: 0, attempts: 0, weak_points: [] },
    });

    const result = await executor.execute({
      kind: 'quiz_question_generation',
      context,
    });

    const output = result.output as any;
    expect(output.notCovered).toBe(false);
    expect(output.question).toContain('four-stroke');
    expect(Array.isArray(output.options)).toBe(true);
    expect(output.options.length).toBe(4);
  });

  it('quiz reports not-covered instead of guessing when notes are absent', async () => {
    // No RPC result → empty retrieval → honesty guard triggers.
    mockSupabase.setRpcResult('match_document_chunks', []);

    const executor = new PipelineExecutor();
    const context = createRuntimeContext({
      user_id: TEST_USER_ID,
      portal_type: 'knowledge_explorer',
      subject_id: 'sd-automotive',
      topic_id: 'diesel-injection-timing',
      learning_goal: 'Explain diesel injection timing',
      mastery_state: { score: 0, attempts: 0, weak_points: [] },
    });

    const result = await executor.execute({
      kind: 'quiz_question_generation',
      context,
    });

    const output = result.output as any;
    expect(output.notCovered).toBe(true);
    expect(output.correct).toBe(-1);
    expect(output.explanation).toContain('No notes matched');
  });
});
