import { retrieveRelevantChunks } from '../../../lib/retrieval';
import { getDifficultyLevel } from '../../../lib/difficulty';
import { Telemetry } from '../../observability/telemetry';
import { RuntimeContext } from '../runtime/runtimeContext';
import { HybridInferenceRouter } from '../routing/hybridInferenceRouter';
import { GovernedAgentRuntime } from '../../runtime/agentic/governedAgentRuntime';
import { MasteryCoordinator, MasteryPlan } from '../mastery/masteryCoordinator';
import { safeParseQuizArray } from '../../../lib/aiQuiz';
import { withTimeout } from '../../../lib/ai/reliability';

export type PipelineKind =
  | 'lesson_generation'
  | 'quiz_generation'
  | 'quiz_question_generation'
  | 'mastery_remediation'
  | 'spaced_repetition'
  | 'predictive_continuation'
  | 'roadmap_adaptation';

export interface PipelineRequest {
  kind: PipelineKind;
  context: RuntimeContext;
  input?: Record<string, unknown>;
}

export interface PipelineResult<T = unknown> {
  kind: PipelineKind;
  canonical_id: string;
  output: T;
  mastery_plan: MasteryPlan;
  telemetry: {
    latency: number;
    retrieval_depth: number;
    cache_route: string;
  };
}

const buildPrompt = (request: PipelineRequest, retrievedContext: string): string => {
  const { context, kind } = request;
  
  if (kind === 'quiz_generation') {
    return [
      `Portal: ${context.portal_type}`,
      `Subject: ${context.subject_id}`,
      `Topic: ${context.topic_id}`,
      `Goal: ${context.learning_goal}`,
      `Mastery Level: ${context.mastery_state.score}`,
      'Generate exactly 5 multiple-choice questions based on the retrieved context.',
      'Return ONLY a JSON array of objects with keys: "question", "options" (4 strings), "correctIndex" (number 0-3), and "explanation".',
      `Retrieved context:\n${retrievedContext || 'No retrieved context available.'}`,
    ].join('\n\n');
  }

  if (kind === 'quiz_question_generation') {
    // Honesty guard: never generate a quiz question from the model's own
    // knowledge when nothing was retrieved from the learner's notes. Say so
    // instead of guessing (Constitution Article I: fail closed, no silent
    // drops / fabricated answers).
    if (!retrievedContext || retrievedContext.trim().length === 0) {
      return [
        `Portal: ${context.portal_type}`,
        `Subject: ${context.subject_id}`,
        `Topic: ${context.topic_id}`,
        `Goal: ${context.learning_goal}`,
        'The retrieved context is empty: this topic is not covered in the learner\'s ingested notes.',
        'Return ONLY a raw JSON object with keys: "question" (string), "options" (empty array), "correct" (-1), "explanation" (string), and "notCovered" (true).',
        `Retrieved context:\n${retrievedContext || 'No retrieved context available.'}`,
      ].join('\n\n');
    }

    return [
      `Portal: ${context.portal_type}`,
      `Subject: ${context.subject_id}`,
      `Topic: ${context.topic_id}`,
      `Goal: ${context.learning_goal}`,
      `Mastery Level: ${context.mastery_state.score}`,
      'Generate exactly 1 multiple-choice question based on the retrieved context.',
      'If the context does not contain enough information to answer, set "notCovered" to true and explain the gap instead of guessing.',
      'Return ONLY a raw JSON object with keys: "question" (string), "options" (array of 4 strings), "correct" (zero-indexed number 0-3), "explanation" (string), and "notCovered" (boolean). No markdown, no extra text.',
      `Retrieved context:\n${retrievedContext || 'No retrieved context available.'}`,
    ].join('\n\n');
  }

  return [
    `Portal: ${context.portal_type}`,
    `Canonical ID: ${context.canonical_id}`,
    `Subject: ${context.subject_id}`,
    `Topic: ${context.topic_id}`,
    `Goal: ${context.learning_goal}`,
    `Mastery: ${context.mastery_state.score}`,
    `Pipeline: ${kind}`,
    `Retrieved context:\n${retrievedContext || 'No retrieved context available.'}`,
    'Produce concise, curriculum-safe educational output grounded in this context.',
  ].join('\n\n');
};

export class PipelineExecutor {
  constructor(
    private readonly aiRouter = new HybridInferenceRouter(),
    private readonly masteryCoordinator = new MasteryCoordinator(),
    private readonly governedRuntime: GovernedAgentRuntime = new GovernedAgentRuntime(),
  ) {}

