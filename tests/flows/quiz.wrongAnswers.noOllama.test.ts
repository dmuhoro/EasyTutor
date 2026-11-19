import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, TEST_USER_ID } from '../utils/mockSupabase';
import { useProgressStore } from '../../store/progressStore';
import { PipelineExecutor } from '../../src/intelligence/pipelines/pipelineExecutor';
import { createRuntimeContext } from '../../src/intelligence/runtime/runtimeContext';
import { setActivePortalContext } from '../../src/infrastructure/portalContext';
import type { HybridInferenceRouter } from '../../src/intelligence/routing/hybridInferenceRouter';
import type { LLMRequest, LLMResponse } from '../../src/intelligence/routing/hybridInferenceRouter';
import type { RuntimeContext } from '../../src/intelligence/runtime/runtimeContext';

// Regression guard for CI run 43927712086: `expected 0 to be >= 2`.
// Retrieval is stubbed at the boundary so the test is independent of whether a
// local Ollama embedding model exists. The AI router is injected through the
// PipelineExecutor constructor seam so no real provider call can stall the test
// (the 5 s default timeout must stay in force). The unit under test is the
// pipeline's grounding decision, not the provider.
const retrieval = vi.hoisted(() => ({
  chunks: [] as Array<{ content: string; similarity: number; metadata: Record<string, unknown> }>,
}));

vi.mock('../../lib/retrieval', () => ({
  retrieveRelevantChunks: async () => retrieval.chunks,
}));

const stubRouter = (text: string): HybridInferenceRouter => ({
  decide: () => ({ route: 'local' as const, reason: 'deterministic-test-router' }),
  execute: async (_request: LLMRequest, _context: RuntimeContext): Promise<LLMResponse> => ({
    text,
    route: 'local',
    confidence: 0.9,
    tokenUsage: { prompt: 20, completion: 20 },
  }),
}) as unknown as HybridInferenceRouter;

const groundedAnswer = JSON.stringify({
  question: 'What form does a linear equation take?',
  options: ['y = mx + b', 'x = y + z', 'a/b = c', 'None of the above'],
  correct: 0,
  explanation: 'A linear equation has the slope-intercept form y = mx + b.',
  notCovered: false,
});

describe('quiz generation is deterministic without a local embedding model', () => {
  beforeEach(() => {
    mockSupabase.reset();
    setActivePortalContext({ learningMode: 'high_school', userId: TEST_USER_ID });
    useProgressStore.setState({ userId: TEST_USER_ID, quizScores: [], wrongAnswers: [], xpTotal: 0 });
    retrieval.chunks = [];
  });

  const execute = async (routerText: string) => {
    const context = createRuntimeContext({
      user_id: TEST_USER_ID,
      portal_type: 'high_school',
      subject_id: 'HS-MATH',
      topic_id: 'ALG-001',
      learning_goal: 'master linear equations',
      mastery_state: { score: 60, attempts: 1, weak_points: [] },
      cache_policy: { mode: 'bypass', ttlSeconds: 0 },
    });
    return new PipelineExecutor(stubRouter(routerText)).execute({ kind: 'quiz_question_generation', context });
  };

  it('produces a grounded question with at least two options when a chunk was retrieved', async () => {
    retrieval.chunks = [
      { content: 'Linear equations are equations of the form y = mx + b.', similarity: 0.95, metadata: {} },
    ];
    const result = await execute(groundedAnswer);
    const output = result.output as { options: string[]; notCovered?: boolean };
    expect(output.options.length).toBeGreaterThanOrEqual(2);
    expect(output.notCovered).not.toBe(true);
  });

  it('fails closed with an honest not-covered result when nothing was retrieved', async () => {
    const result = await execute(groundedAnswer);
    const output = result.output as { options: string[]; notCovered?: boolean; question: string };
    expect(output.notCovered).toBe(true);
    expect(output.options).toEqual([]);
    expect(output.question).toContain('not covered');
  });
});
