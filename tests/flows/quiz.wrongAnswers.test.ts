import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, TEST_USER_ID } from '../utils/mockSupabase';
import { useProgressStore, WrongAnswerRecord } from '../../store/progressStore';
import { buildSystemPrompt } from '../../services/systemPrompts';
import { PipelineExecutor } from '../../src/intelligence/pipelines/pipelineExecutor';
import { createRuntimeContext } from '../../src/intelligence/runtime/runtimeContext';
import { setActivePortalContext } from '../../src/infrastructure/portalContext';
import { warmLearningPort } from '../utils/warmLearningPort';

// The premise of the quiz-generation test is "a note was ingested and is retrievable".
// Stub the retrieval boundary itself so that premise holds on every machine. Stubbing
// only the vector RPC made the result depend on whether localhost Ollama happened to be
// reachable: with no Ollama, retrieval fell back to an empty FTS table and the honesty
// guard returned zero options (CI `expected 0 >= 2`).
vi.mock('../../lib/retrieval', () => ({
  retrieveRelevantChunks: async () => [
    {
      content: 'Linear equations are equations of the form y = mx + b.',
      similarity: 0.95,
      metadata: {},
    },
  ],
}));

describe('Teach & Quiz Flow with Socratic Prompt & Wrong Answers Tracking', () => {
  warmLearningPort();

  beforeEach(() => {
    mockSupabase.reset();
    setActivePortalContext({
      learningMode: 'high_school',
      userId: TEST_USER_ID,
    });
    useProgressStore.setState({
      userId: TEST_USER_ID,
      quizScores: [],
      wrongAnswers: [],
      xpTotal: 0,
    });
  });

  describe('Socratic Prompt Engine', () => {
    it('injects Socratic dialogue directives when isSocratic is true', () => {
      const prompt = buildSystemPrompt({
        mode: 'high_school',
        topic: 'Newton Laws',
        subject: 'Physics',
        isSocratic: true,
      });

      expect(prompt).toContain('SOCRATIC TEACHING METHOD');
      expect(prompt).toContain('Intuitive Hook');
      expect(prompt).toContain('Probing Question');
    });

    it('omits Socratic directives when isSocratic is false', () => {
      const prompt = buildSystemPrompt({
        mode: 'high_school',
        topic: 'Newton Laws',
        subject: 'Physics',
        isSocratic: false,
      });

      expect(prompt).not.toContain('SOCRATIC TEACHING METHOD');
    });
  });

  describe('Wrong Answers Store & Remediation Tracking', () => {
    it('records wrong answer records and stores them in local state', () => {
      const store = useProgressStore.getState();

      const record1: WrongAnswerRecord = {
        id: 'wrong_1',
        question: 'What is Newton First Law?',
        selectedAnswer: 'F = ma',
        correctAnswer: 'An object remains at rest unless acted upon by a force',
        explanation: 'F = ma is the Second Law, while the First Law is the law of inertia.',
        topic: 'Newton Laws',
        subjectId: 'hs-physics',
        timestamp: new Date().toISOString(),
      };

      store.recordWrongAnswer(record1);

      expect(useProgressStore.getState().wrongAnswers).toHaveLength(1);
      expect(useProgressStore.getState().wrongAnswers[0]).toEqual(record1);

      // Record a second wrong answer for a different topic
      const record2: WrongAnswerRecord = {
        id: 'wrong_2',
        question: 'What is the unit of Force?',
        selectedAnswer: 'Joule',
        correctAnswer: 'Newton',
        explanation: 'Joule is the unit of Work/Energy; Newton (N) is the SI unit of Force.',
        topic: 'Force and Momentum',
        subjectId: 'hs-physics',
        timestamp: new Date().toISOString(),
      };

      store.recordWrongAnswer(record2);
      expect(useProgressStore.getState().wrongAnswers).toHaveLength(2);

      // Clear for 'Newton Laws' only
      store.clearWrongAnswersForTopic('Newton Laws');
      const remaining = useProgressStore.getState().wrongAnswers;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].topic).toBe('Force and Momentum');
    });

    it('feeds weak points into quiz scoring and records quiz_session', async () => {
      const store = useProgressStore.getState();

      const weakPoints = [
        'Newton Laws: What is Newton First Law?',
        'Newton Laws: Differentiating mass and weight',
      ];

      await store.addQuizScore(
        3,
        5,
        'Linear Equations',
        'hs-math',
        '22222222-2222-4222-8222-222222222222',
        weakPoints,
      );

      // Verify quiz session recorded in database
      expect(mockSupabase.db.quiz_sessions).toContainEqual(
        expect.objectContaining({
          user_id: TEST_USER_ID,
          subject_id: 'hs-math',
          topic_id: '22222222-2222-4222-8222-222222222222',
          score: 3,
          total: 5,
        }),
      );

      // Verify local store state updated
      const scores = useProgressStore.getState().quizScores;
      expect(scores).toHaveLength(1);
      expect(scores[0].score).toBe(3);
      expect(scores[0].total).toBe(5);
    });
  });

  describe('PipelineExecutor Quiz Question Generation', () => {
    it('generates structured single question with question, options, correct, and explanation', async () => {
      // Retrieval is stubbed at the module boundary above; bypass the shared
      // in-memory AI cache so a prior test in the same worker cannot supply a
      // cached response with a different grounding outcome.
      const executor = new PipelineExecutor();
      const context = createRuntimeContext({
        user_id: TEST_USER_ID,
        portal_type: 'high_school',
        subject_id: 'HS-MATH',
        topic_id: 'ALG-001',
        learning_goal: 'master linear equations',
        mastery_state: { score: 60, attempts: 1, weak_points: [] },
        cache_policy: { mode: 'bypass', ttlSeconds: 0 },
      });

      const result = await executor.execute({
        kind: 'quiz_question_generation',
        context,
      });

      expect(result.kind).toBe('quiz_question_generation');
      const output = result.output as any;
      expect(output).toBeDefined();
      expect(typeof output.question).toBe('string');
      expect(Array.isArray(output.options)).toBe(true);
      expect(output.options.length).toBeGreaterThanOrEqual(2);
      expect(typeof output.correct).toBe('number');
      expect(typeof output.explanation).toBe('string');
    });
  });
});