  async execute(request: PipelineRequest, signal?: AbortSignal): Promise<PipelineResult> {
    const start = Date.now();
    const chunks = await retrieveRelevantChunks(
      `${request.context.learning_goal} ${request.context.topic_id}`,
      request.context.retrieval_policy,
      { maxChunks: request.context.retrieval_policy.limit },
    );
    const retrievedContext = chunks.map((chunk) => chunk.content).join('\n---\n');
    const prompt = buildPrompt(request, retrievedContext);
    
    const complexity = request.kind === 'quiz_generation' || request.context.mastery_state.score > 70
      ? 'high'
      : request.context.mastery_state.score < 40
        ? 'low'
        : 'normal';
        
    const aiResponse = await withTimeout(
      this.aiRouter.execute({
        prompt,
        complexity,
        cacheKey: `${request.kind}:${request.context.canonical_id}:${request.context.mastery_state.score}`,
      }, request.context),
      30_000,
      'AI inference timed out — please check your connection and try again',
      signal
    );
    
    const masteryPlan = this.masteryCoordinator.evaluate(request.context);
    const latency = Date.now() - start;
    
    let output: any = {
      text: aiResponse.text || this.fallbackOutput(request),
      route: aiResponse.route,
      difficulty: getDifficultyLevel(request.context.mastery_state.score),
      retrieved_chunks: chunks,
    };

    if (request.kind === 'quiz_generation') {
      const questions = safeParseQuizArray(aiResponse.text || '');
      output.questions = questions.length > 0 ? questions : [this.fallbackQuestion(request.context.topic_id)];
    }

    if (request.kind === 'quiz_question_generation') {
      let parsedQuestion: any = null;
      try {
        const text = (aiResponse.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
        const obj = JSON.parse(text);
        if (obj && typeof obj.question === 'string' && Array.isArray(obj.options)) {
          const notCovered = obj.notCovered === true;
          const hasOptions = obj.options.length >= 2;
          if (notCovered || hasOptions) {
            parsedQuestion = {
              question: obj.question,
              options: obj.options,
              correct: typeof obj.correct === 'number' ? obj.correct : (typeof obj.correctIndex === 'number' ? obj.correctIndex : 0),
              explanation: obj.explanation || 'Educational rationale.',
              notCovered,
            };
          }
        }
      } catch {
        // fallback to structured question
      }
      if (!parsedQuestion) {
        parsedQuestion = this.fallbackSingleQuestion(request.context.topic_id);
      }

      // Code-level honesty guard: if nothing was retrieved from the learner's
      // notes, never present a model-generated question as grounded. Force an
      // honest not-covered result instead (Constitution Article I).
      if (chunks.length === 0) {
        parsedQuestion = {
          question: `This topic is not covered in your ingested notes yet.`,
          options: [],
          correct: -1,
          explanation: `No notes matched "${request.context.topic_id}". Add source material on this topic, then quiz again.`,
          notCovered: true,
        };
      }

      output = {
        ...output,
        ...parsedQuestion,
      };
    }

    Telemetry.emit({
      event: 'PIPELINE_EXECUTED',
      source: 'intelligence',
      canonicalId: request.context.canonical_id,
      userId: request.context.user_id,
      portalType: request.context.portal_type,
      latency,
      operationType: request.kind,
      payload: {
        retrieval_depth: chunks.length,
        ai_route: aiResponse.route,
        cache_efficiency: aiResponse.route === 'cache' ? 1 : 0,
      },
    });

    return {
      kind: request.kind,
      canonical_id: request.context.canonical_id,
      output,
      mastery_plan: masteryPlan,
      telemetry: {
        latency,
        retrieval_depth: chunks.length,
        cache_route: aiResponse.route,
      },
    };
  }

  private fallbackOutput(request: PipelineRequest): string {
    return `Offline ${request.kind.replace(/_/g, ' ')} prepared for ${request.context.topic_id}.`;
  }

  private fallbackQuestion(topic: string) {
    return {
      question: `What is a primary concept related to ${topic}?`,
      options: ['Core principles', 'Unrelated fringe theories', 'Historical footnotes', 'Non-standard interpretations'],
      correctIndex: 0,
      explanation: 'This is a foundational concept.'
    };
  }

  private fallbackSingleQuestion(topic: string) {
    return {
      question: `Practice check: Which statement best describes "${topic}"?`,
      options: [
        'It is a fundamental concept in this topic.',
        'It is unrelated to this topic.',
        'It is only used in highly specialized situations.',
        'It is not part of the standard syllabus.',
      ],
      correct: 0,
      explanation: `Foundational check for "${topic}". The first option represents the standard definition.`,
    };
  }
}
